// Portada (1640×624) y foto de perfil (1080×1080) de la página de Facebook. bun src/portada-fb.ts → marca/fb/
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { FUENTES, h, img, P, wordmark, b64 } from "./render";

const RAIZ = join(import.meta.dir, "..");
const OUT = join(RAIZ, "marca", "fb");
mkdirSync(OUT, { recursive: true });
const p = P.noche;
const W = 1640;
const H = 624;

// Red de nodos conectados a la derecha: «todo conectado», con el logo en el centro.
const red = (() => {
  const cx = 1250, cy = 312;
  const nodos = [
    [1000, 120], [1080, 470], [1430, 110], [1520, 400], [1180, 560], [960, 330], [1600, 240], [1340, 40],
  ];
  const lineas = nodos.map(([x, y]) => `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#60A5FA" stroke-opacity="0.35" stroke-width="2"/>`).join("");
  const anillo = nodos.map(([x, y], k) => {
    const [x2, y2] = nodos[(k + 1) % nodos.length]!;
    return `<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="#ffffff" stroke-opacity="0.08" stroke-width="2"/>`;
  }).join("");
  const puntos = nodos.map(([x, y], k) =>
    k % 2 === 0
      ? `<circle cx="${x}" cy="${y}" r="16" fill="#0C0E14" stroke="#60A5FA" stroke-width="5"/><circle cx="${x}" cy="${y}" r="5" fill="#60A5FA"/>`
      : `<circle cx="${x}" cy="${y}" r="8" fill="#60A5FA"/>`,
  ).join("");
  const logo = `<circle cx="${cx}" cy="${cy}" r="92" fill="#0C0E14" stroke="#ffffff" stroke-width="18"/><circle cx="${cx}" cy="${cy}" r="25" fill="#2563EB"/>`;
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${anillo}${lineas}${puntos}${logo}</svg>`);
})();

const portada = h(
  "div",
  { width: W, height: H, position: "relative", background: p.fondo, fontFamily: "Poppins", color: "#fff", overflow: "hidden" },
  h("div", {
    position: "absolute", left: 0, top: 0, width: W, height: H,
    backgroundImage: "radial-gradient(circle at 76% 50%, rgba(37,99,235,0.45), rgba(12,14,20,0) 45%), radial-gradient(circle at 0% 100%, rgba(96,165,250,0.12), rgba(12,14,20,0) 40%)",
  }),
  img(red, W, H, { position: "absolute", left: 0, top: 0 }),
  h(
    "div",
    // Texto dentro de la zona que Facebook muestra en celular (centro) y sin chocar con la foto de perfil.
    { position: "absolute", left: 300, top: 0, bottom: 0, flexDirection: "column", justifyContent: "center", width: 800 },
    img(wordmark(p), 380, Math.round((380 * 140) / 559)),
    h("div", { marginTop: 34, fontSize: 52, fontWeight: 300, lineHeight: 1.12, letterSpacing: -1.5 }, "Tu negocio conectado."),
    h("div", { fontSize: 52, fontWeight: 400, lineHeight: 1.12, letterSpacing: -1.5, color: p.acento }, "Tú al mando."),
    h("div", { marginTop: 26, fontSize: 24, fontWeight: 300, color: p.suave, letterSpacing: 0.5 }, "Automatización e IA para dueños de negocio · owneria.mx"),
  ),
);

const svg = await satori(portada as never, { width: W, height: H, fonts: FUENTES });
writeFileSync(join(OUT, "portada.png"), new Resvg(svg).render().asPng());

// Foto de perfil: el ícono de la app en grande (Facebook la recorta en círculo).
const icono = readFileSync(join(RAIZ, "..", "app", "public", "brand", "owneria-app-icon.svg"), "utf8");
writeFileSync(join(OUT, "perfil.png"), new Resvg(icono, { fitTo: { mode: "width", value: 1080 } }).render().asPng());
console.log("listo:", OUT);
