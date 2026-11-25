// Serie de arranque (24-nov-2026): 15 posts para llenar el perfil, fuera del flujo diario.
// Mezcla blog, lo que hago (casos y sistemas), quién soy y lo que puedo hacer; carruseles, imágenes y reels.
// bun src/arranque.ts           → dibuja en img/arranque/ y arma muestras/arranque-perfil.jpg
// bun src/arranque.ts publicar  → publica en orden (1 → 15), uno por minuto; anota en arranque-publicado.json
// Las piezas del blog y del banco se anotan también en publicados.json para que el flujo diario no las repita.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { laminas, textoPost, type Articulo, type Lamina } from "./contenido";
import { BANCO, laminasPieza, textoPieza, type Pieza } from "./banco";
import { dibujarCarrusel, TEMAS, type Tema } from "./render";
import { dibujarReel, dibujarReelPregunta } from "./reel";

const RAIZ = join(import.meta.dir, "..");
const DIR = join(RAIZ, "img", "arranque");
const RAW = process.env["RAW_BASE"] || "https://leonwlondon.github.io/owneria-instagram";
const API = process.env["IG_API"] || "https://graph.facebook.com/v23.0";
const TAGS = "#dueñosdenegocio #automatizacion #inteligenciaartificial #pymesmexico #owneria";

type Formato = "reel" | "carrusel" | "imagen";
type Post = { clave: string; formato: Formato; registro?: string; banco?: boolean; texto: string; dibuja: (dir: string, tema: Tema) => Promise<string[]> };

const art = await (await fetch("https://owneria.mx/api/public/articulos")).json() as Articulo[];
const articulo = (slug: string) => {
  const a = art.find((x) => x.slug === slug);
  if (!a) throw new Error(`No existe el artículo ${slug}`);
  return a;
};
const pieza = (id: string) => {
  const p = BANCO.find((x) => x.id === id);
  if (!p) throw new Error(`No existe la pieza ${id}`);
  return p;
};

async function guardar(dir: string, semilla: string, ls: Lamina[], tema: Tema) {
  const out: string[] = [];
  for (const [i, b] of (await dibujarCarrusel(semilla, ls, tema)).entries()) {
    const f = `${String(i + 1).padStart(2, "0")}.jpg`;
    writeFileSync(join(dir, f), b);
    out.push(f);
  }
  return out;
}

async function reel(dir: string, ls: Lamina[], tema: Tema, pie?: string) {
  await dibujarReel(ls, tema, join(dir, "reel.mp4"), join(dir, "portada.jpg"), pie);
  return ["reel.mp4", "portada.jpg"];
}

function blog(slug: string, formato: Formato): Post {
  const a = articulo(slug);
  const ls = laminas(a);
  return {
    clave: slug,
    formato,
    registro: slug,
    texto: textoPost(a, ls),
    dibuja: (dir, tema) =>
      formato === "reel" ? reel(dir, ls, tema) : guardar(dir, slug, formato === "imagen" ? [ls.find((l) => l.tipo === "dato")!] : ls, tema),
  };
}

function banco(id: string): Post {
  const p: Pieza = pieza(id);
  const formato: Formato = p.serie === "pregunta" ? "reel" : p.serie === "caso" ? "carrusel" : "imagen";
  return {
    clave: id,
    formato,
    registro: `banco:${id}`,
    banco: true,
    texto: textoPieza(p),
    dibuja: async (dir, tema) => {
      if (p.serie === "pregunta") {
        await dibujarReelPregunta(p, tema, join(dir, "reel.mp4"), join(dir, "portada.jpg"));
        return ["reel.mp4", "portada.jpg"];
      }
      return guardar(dir, id, laminasPieza(p), tema);
    },
  };
}

function propio(clave: string, formato: Formato, ls: Lamina[], texto: string): Post {
  return {
    clave,
    formato,
    texto: `${texto}\n\n${TAGS}`,
    dibuja: (dir, tema) => (formato === "reel" ? reel(dir, ls, tema, "owneria.mx") : guardar(dir, clave, ls, tema)),
  };
}

const SKILLS = ["Dirección", "Finanzas", "Fiscal", "Procesos", "Software", "IA", "Apps", "Hardware"];

