// Publicación diaria en Instagram (@owneria.mx). Corre en GitHub Actions.
// 1. Lee los artículos del blog en owneria.mx/api/public/articulos.
// 2. Elige el más nuevo sin publicar y el más viejo sin publicar (así se ponen al día los anteriores).
// 3. Dibuja reel, carrusel o dato según toque, lo sube al repo (Instagram lo baja de GitHub Pages).
// 4. Lo publica con la API de Instagram (Meta Graph API) y anota el slug en publicados.json.
// PRUEBA=1 solo dibuja, no sube ni publica.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { laminas, textoPost, type Articulo } from "./contenido";
import { dibujarCarrusel, TEMAS } from "./render";
import { dibujarReel } from "./reel";

type Formato = "reel" | "carrusel" | "dato";
// Reel, carrusel con datos y mapa, imagen de dato; si el artículo no trae dato, va carrusel.
const FORMATOS: Formato[] = ["reel", "carrusel", "dato", "reel", "carrusel"];

const RAIZ = join(import.meta.dir, "..");
const env = (k: string, def?: string) => {
  const v = process.env[k] || def;
  if (v === undefined) throw new Error(`Falta la variable ${k}`);
  return v;
};
const PRUEBA = process.env["PRUEBA"] === "1";
const SITIO = env("SITIO", "https://owneria.mx");
// GitHub Pages sirve imágenes y video con el tipo correcto (raw.githubusercontent no lo hace con MP4).
const RAW = env("RAW_BASE", "https://leonwlondon.github.io/owneria-instagram");
const MAX = Number(env("MAX_POR_DIA", "2"));
const API = env("IG_API", "https://graph.facebook.com/v23.0");

type Registro = Record<string, { media: string; formato?: string; fecha: string }>;
const ARCH = join(RAIZ, "publicados.json");
const publicados: Registro = existsSync(ARCH) ? JSON.parse(readFileSync(ARCH, "utf8")) : {};

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

function git(...args: string[]) {
  const r = Bun.spawnSync(["git", ...args], { cwd: RAIZ, stdout: "inherit", stderr: "inherit" });
  if (r.exitCode !== 0) throw new Error(`git ${args.join(" ")} falló`);
}

async function ig(ruta: string, datos?: Record<string, string>) {
  const token = env("IG_TOKEN");
  const r = datos
    ? await fetch(`${API}/${ruta}`, { method: "POST", body: new URLSearchParams({ ...datos, access_token: token }) })
    : await fetch(`${API}/${ruta}${ruta.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(token)}`);
  const j = (await r.json()) as Record<string, unknown>;
  if (!r.ok || j["error"]) throw new Error(`Instagram ${ruta}: ${JSON.stringify(j["error"] ?? j)}`);
  return j;
}

/** Espera a que GitHub sirva la imagen recién subida. */
async function disponible(url: string) {
  for (let i = 0; i < 60; i++) {
    const r = await fetch(url, { method: "HEAD" });
    if (r.ok) return;
    await espera(4000);
  }
  throw new Error(`La imagen no quedó disponible: ${url}`);
}

/** Espera a que el contenedor de Instagram termine de procesar (los videos tardan más). */
async function listo(id: string, intentos: number) {
  for (let i = 0; i < intentos; i++) {
    const s = await ig(`${id}?fields=status_code`);
    if (s["status_code"] === "FINISHED") return;
    if (s["status_code"] === "ERROR" || s["status_code"] === "EXPIRED") throw new Error(`Contenedor ${id}: ${s["status_code"]}`);
    await espera(5000);
  }
  throw new Error(`Contenedor ${id} no terminó de procesarse`);
}

async function publicar(formato: Formato, a: Articulo, archivos: string[], texto: string) {
  const usuario = env("IG_USER_ID");
  const urls = archivos.map((f) => `${RAW}/img/${a.slug}/${f}`);
  for (const u of urls) await disponible(u);

  let id: string;
  if (formato === "reel") {
    const j = await ig(`${usuario}/media`, { media_type: "REELS", video_url: urls[0]!, cover_url: urls[1]!, caption: texto, share_to_feed: "true" });
    id = String(j["id"]);
    await listo(id, 60);
  } else if (urls.length === 1) {
    const j = await ig(`${usuario}/media`, { image_url: urls[0]!, caption: texto });
    id = String(j["id"]);
    await listo(id, 30);
  } else {
    const hijos: string[] = [];
    for (const u of urls) hijos.push(String((await ig(`${usuario}/media`, { image_url: u, is_carousel_item: "true" }))["id"]));
    id = String((await ig(`${usuario}/media`, { media_type: "CAROUSEL", children: hijos.join(","), caption: texto }))["id"]);
    await listo(id, 30);
  }
  const pub = await ig(`${usuario}/media_publish`, { creation_id: id });
  return String(pub["id"]);
}

const r = await fetch(`${SITIO}/api/public/articulos`);
if (!r.ok) throw new Error(`No se pudieron leer los artículos: ${r.status}`);
const articulos = ((await r.json()) as Articulo[])
  .filter((a) => new Date(a.publicado) <= new Date())
  .sort((x, y) => y.publicado.localeCompare(x.publicado));

const pendientes = articulos.filter((a) => !publicados[a.slug]);
const elegidos = [...new Set([pendientes[0], pendientes[pendientes.length - 1]])].filter(Boolean).slice(0, MAX) as Articulo[];
console.log(`${pendientes.length} artículos sin publicar; hoy van: ${elegidos.map((a) => a.slug).join(", ") || "ninguno"}`);

for (const [j, a] of elegidos.entries()) {
  const ls = laminas(a);
  // Tema y formato rotan según cuántos posts van publicados: la cuadrícula alterna colores y formatos.
  const n = Object.keys(publicados).length + (PRUEBA ? j : 0);
  const tema = TEMAS[n % TEMAS.length]!;
  let formato = FORMATOS[n % FORMATOS.length]!;
  const d = ls.find((l) => l.tipo === "dato");
  if (formato === "dato" && !d) formato = "carrusel";

  const dir = join(RAIZ, "img", a.slug);
  mkdirSync(dir, { recursive: true });
  const archivos: string[] = [];
  if (formato === "reel") {
    await dibujarReel(ls, tema, join(dir, "reel.mp4"), join(dir, "portada.jpg"));
    archivos.push("reel.mp4", "portada.jpg");
  } else {
    // «dato»: una sola imagen con el número real del artículo.
    const cuales = formato === "dato" ? [d!] : ls;
    for (const [i, b] of (await dibujarCarrusel(a.slug, cuales, tema)).entries()) {
      const f = `${String(i + 1).padStart(2, "0")}.jpg`;
      writeFileSync(join(dir, f), b);
      archivos.push(f);
    }
  }
  const texto = textoPost(a, ls);
  writeFileSync(join(dir, "texto.txt"), texto);
  if (PRUEBA) {
    console.log(`PRUEBA: ${a.slug} como ${formato} (${tema}), ${archivos.length} archivos, sin publicar`);
    continue;
  }
  git("add", `img/${a.slug}`);
  git("commit", "-q", "-m", `Imágenes: ${a.slug}`);
  git("push", "-q");

  const media = await publicar(formato, a, archivos, texto);
  publicados[a.slug] = { media, formato, fecha: new Date().toISOString() };
  writeFileSync(ARCH, `${JSON.stringify(publicados, null, 2)}\n`);
  git("add", "publicados.json");
  git("commit", "-q", "-m", `Publicado en Instagram: ${a.slug}`);
  git("push", "-q");
  console.log(`Publicado ${a.slug} (${formato}) → ${media}`);
}
