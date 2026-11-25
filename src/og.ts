// Imagen para redes (Open Graph, 1200×630) de cada artículo y noticia del blog.
// El sitio corre en un Worker de Cloudflare, donde satori/resvg no se llevan bien, así que se generan aquí
// y se guardan en el sitio: `app/public/blog/og/<slug>.jpg` + la lista `app/src/content/blog/og.ts`.
// Los artículos sin imagen usan la general (`og.png`).
//   bun run og            → solo las que faltan
//   bun run og --todas    → todas de nuevo
//   OG_FUENTE=http://localhost:5173 bun run og   → lee del servidor local
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { P, TEMAS, FUENTES, b64, h, img, partir, wordmark, type Paleta } from "./render";

const W = 1200;
const H = 630;
const APP = join(import.meta.dir, "..", "..", "app");
const DIR = join(APP, "public", "blog", "og");
const LISTA = join(APP, "src", "content", "blog", "og.ts");
const FUENTE = process.env.OG_FUENTE ?? "https://owneria.mx";

type Item = { slug: string; tipo?: "articulo" | "noticia"; titulo: string; categoria: string };

const aro = (p: Paleta, d: number, x: number, y: number) =>
  img(
    b64(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="${p.aro}" stroke-width="8"/><circle cx="50" cy="50" r="11" fill="${p.punto}"/></svg>`,
    ),
    d,
    d,
    { position: "absolute", left: x, top: y },
  );

/** Línea con nodos al pie, como en Instagram («todo conectado»). */
const linea = (p: Paleta) =>
  img(
    b64(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><path d="M -40 560 C 200 520, 300 600, 520 565 S 860 520, 1240 555" fill="none" stroke="${p.acento}" stroke-opacity="0.5" stroke-width="3"/><circle cx="520" cy="565" r="12" fill="${p.fondo}" stroke="${p.acento}" stroke-width="4"/><circle cx="520" cy="565" r="4" fill="${p.acento}"/><circle cx="880" cy="534" r="6" fill="${p.acento}"/><circle cx="190" cy="534" r="6" fill="${p.acento}"/></svg>`,
    ),
    W,
    H,
    { position: "absolute", left: 0, top: 0 },
  );

function arbol(it: Item, p: Paleta) {
  const [a, b] = partir(it.titulo);
  const largo = it.titulo.length;
  const tam = largo > 90 ? 44 : largo > 65 ? 52 : 60;
  const etiqueta = it.tipo === "noticia" ? `Noticia · ${it.categoria}` : it.categoria;
  return h(
    "div",
    { width: W, height: H, position: "relative", background: p.fondo, fontFamily: "Poppins", color: p.texto, overflow: "hidden" },
    h("div", { position: "absolute", left: 0, top: 0, width: W, height: H, backgroundImage: p.capas }),
    aro(p, 560, 880, -230),
    linea(p),
    h(
      "div",
      { position: "absolute", left: 0, top: 0, width: W, height: H, flexDirection: "column", padding: "64px 80px 70px" },
      h("div", {}, img(wordmark(p), 190, Math.round((190 * 140) / 559))),
      h(
        "div",
        { flexDirection: "column", flexGrow: 1, justifyContent: "center", maxWidth: 940 },
        h("div", { fontSize: 22, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase", color: p.acento, marginBottom: 22 }, etiqueta),
        h(
          "div",
          { flexDirection: "column", fontSize: tam, fontWeight: 500, lineHeight: 1.12, letterSpacing: -1 },
          h("span", {}, a),
          h("span", { color: p.acento }, b),
        ),
      ),
    ),
  );
}

async function dibujar(it: Item, tema: (typeof TEMAS)[number]) {
  const svg = await satori(arbol(it, P[tema]) as never, { width: W, height: H, fonts: FUENTES });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng();
  return sharp(png).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
}

const todas = process.argv.includes("--todas");
const res = await fetch(`${FUENTE}/api/public/articulos?todos=1`);
if (!res.ok) throw new Error(`No pude leer ${FUENTE}: ${res.status}`);
const items = ((await res.json()) as Item[]).sort((x, y) => x.slug.localeCompare(y.slug));
mkdirSync(DIR, { recursive: true });

let nuevas = 0;
for (const [i, it] of items.entries()) {
  const archivo = join(DIR, `${it.slug}.jpg`);
  if (!todas && existsSync(archivo)) continue;
  // Tema estable por artículo: no cambia al regenerar.
  const n = [...it.slug].reduce((s, c) => (s * 31 + c.charCodeAt(0)) >>> 0, 7);
  writeFileSync(archivo, await dibujar(it, TEMAS[n % TEMAS.length]!));
  nuevas++;
  console.log(`✓ ${i + 1}/${items.length} ${it.slug}`);
}

const slugs = items.map((x) => x.slug).filter((s) => existsSync(join(DIR, `${s}.jpg`)));
writeFileSync(
  LISTA,
  `// Generado por instagram/src/og.ts (bun run og). No editar a mano.\n// Artículos con imagen propia en public/blog/og/<slug>.jpg; los demás usan og.png.\nexport const OG_ARTICULOS = new Set<string>([\n${slugs.map((x) => `  ${JSON.stringify(x)},\n`).join("")}]);\n`,
);
console.log(`${nuevas} nuevas · ${slugs.length} en la lista`);