// Orden de publicación: el 1 sale primero (queda más abajo en la cuadrícula).
export const POSTS: Post[] = [
  blog("automatizar-tu-negocio-por-donde-empezar", "carrusel"),
  propio(
    "yo-dueno",
    "reel",
    [
      { tipo: "portada", categoria: "Quién soy", titulo: "Dueño antes que consultor." },
      { tipo: "punto", n: 1, titulo: "Más de 20 años", texto: "diseñando sistemas y haciendo estrategia de negocios." },
      { tipo: "punto", n: 2, titulo: "Dirijo mis propios negocios", texto: "Fui el cable entre el banco, el SAT, las sucursales y el WhatsApp." },
      { tipo: "punto", n: 3, titulo: "Me cansé de operar", texto: "y empecé a conectarlo todo." },
      { tipo: "diagrama", titulo: "Lo que junto", nodos: SKILLS.slice(0, 6) },
    ],
    "Dueño antes que consultor.\n\nLlevo más de 20 años diseñando sistemas y haciendo estrategia de negocios. Dirijo mis propios negocios y viví lo mismo que tú: ser el cable que une el banco, el SAT, las sucursales y el WhatsApp.\n\nMe cansé de operar y empecé a conectarlo todo. De ahí nace Owneria.",
  ),
  banco("caso-sucursales-maquinas"),
  banco("idea-08"),
  blog("ia-para-preguntarle-a-tu-negocio", "reel"),
  propio(
    "yo-quien-soy",
    "carrusel",
    [
      { tipo: "foto", etiqueta: "Quién soy", titulo: "Soy León. Dueño antes que consultor.", texto: "Más de 20 años diseñando sistemas y haciendo estrategia de negocios." },
      { tipo: "seccion", etiqueta: "LO QUE VIVÍ", titulo: "Yo también fui el cable.", texto: "Dirijo mis propios negocios. Fui quien unía el banco, el SAT, las sucursales y el WhatsApp. Me cansé de operar y empecé a conectarlo todo." },
      { tipo: "seccion", etiqueta: "LO QUE JUNTO", titulo: "El criterio de un dueño y la capacidad de construir.", lista: SKILLS, chips: true },
      { tipo: "seccion", etiqueta: "POR ESO", titulo: "Entiendo tus números, tus impuestos y tu operación.", texto: "Y además sé hacer el sistema, la app o el aparato que los conecta." },
      { tipo: "frase", texto: "No te vendo software. Te devuelvo tu negocio.", firma: "León · Owneria" },
    ],
    "Quién está detrás de Owneria.\n\nSoy León. Dirijo mis propios negocios y llevo más de 20 años diseñando sistemas. Junto dos cosas que casi nunca van juntas: el criterio de un dueño y la capacidad de construir.\n\nEntiendo tus números, tus impuestos y tu operación, y además sé hacer el sistema, la app o el aparato que los conecta.",
  ),
  blog("maquinas-conectadas-iot-negocios-de-servicio", "imagen"),
  banco("pregunta-margen"),
  propio(
    "puedo-seis",
    "carrusel",
    [
      { tipo: "portada", categoria: "Lo que puedo hacer", titulo: "Seis cosas que puedo hacer por tu negocio." },
      { tipo: "punto", n: 1, titulo: "Ver tu negocio como dueño", texto: "Un diagnóstico de dónde se te van el tiempo y el dinero, y qué conviene conectar primero." },
      { tipo: "punto", n: 2, titulo: "Conectar lo que ya tienes", texto: "SAP y cualquier ERP, bancos, SAT, marketplaces, sucursales: todo lo que tenga API o MCP." },
      { tipo: "punto", n: 3, titulo: "Crear lo que no existe", texto: "Sistemas a la medida, apps para iPhone y Android, pantallas y hasta el firmware de tus máquinas." },
      { tipo: "punto", n: 4, titulo: "Poner la IA a trabajar", texto: "Agentes que analizan, redactan, cobran y responden con los datos reales de tu empresa." },
      { tipo: "punto", n: 5, titulo: "Cuidar tus números", texto: "Conciliaciones, cierres de mes y cumplimiento fiscal vigilado contra el SAT." },
      { tipo: "punto", n: 6, titulo: "Quedarme contigo", texto: "Acompañamiento, seguridad y mejoras continuas." },
      { tipo: "cierre", idea: "El sistema es tuyo, no rentado." },
    ],
    "Seis cosas que puedo hacer por tu negocio.\n\n1. Verlo como dueño: dónde se te van el tiempo y el dinero.\n2. Conectar lo que ya tienes: ERP, bancos, SAT, marketplaces, sucursales.\n3. Crear lo que no existe: sistemas, apps, pantallas, firmware.\n4. Poner la IA a trabajar con tus datos reales.\n5. Cuidar tus números: conciliaciones, cierres y SAT.\n6. Quedarme contigo: el sistema es tuyo, no rentado.",
  ),
  banco("hecho-14"),
  propio(
    "puedo-control",
    "reel",
    [
      { tipo: "portada", categoria: "Lo que puedo hacer", titulo: "Más control. Menos operación." },
      { tipo: "punto", n: 1, titulo: "Tableros en tiempo real", texto: "Todo tu negocio en el celular, actualizado al minuto." },
      { tipo: "punto", n: 2, titulo: "Alertas automáticas", texto: "Te avisa solo cuando algo se sale de lo normal." },
      { tipo: "punto", n: 3, titulo: "Conciliación y cierres", texto: "El banco cuadra solo y el cierre de mes sale sin desvelos." },
      { tipo: "diagrama", titulo: "Lo que se conecta", nodos: ["Banco", "SAT", "ERP", "Tienda en línea", "Sucursales", "WhatsApp"] },
    ],
    "Más control. Menos operación.\n\nTableros que se actualizan solos, alertas que solo suenan cuando algo se sale de lo normal y un cierre de mes que ya no te quita el sueño.\n\nNo es otro sistema: es que los que ya tienes hablen entre sí.",
  ),
  blog("lista-69-b-sat-revisar-proveedores", "carrusel"),
  propio(
    "yo-hola",
    "imagen",
    [
      {
        tipo: "foto",
        etiqueta: "Hola, soy León",
        titulo: "Hago que tu negocio te responda.",
        texto: "Conecto banco, SAT, ERP, tienda y máquinas para que veas todo sin tener que operarlo todo.",
      },
    ],
    "Hola, soy León.\n\nAyudo a dueños de negocio a recuperar el mando: conecto lo que ya tienen (banco, SAT, ERP, tienda, sucursales, máquinas) para que vean todo sin tener que operarlo todo.\n\nAquí comparto lo que construyo, lo que aprendo y cómo pensarlo como dueño.",
  ),
  blog("conectar-erp-tienda-en-linea-crm", "reel"),
  banco("caso-fiscal"),
];

