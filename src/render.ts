// Dibuja cada lámina (1080×1350, formato 4:5 de Instagram) y la guarda en JPEG.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import type { Lamina } from "./contenido";

const RAIZ = join(import.meta.dir, "..");
const W = 1080;
const H = 1350;

const C = {
  noche: "#0C0E14",
  blanco: "#FFFFFF",
  azul: "#2563EB",
  claro: "#60A5FA",
  suave: "rgba(255,255,255,0.68)",
  tenue: "rgba(255,255,255,0.38)",
  linea: "rgba(255,255,255,0.12)",
};

const fuente = (peso: number, archivo: string) => ({
  name: "Poppins",
  weight: peso as 300 | 400 | 500,
  style: "normal" as const,
  data: readFileSync(join(RAIZ, "fuentes", archivo)),
});
const FUENTES = [
  fuente(300, "Poppins-Light.ttf"),
  fuente(400, "Poppins-Regular.ttf"),
  fuente(500, "Poppins-Medium.ttf"),
];

const svgData = (archivo: string) =>
  `data:image/svg+xml;base64,${readFileSync(join(RAIZ, "marca", archivo)).toString("base64")}`;
const WORDMARK = svgData("owneria-wordmark-dark.svg");

// Mini JSX sin React: satori acepta objetos { type, props }.
type Nodo = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, ...children: unknown[]): Nodo => ({
  type,
  props: { style: { display: "flex", ...style }, children: children.length === 1 ? children[0] : children },
});
const img = (src: string, w: number, hgt: number): Nodo => ({
  type: "img",
  props: { src, width: w, height: hgt, style: { width: w, height: hgt } },
});

/** Logo de la «o»: aro blanco con punto azul. */
const marca = (d: number, aro = C.blanco) =>
  h(
    "div",
    {
      width: d,
      height: d,
      borderRadius: d,
      border: `${Math.round(d * 0.08)}px solid ${aro}`,
      alignItems: "center",
      justifyContent: "center",
    },
    h("div", { width: d * 0.22, height: d * 0.22, borderRadius: d, background: C.claro }),
  );

function marco(i: number, total: number, contenido: Nodo, pie: Nodo) {
  return h(
    "div",
    {
      width: W,
      height: H,
      flexDirection: "column",
      background: C.noche,
      backgroundImage: `radial-gradient(circle at 85% 8%, rgba(37,99,235,0.35), rgba(12,14,20,0) 55%), radial-gradient(circle at 0% 100%, rgba(96,165,250,0.12), rgba(12,14,20,0) 45%)`,
      padding: "84px 88px 80px",
      fontFamily: "Poppins",
      color: C.blanco,
    },
    h(
      "div",
      { justifyContent: "space-between", alignItems: "center" },
      img(WORDMARK, 230, Math.round((230 * 140) / 559)),
      h("div", { fontSize: 26, color: C.tenue, letterSpacing: 2 }, `${String(i + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`),
    ),
    h("div", { flex: 1, flexDirection: "column", justifyContent: "center" }, contenido),
    h("div", { borderTop: `1px solid ${C.linea}`, paddingTop: 36, justifyContent: "space-between", alignItems: "center", fontSize: 26, color: C.tenue }, pie),
  );
}

/** Flecha dibujada (Poppins no trae «→»). */
const flecha = (t: number) =>
  img(
    `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${C.claro}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16M14 6l6 6-6 6"/></svg>`).toString("base64")}`,
    t,
    t,
  );

const tamTitulo = (s: string) => (s.length > 70 ? 66 : s.length > 45 ? 78 : 92);

function arbol(l: Lamina, i: number, total: number): Nodo {
  if (l.tipo === "portada") {
    return marco(
      i,
      total,
      h(
        "div",
        { flexDirection: "column" },
        h(
          "div",
          { alignSelf: "flex-start", border: `2px solid ${C.claro}`, color: C.claro, borderRadius: 999, padding: "10px 26px", fontSize: 26, fontWeight: 500, letterSpacing: 1 },
          l.categoria.toUpperCase(),
        ),
        h("div", { marginTop: 44, fontSize: tamTitulo(l.titulo), fontWeight: 300, lineHeight: 1.12, letterSpacing: -1.5 }, l.titulo),
      ),
      [h("div", {}, "@owneria.mx"), h("div", { color: C.claro, fontWeight: 500, alignItems: "center", gap: 14 }, "Desliza", flecha(30))] as unknown as Nodo,
    );
  }
  if (l.tipo === "punto") {
    const lista = l.texto.includes("\n");
    return marco(
      i,
      total,
      h(
        "div",
        { flexDirection: "column" },
        h("div", { fontSize: 150, fontWeight: 300, color: C.claro, lineHeight: 1, letterSpacing: -4 }, String(l.n).padStart(2, "0")),
        h("div", { marginTop: 40, fontSize: l.titulo.length > 45 ? 54 : 62, fontWeight: 500, lineHeight: 1.15, letterSpacing: -1 }, l.titulo),
        lista
          ? h(
              "div",
              { flexDirection: "column", marginTop: 40, gap: 22 },
              ...l.texto.split("\n").map((t) => h("div", { fontSize: 37, fontWeight: 300, lineHeight: 1.4, color: C.suave }, t)),
            )
          : h("div", { marginTop: 40, fontSize: 39, fontWeight: 300, lineHeight: 1.45, color: C.suave }, l.texto),
      ),
      [h("div", {}, "@owneria.mx"), h("div", {}, "owneria.mx")] as unknown as Nodo,
    );
  }
  return marco(
    i,
    total,
    h(
      "div",
      { flexDirection: "column", alignItems: "center", textAlign: "center" },
      marca(220),
      h("div", { marginTop: 70, fontSize: 70, fontWeight: 300, lineHeight: 1.15, letterSpacing: -1.5, justifyContent: "center" }, l.titulo),
      h("div", { marginTop: 36, fontSize: 36, fontWeight: 300, color: C.suave, lineHeight: 1.45, justifyContent: "center" }, "Lee el artículo completo en owneria.mx/blog"),
      h(
        "div",
        { marginTop: 60, background: C.azul, borderRadius: 999, padding: "22px 44px", fontSize: 32, fontWeight: 500 },
        "Sigue a @owneria.mx",
      ),
    ),
    [h("div", {}, "Tu negocio conectado. Tú al mando."), h("div", {}, "owneria.mx")] as unknown as Nodo,
  );
}

export async function dibujar(l: Lamina, i: number, total: number): Promise<Buffer> {
  // satori tipa el árbol como ReactNode; nuestros objetos tienen la misma forma.
  const svg = await satori(arbol(l, i, total) as never, { width: W, height: H, fonts: FUENTES });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng();
  return sharp(png).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
}
