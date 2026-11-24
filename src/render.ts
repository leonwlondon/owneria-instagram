// Dibuja cada lámina (1080×1350, 4:5) y la guarda en JPEG.
// Tres temas que se alternan post a post (noche, azul, claro) para que la cuadrícula del perfil tenga ritmo,
// el aro del logo en grande como sello, y una línea con nodos que cruza todas las láminas del carrusel
// (al deslizar se ve continua: «todo conectado»).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import type { Lamina } from "./contenido";

const RAIZ = join(import.meta.dir, "..");
const W = 1080;
const H = 1350;
const PAD = 88;

export type Tema = "noche" | "azul" | "claro";
// Ciclo de 4 en una cuadrícula de 3 columnas: los colores corren en diagonal en lugar de hacer franjas.
export const TEMAS: Tema[] = ["noche", "azul", "claro", "azul"];

type Paleta = {
  fondo: string;
  capas: string; // gradientes encima del fondo
  texto: string;
  acento: string;
  suave: string;
  tenue: string;
  linea: string;
  aro: string; // aro grande del logo
  punto: string; // punto del logo
  boton: string;
  botonTexto: string;
  wordmark: { tinta: string; acento: string };
};

const P: Record<Tema, Paleta> = {
  noche: {
    fondo: "#0C0E14",
    capas:
      "radial-gradient(circle at 88% 6%, rgba(37,99,235,0.45), rgba(12,14,20,0) 52%), radial-gradient(circle at 0% 100%, rgba(96,165,250,0.16), rgba(12,14,20,0) 45%)",
    texto: "#FFFFFF",
    acento: "#60A5FA",
    suave: "rgba(255,255,255,0.70)",
    tenue: "rgba(255,255,255,0.40)",
    linea: "rgba(255,255,255,0.14)",
    aro: "rgba(255,255,255,0.10)",
    punto: "#2563EB",
    boton: "#2563EB",
    botonTexto: "#FFFFFF",
    wordmark: { tinta: "#FFFFFF", acento: "#60A5FA" },
  },
  azul: {
    fondo: "#2563EB",
    capas:
      "radial-gradient(circle at 90% 0%, rgba(147,197,253,0.55), rgba(37,99,235,0) 50%), radial-gradient(circle at 0% 100%, rgba(12,14,20,0.45), rgba(37,99,235,0) 55%)",
    texto: "#FFFFFF",
    acento: "#0C0E14",
    suave: "rgba(255,255,255,0.86)",
    tenue: "rgba(255,255,255,0.62)",
    linea: "rgba(255,255,255,0.28)",
    aro: "rgba(255,255,255,0.16)",
    punto: "#0C0E14",
    boton: "#0C0E14",
    botonTexto: "#FFFFFF",
    wordmark: { tinta: "#FFFFFF", acento: "#0C0E14" },
  },
  claro: {
    fondo: "#F3F5FA",
    capas:
      "radial-gradient(circle at 90% 4%, rgba(96,165,250,0.32), rgba(243,245,250,0) 50%), radial-gradient(circle at 0% 100%, rgba(37,99,235,0.10), rgba(243,245,250,0) 45%)",
    texto: "#111114",
    acento: "#2563EB",
    suave: "rgba(17,17,20,0.68)",
    tenue: "rgba(17,17,20,0.42)",
    linea: "rgba(17,17,20,0.12)",
    aro: "rgba(37,99,235,0.10)",
    punto: "#2563EB",
    boton: "#111114",
    botonTexto: "#FFFFFF",
    wordmark: { tinta: "#111114", acento: "#2563EB" },
  },
};

const fuente = (peso: number, archivo: string) => ({
  name: "Poppins",
  weight: peso as 300 | 400 | 500,
  style: "normal" as const,
  data: readFileSync(join(RAIZ, "fuentes", archivo)),
});
const FUENTES = [fuente(300, "Poppins-Light.ttf"), fuente(400, "Poppins-Regular.ttf"), fuente(500, "Poppins-Medium.ttf")];

const b64 = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
const WM_BASE = readFileSync(join(RAIZ, "marca", "owneria-wordmark-dark.svg"), "utf8");
const wordmark = (p: Paleta) =>
  b64(WM_BASE.replace('fill="#FFFFFF"', `fill="${p.wordmark.tinta}"`).replace('fill="#60A5FA"', `fill="${p.wordmark.acento}"`));

// Mini JSX sin React: satori acepta objetos { type, props }.
type Nodo = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, ...children: unknown[]): Nodo => ({
  type,
  props: { style: { display: "flex", ...style }, children: children.length === 1 ? children[0] : children },
});
const img = (src: string, w: number, hgt: number, style: Record<string, unknown> = {}): Nodo => ({
  type: "img",
  props: { src, width: w, height: hgt, style: { width: w, height: hgt, ...style } },
});

