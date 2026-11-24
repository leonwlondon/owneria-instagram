// Publicación diaria en Instagram (@owneria.mx). Corre en GitHub Actions.
// 1. Lee los artículos del blog en owneria.mx/api/public/articulos.
// 2. Mañana: el artículo nuevo (o uno anterior). Tarde: una pieza propia de src/banco.ts.
// 3. Dibuja reel, carrusel o dato según toque, lo sube al repo (Instagram lo baja de GitHub Pages).
// 4. Lo publica con la API de Instagram (Meta Graph API) y anota el slug en publicados.json.
// PRUEBA=1 solo dibuja, no sube ni publica.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { laminas, textoPost, type Articulo, type Lamina } from "./contenido";
import { BANCO, laminasPieza, textoPieza, type Pieza } from "./banco";
import { dibujarCarrusel, TEMAS, type Tema } from "./render";
import { dibujarReel, dibujarReelPregunta } from "./reel";

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
// Turno de la mañana: artículo del blog. Turno de la tarde: pieza propia (casos, glosario, ideas, preguntas…).
const TURNO = env("TURNO", "manana") === "tarde" ? "tarde" : "manana";
const API = env("IG_API", "https://graph.facebook.com/v23.0");

type Registro = Record<string, { media: string; formato?: string; banco?: boolean; fecha: string }>;
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

async function publicar(formato: Formato, carpeta: string, archivos: string[], texto: string) {
  const usuario = env("IG_USER_ID");
  const urls = archivos.map((f) => `${RAW}/img/${carpeta}/${f}`);
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

type Trabajo = { clave: string; carpeta: string; formato: Formato; texto: string; dibuja: (dir: string, tema: Tema) => Promise<string[]> };

/** Guarda las láminas como 01.jpg, 02.jpg… */
async function guardarLaminas(dir: string, semilla: string, ls: Lamina[], tema: Tema) {
  const archivos: string[] = [];
  for (const [i, b] of (await dibujarCarrusel(semilla, ls, tema)).entries()) {
    const f = `${String(i + 1).padStart(2, "0")}.jpg`;
    writeFileSync(join(dir, f), b);
    archivos.push(f);
  }
  return archivos;
}

function trabajoBlog(a: Articulo): Trabajo {
  const ls = laminas(a);
  const nBlog = Object.values(publicados).filter((x) => !x.banco).length;
  let formato = FORMATOS[nBlog % FORMATOS.length]!;
  const d = ls.find((l) => l.tipo === "dato");
  if (formato === "dato" && !d) formato = "carrusel";
  return {
    clave: a.slug,
    carpeta: a.slug,
    formato,
    texto: textoPost(a, ls),
    dibuja: async (dir, tema) => {
      if (formato === "reel") {
        await dibujarReel(ls, tema, join(dir, "reel.mp4"), join(dir, "portada.jpg"));
        return ["reel.mp4", "portada.jpg"];
      }
      // «dato»: una sola imagen con el número real del artículo.
      return guardarLaminas(dir, a.slug, formato === "dato" ? [d!] : ls, tema);
    },
  };
}

function trabajoBanco(p: Pieza): Trabajo {
  return {
    clave: `banco:${p.id}`,
    carpeta: `banco-${p.id}`,
    formato: p.serie === "pregunta" ? "reel" : p.serie === "caso" ? "carrusel" : "dato",
    texto: textoPieza(p),
    dibuja: async (dir, tema) => {
      if (p.serie === "pregunta") {
        await dibujarReelPregunta(p, tema, join(dir, "reel.mp4"), join(dir, "portada.jpg"));
        return ["reel.mp4", "portada.jpg"];
      }
      return guardarLaminas(dir, p.id, laminasPieza(p), tema);
    },
  };
}

const pendientes = articulos.filter((a) => !publicados[a.slug]);
const reciente = pendientes.find((a) => Date.now() - new Date(a.publicado).getTime() < 3 * 864e5);
// Mañana: el artículo nuevo; si no hay, uno de los anteriores (del más viejo al más nuevo).
const delBlog = reciente ?? pendientes[pendientes.length - 1];
const delBanco = BANCO.find((p) => !publicados[`banco:${p.id}`]);
let trabajo: Trabajo | undefined;
if (TURNO === "manana") trabajo = delBlog ? trabajoBlog(delBlog) : delBanco && trabajoBanco(delBanco);
else trabajo = delBanco ? trabajoBanco(delBanco) : delBlog && trabajoBlog(delBlog);
console.log(`Turno ${TURNO}: ${pendientes.length} artículos y ${BANCO.filter((p) => !publicados[`banco:${p.id}`]).length} piezas propias sin publicar; va ${trabajo?.clave ?? "nada"}`);
if (!delBanco) console.log("AVISO: se acabó el banco de piezas propias; hay que escribir más en src/banco.ts");

if (trabajo) {
  // El tema rota con cada post publicado: la cuadrícula alterna colores.
  const tema = TEMAS[Object.keys(publicados).length % TEMAS.length]!;
  const dir = join(RAIZ, "img", trabajo.carpeta);
  mkdirSync(dir, { recursive: true });
  const archivos = await trabajo.dibuja(dir, tema);
  writeFileSync(join(dir, "texto.txt"), trabajo.texto);
  if (PRUEBA) {
    console.log(`PRUEBA: ${trabajo.clave} como ${trabajo.formato} (${tema}), ${archivos.length} archivos, sin publicar`);
  } else {
    git("add", `img/${trabajo.carpeta}`);
    git("commit", "-q", "-m", `Imágenes: ${trabajo.clave}`);
    git("push", "-q");
    const media = await publicar(trabajo.formato, trabajo.carpeta, archivos, trabajo.texto);
    publicados[trabajo.clave] = { media, formato: trabajo.formato, banco: trabajo.clave.startsWith("banco:"), fecha: new Date().toISOString() };
    writeFileSync(ARCH, `${JSON.stringify(publicados, null, 2)}\n`);
    git("add", "publicados.json");
    git("commit", "-q", "-m", `Publicado en Instagram: ${trabajo.clave}`);
    git("push", "-q");
    console.log(`Publicado ${trabajo.clave} (${trabajo.formato}) → ${media}`);
  }
}