const num = (k: number) => String(k + 1).padStart(2, "0");
const carpeta = (k: number) => `${num(k)}-${POSTS[k]!.clave}`;

async function dibujar() {
  const arg = process.argv[2];
  const solo = arg === "hoja" ? -1 : arg ? Number(arg) : 0;
  for (const [k, p] of POSTS.entries()) {
    if (solo && k + 1 !== solo) continue;
    const dir = join(DIR, carpeta(k));
    mkdirSync(dir, { recursive: true });
    const tema = TEMAS[k % TEMAS.length]!;
    const fs = await p.dibuja(dir, tema);
    writeFileSync(join(dir, "texto.txt"), p.texto);
    writeFileSync(join(dir, "archivos.json"), JSON.stringify(fs));
    console.log(`${carpeta(k)}: ${p.formato} (${tema}), ${fs.length} archivos`);
  }
  // Cuadrícula como la verá el perfil: lo último publicado arriba a la izquierda.
  const cw = 300, ch = 400, g = 4;
  const ks = POSTS.map((_, k) => k).reverse();
  const celdas = await Promise.all(
    ks.map(async (k, i) => {
      const d = join(DIR, carpeta(k));
      const f = existsSync(join(d, "portada.jpg")) ? "portada.jpg" : "01.jpg";
      const m = await sharp(join(d, f)).metadata();
      // Recorte 3:4 centrado (las portadas de reel son 9:16).
      const ancho = Math.min(m.width!, Math.round((m.height! * 3) / 4));
      const alto = Math.min(m.height!, Math.round((ancho * 4) / 3));
      return {
        input: await sharp(join(d, f)).extract({ left: Math.round((m.width! - ancho) / 2), top: Math.round((m.height! - alto) / 2), width: ancho, height: alto }).resize(cw, ch).toBuffer(),
        left: (i % 3) * (cw + g),
        top: Math.floor(i / 3) * (ch + g),
      };
    }),
  );
  mkdirSync(join(RAIZ, "muestras"), { recursive: true });
  const filas = Math.ceil(ks.length / 3);
  await sharp({ create: { width: cw * 3 + g * 2, height: filas * ch + (filas - 1) * g, channels: 3, background: "#fff" } })
    .composite(celdas)
    .jpeg()
    .toFile(join(RAIZ, "muestras", "arranque-perfil.jpg"));
}