/** Generador pseudoaleatorio estable por artículo. */
function azar(semilla: string) {
  let s = [...semilla].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

/**
 * Línea continua del carrusel: una curva con nodos que recorre todas las láminas.
 * Se dibuja una vez a lo ancho de todo el carrusel y cada lámina muestra su tramo.
 */
function lineaCarrusel(slug: string, total: number, p: Paleta) {
  const r = azar(slug);
  const ancho = W * total;
  const y0 = 1060;
  const pts: [number, number][] = [];
  for (let x = -W * 0.2; x <= ancho + W * 0.2; x += W / 2) pts.push([x, y0 + (r() - 0.5) * 120]);
  let d = `M ${pts[0]![0]} ${pts[0]![1]}`;
  for (let k = 1; k < pts.length; k++) {
    const [x1, y1] = pts[k - 1]!;
    const [x2, y2] = pts[k]!;
    const mx = (x1 + x2) / 2;
    d += ` C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
  }
  // Nodos en los puntos de la curva que caen dentro de las láminas.
  const nodos = pts
    .filter(([x]) => x > 0 && x < ancho)
    .map(([x, y], k) =>
      k % 2 === 0
        ? `<circle cx="${x}" cy="${y}" r="15" fill="${p.fondo}" stroke="${p.acento}" stroke-width="5"/><circle cx="${x}" cy="${y}" r="5" fill="${p.acento}"/>`
        : `<circle cx="${x}" cy="${y}" r="7" fill="${p.acento}"/>`,
    )
    .join("");
  return (i: number) =>
    b64(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${i * W} 0 ${W} ${H}"><path d="${d}" fill="none" stroke="${p.acento}" stroke-opacity="0.55" stroke-width="3"/>${nodos}</svg>`,
    );
}

/** Aro del logo en grande, recortado por el borde (sello visual del perfil). */
const aroGrande = (p: Paleta, d: number, x: number, y: number, conPunto = true) =>
  img(
    b64(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="${p.aro}" stroke-width="8"/>${
        conPunto ? `<circle cx="50" cy="50" r="11" fill="${p.punto}"/>` : ""
      }</svg>`,
    ),
    d,
    d,
    { position: "absolute", left: x, top: y },
  );

const icono = (p: Paleta, path: string, t: number, color = p.acento) =>
  img(
    b64(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`,
    ),
    t,
    t,
  );
const FLECHA = '<path d="M4 12h16M14 6l6 6-6 6"/>';
const GUARDAR = '<path d="M6 3h12v18l-6-4-6 4z"/>';
const CHECK = '<path d="M5 12.5l4.5 4.5L19 7.5"/>';

/** Parte el título para resaltar: lo que va después de «:» o las últimas palabras. */
function partir(t: string): [string, string] {
  const i = t.indexOf(":");
  if (i > 8 && i < t.length - 8) return [t.slice(0, i + 1), t.slice(i + 1).trim()];
  const ps = t.split(" ");
  const n = ps.length > 6 ? 3 : 2;
  return [ps.slice(0, -n).join(" "), ps.slice(-n).join(" ")];
}

function marco(p: Paleta, i: number, total: number, fondo: Nodo[], contenido: Nodo, pie: Nodo[], tramo: string) {
  return h(
    "div",
    { width: W, height: H, position: "relative", background: p.fondo, fontFamily: "Poppins", color: p.texto, overflow: "hidden" },
    h("div", { position: "absolute", left: 0, top: 0, width: W, height: H, backgroundImage: p.capas }),
    ...fondo,
    img(tramo, W, H, { position: "absolute", left: 0, top: 0 }),
    h(
      "div",
      { position: "absolute", left: 0, top: 0, width: W, height: H, flexDirection: "column", padding: `80px ${PAD}px 76px` },
      h(
        "div",
        { justifyContent: "space-between", alignItems: "center" },
        img(wordmark(p), 210, Math.round((210 * 140) / 559)),
        // Barra de avance del carrusel.
        h(
          "div",
          { gap: 8, alignItems: "center" },
          ...Array.from({ length: total }, (_, k) =>
            h("div", { width: k === i ? 46 : 14, height: 8, borderRadius: 8, background: k === i ? p.acento : p.linea }),
          ),
        ),
      ),
      h("div", { flex: 1, flexDirection: "column", justifyContent: "center", paddingBottom: 170 }, contenido),
      h("div", { justifyContent: "space-between", alignItems: "center", fontSize: 26, color: p.tenue }, ...pie),
    ),
  );
}

const tamPortada = (s: string) => (s.length > 72 ? 76 : s.length > 52 ? 88 : s.length > 34 ? 100 : 116);

function arbol(l: Lamina, i: number, total: number, p: Paleta, tramo: string): Nodo {
  if (l.tipo === "portada") {
    const [a, b] = partir(l.titulo);
    return marco(
      p,
      i,
      total,
      [aroGrande(p, 980, 430, -330, false)],
      h(
        "div",
        { flexDirection: "column" },
        h(
          "div",
          { alignSelf: "flex-start", alignItems: "center", gap: 12, background: p.acento, color: p.fondo === "#2563EB" ? "#FFFFFF" : p.fondo, borderRadius: 999, padding: "12px 28px", fontSize: 25, fontWeight: 500, letterSpacing: 2 },
          l.categoria.toUpperCase(),
        ),
        h(
          "div",
          { marginTop: 48, flexDirection: "column", fontSize: tamPortada(l.titulo), fontWeight: 300, lineHeight: 1.06, letterSpacing: -3 },
          a ? h("div", {}, a) : h("div", {}),
          h("div", { color: p.acento, fontWeight: 400 }, b),
        ),
      ),
      [h("div", {}, "@owneria.mx"), h("div", { color: p.texto, fontWeight: 500, alignItems: "center", gap: 14, fontSize: 28 }, "Desliza", icono(p, FLECHA, 34))],
      tramo,
    );
  }
  if (l.tipo === "punto") {
    const lista = l.texto.includes("\n");
    const num = String(l.n).padStart(2, "0");
    return marco(
      p,
      i,
      total,
      [
        // Número gigante de fondo.
        h("div", { position: "absolute", right: -40, top: 150, fontSize: 620, fontWeight: 500, lineHeight: 1, letterSpacing: -40, color: p.aro }, num),
      ],
      h(
        "div",
        { flexDirection: "column" },
        h("div", { alignItems: "center", gap: 18, fontSize: 26, fontWeight: 500, letterSpacing: 4, color: p.acento }, h("div", { width: 56, height: 3, background: p.acento }), `PUNTO ${num}`),
        h("div", { marginTop: 34, fontSize: l.titulo.length > 45 ? 62 : 72, fontWeight: 500, lineHeight: 1.1, letterSpacing: -2 }, l.titulo),
        lista
          ? h(
              "div",
              { flexDirection: "column", marginTop: 44, gap: 26 },
              ...l.texto.split("\n").map((t) =>
                h(
                  "div",
                  { gap: 22, alignItems: "flex-start" },
                  h("div", { width: 46, height: 46, borderRadius: 46, background: p.linea, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 4 }, icono(p, CHECK, 28)),
                  h("div", { fontSize: 37, fontWeight: 300, lineHeight: 1.38, color: p.suave }, t.replace(/^• /, "")),
                ),
              ),
            )
          : h("div", { marginTop: 44, fontSize: 40, fontWeight: 300, lineHeight: 1.45, color: p.suave }, l.texto),
      ),
      [h("div", {}, "@owneria.mx"), h("div", { alignItems: "center", gap: 12 }, "Desliza", icono(p, FLECHA, 28, p.tenue))],
      tramo,
    );
  }
  return marco(
    p,
    i,
    total,
    [aroGrande(p, 1250, -85, -60, false)],
    h(
      "div",
      { flexDirection: "column", alignItems: "center", textAlign: "center" },
      h("div", { width: 150, height: 150, borderRadius: 150, border: `12px solid ${p.texto}`, alignItems: "center", justifyContent: "center" }, h("div", { width: 34, height: 34, borderRadius: 34, background: p.punto })),
      h("div", { marginTop: 64, fontSize: 82, fontWeight: 300, lineHeight: 1.08, letterSpacing: -2.5, justifyContent: "center", flexWrap: "wrap" }, l.titulo),
      h("div", { marginTop: 32, fontSize: 36, fontWeight: 300, color: p.suave, lineHeight: 1.45, justifyContent: "center" }, "El artículo completo está en owneria.mx/blog"),
      h(
        "div",
        { marginTop: 56, gap: 20 },
        h("div", { alignItems: "center", gap: 14, border: `2px solid ${p.texto}`, borderRadius: 999, padding: "20px 36px", fontSize: 30, fontWeight: 500 }, icono(p, GUARDAR, 32, p.texto), "Guárdalo"),
        h("div", { background: p.boton, color: p.botonTexto, borderRadius: 999, padding: "22px 40px", fontSize: 30, fontWeight: 500 }, "Sigue a @owneria.mx"),
      ),
    ),
    [h("div", {}, "Tu negocio conectado. Tú al mando."), h("div", {}, "owneria.mx")],
    tramo,
  );
}

/** Dibuja todas las láminas de un carrusel con el tema indicado. */
export async function dibujarCarrusel(slug: string, ls: Lamina[], tema: Tema): Promise<Buffer[]> {
  const p = P[tema];
  const tramo = lineaCarrusel(slug, ls.length, p);
  const out: Buffer[] = [];
  for (const [i, l] of ls.entries()) {
    // satori tipa el árbol como ReactNode; nuestros objetos tienen la misma forma.
    const svg = await satori(arbol(l, i, ls.length, p, tramo(i)) as never, { width: W, height: H, fonts: FUENTES });
    const png = new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng();
    out.push(await sharp(png).jpeg({ quality: 90, mozjpeg: true }).toBuffer());
  }
  return out;
}
