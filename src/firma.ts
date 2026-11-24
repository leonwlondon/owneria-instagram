// Genera las imágenes de la firma de correo de León (Gmail no acepta CSS ni SVG animado: solo GIF/PNG por URL).
// Salida: ../app/public/firma/  →  https://owneria.mx/firma/...
// Correr: bun src/firma.ts
import { Resvg } from "@resvg/resvg-js";
import ffmpeg from "ffmpeg-static";
import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

const RAIZ = join(import.meta.dir, "..", "..");
const SALIDA = join(RAIZ, "app", "public", "firma");
mkdirSync(SALIDA, { recursive: true });

const foto = readFileSync(join(RAIZ, "app", "public", "brand", "leon.jpg")).toString("base64");
const INK = "#111114";
const AZUL = "#2563eb";
const AZUL_CLARO = "#60a5fa";

const L = 240; // lienzo (se muestra a 120 px: nítido en pantallas retina)
const C = L / 2;
const R_ANILLO = 104;
const R_FOTO = 88;
const FPS = 25;
const MOV = 50; // cuadros girando (2 s)
const PAUSA = 38; // cuadros quieto (1.5 s)

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const pos = (ang: number) => {
  const a = ((ang - 90) * Math.PI) / 180;
  return [C + R_ANILLO * Math.cos(a), C + R_ANILLO * Math.sin(a)];
};

function cuadro(ang: number, vel: number) {
  // estela: puntos detrás del principal, más largos mientras más rápido va
  let estela = "";
  const largo = 70 * vel;
  for (let i = 10; i >= 1; i--) {
    const [x, y] = pos(ang - (largo * i) / 10);
    estela += `<circle cx="${x}" cy="${y}" r="${13 - i * 0.7}" fill="${AZUL_CLARO}" opacity="${(0.55 * (1 - i / 11)).toFixed(3)}"/>`;
  }
  const [x, y] = pos(ang);
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${L}" height="${L}" viewBox="0 0 ${L} ${L}">
  <rect width="${L}" height="${L}" fill="#ffffff"/>
  <defs><clipPath id="c"><circle cx="${C}" cy="${C}" r="${R_FOTO}"/></clipPath></defs>
  <image href="data:image/jpeg;base64,${foto}" x="${C - R_FOTO}" y="${C - R_FOTO}" width="${R_FOTO * 2}" height="${R_FOTO * 2}" clip-path="url(#c)" preserveAspectRatio="xMidYMid slice"/>
  <circle cx="${C}" cy="${C}" r="${R_ANILLO}" fill="none" stroke="${INK}" stroke-width="10"/>
  ${estela}
  <circle cx="${x}" cy="${y}" r="15" fill="${AZUL}" stroke="#ffffff" stroke-width="3"/>
</svg>`;
}

const tmp = join(tmpdir(), "owneria-firma");
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

const INICIO = 45; // el punto descansa arriba a la derecha, como en el logo
let n = 0;
for (let i = 0; i < MOV + PAUSA; i++) {
  const t = Math.min(i / MOV, 1);
  const vel = i < MOV ? Math.abs(ease(Math.min((i + 1) / MOV, 1)) - ease(t)) * MOV / 2.4 : 0;
  const ang = INICIO + 360 * ease(t);
  const png = new Resvg(cuadro(ang, Math.min(vel, 1))).render().asPng();
  writeFileSync(join(tmp, `f${String(n++).padStart(3, "0")}.png`), png);
}

const gif = join(SALIDA, "leon.gif");
const r = spawnSync(ffmpeg as string, [
  "-y", "-framerate", String(FPS), "-i", join(tmp, "f%03d.png"),
  "-filter_complex", "[0:v]split[a][b];[a]palettegen=max_colors=128:stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a",
  "-loop", "0", gif,
], { stdio: "inherit" });
if (r.status !== 0) throw new Error("ffmpeg falló");

// cuadro fijo (Outlook de escritorio solo muestra el primero; por si acaso)
writeFileSync(join(SALIDA, "leon.png"), new Resvg(cuadro(INICIO, 0)).render().asPng());

// logotipo en PNG (Gmail no muestra SVG)
const marca = readFileSync(join(RAIZ, "app", "public", "brand", "owneria-wordmark.svg"), "utf8");
writeFileSync(join(SALIDA, "owneria.png"), new Resvg(marca, { fitTo: { mode: "height", value: 56 } }).render().asPng());

console.log("listo:", SALIDA);