// --- Publicación ---
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function ig(ruta: string, datos?: Record<string, string>) {
  const token = process.env["IG_TOKEN"];
  if (!token) throw new Error("Falta IG_TOKEN");
  const r = datos
    ? await fetch(`${API}/${ruta}`, { method: "POST", body: new URLSearchParams({ ...datos, access_token: token }) })
    : await fetch(`${API}/${ruta}${ruta.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(token)}`);
  const j = (await r.json()) as Record<string, unknown>;
  if (!r.ok || j["error"]) throw new Error(`Instagram ${ruta}: ${JSON.stringify(j["error"] ?? j)}`);
  return j;
}
async function listo(id: string, intentos: number) {
  for (let i = 0; i < intentos; i++) {
    const s = await ig(`${id}?fields=status_code`);
    if (s["status_code"] === "FINISHED") return;
    if (s["status_code"] === "ERROR" || s["status_code"] === "EXPIRED") throw new Error(`Contenedor ${id}: ${s["status_code"]}`);
    await espera(5000);
  }
  throw new Error(`Contenedor ${id} no terminó de procesarse`);
}

async function publicar() {
  const usuario = process.env["IG_USER_ID"];
  if (!usuario) throw new Error("Falta IG_USER_ID");
  const ARCH = join(RAIZ, "arranque-publicado.json");
  const REG = join(RAIZ, "publicados.json");
  const hechos: Record<string, { media: string; fecha: string }> = existsSync(ARCH) ? JSON.parse(readFileSync(ARCH, "utf8")) : {};
  for (const [k, p] of POSTS.entries()) {
    const c = carpeta(k);
    if (hechos[c]) {
      console.log(`${c}: ya publicado (${hechos[c].media})`);
      continue;
    }
    const archivos = JSON.parse(readFileSync(join(DIR, c, "archivos.json"), "utf8")) as string[];
    const urls = archivos.map((f) => `${RAW}/img/arranque/${c}/${f}`);
    for (const u of urls) if (!(await fetch(u, { method: "HEAD" })).ok) throw new Error(`No está en GitHub Pages: ${u}`);
    let id: string;
    if (p.formato === "reel") {
      id = String((await ig(`${usuario}/media`, { media_type: "REELS", video_url: urls[0]!, cover_url: urls[1]!, caption: p.texto, share_to_feed: "true" }))["id"]);
      await listo(id, 60);
    } else if (urls.length === 1) {
      id = String((await ig(`${usuario}/media`, { image_url: urls[0]!, caption: p.texto }))["id"]);
      await listo(id, 30);
    } else {
      const hijos: string[] = [];
      for (const u of urls) hijos.push(String((await ig(`${usuario}/media`, { image_url: u, is_carousel_item: "true" }))["id"]));
      id = String((await ig(`${usuario}/media`, { media_type: "CAROUSEL", children: hijos.join(","), caption: p.texto }))["id"]);
      await listo(id, 30);
    }
    const media = String((await ig(`${usuario}/media_publish`, { creation_id: id }))["id"]);
    const fecha = new Date().toISOString();
    hechos[c] = { media, fecha };
    writeFileSync(ARCH, `${JSON.stringify(hechos, null, 2)}\n`);
    if (p.registro) {
      const reg = existsSync(REG) ? JSON.parse(readFileSync(REG, "utf8")) : {};
      reg[p.registro] = { media, formato: p.formato, banco: !!p.banco, fecha };
      writeFileSync(REG, `${JSON.stringify(reg, null, 2)}\n`);
    }
    console.log(`Publicado ${c} → ${media}`);
    if (k < POSTS.length - 1) await espera(60_000);
  }
}

if (import.meta.main) {
  if (process.argv[2] === "publicar") await publicar();
  else await dibujar();
}
