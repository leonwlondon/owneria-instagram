// Firma de correo de León, con el lenguaje del hero de owneria.mx:
// los sistemas del negocio sueltos → líneas azules los conectan → quedan en órbita alrededor de León (al mando).
// Gmail no acepta CSS ni SVG animado: solo GIF/PNG por URL. Salida: ../app/public/firma/ → https://owneria.mx/firma/
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

const FUENTES = ["Light", "Regular", "Medium"].map((p) => join(import.meta.dir, "..", "fuentes", `Poppins-${p}.ttf`));
const foto = readFileSync(join(RAIZ, "app", "public", "brand", "leon.jpg")).toString("base64");
const wordmark = readFileSync(join(RAIZ, "app", "public", "brand", "owneria-wordmark-dark.svg"), "utf8");
const wmInterior = wordmark.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");

// íconos de lucide (los mismos del hero), leídos sin cargar React
function icono(nombre: string) {
  const js = readFileSync(join(RAIZ, "app", "node_modules", "lucide-react", "dist", "esm", "icons", `${nombre}.js`), "utf8");
  const ini = js.indexOf("const __iconNode = ") + 19;
  const arr = js.slice(ini, js.indexOf(";\nconst ", ini));
  const nodos = new Function(`return ${arr}`)() as [string, Record<string, string>][];
  return nodos
    .map(([tag, a]) => `<${tag} ${Object.entries(a).filter(([k]) => k !== "key").map(([k, v]) => `${k}="${v}"`).join(" ")}/>`)
    .join("");
}
const ICONOS = ["landmark", "receipt", "file-check-corner", "database", "message-circle", "file-spreadsheet", "building-2", "users"].map(icono);

const NOCHE = "#0c0e14", NOCHE2 = "#141824", AZUL = "#2563eb", AZUL_CLARO = "#60a5fa";
const W = 520, H = 160, ESCALA = 1.5; // se muestra a 520×160; se dibuja al doble para pantallas retina
const CX = 82, CY = 80, R_ORB = 56;
const FPS = 15, CUADROS = 84; // 5.6 s

// posiciones «en caos» (dentro del panel izquierdo, lejos del centro)
const CAOS = [
  [22, 24], [128, 18], [150, 70], [140, 140], [70, 146], [16, 104], [44, 60], [112, 112],
];

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const tramo = (t: number, a: number, b: number) => ease(clamp((t - a) / (b - a)));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

function cuadro(t: number) {
  // línea de tiempo: conectado → se sueltan → caos → se reconectan → conectado
  const sueltaLinea = tramo(t, 0.2, 0.28);
  const sueltaNodo = tramo(t, 0.24, 0.42);
  const dibuja = tramo(t, 0.55, 0.68);
  const jala = tramo(t, 0.62, 0.82);
  const k = (1 - sueltaNodo) + jala; // 1 = órbita, 0 = caos
  const lineaOp = t < 0.5 ? 1 - sueltaLinea : dibuja;
  const destello = Math.sin(Math.PI * clamp((t - 0.8) / 0.16));
  const rot = 45 * tramo(t, 0.24, 0.82); // gira solo mientras se reacomoda (8 nodos a 45°: empata al reiniciar)

  let lineas = "", nodos = "";
  ICONOS.forEach((ic, i) => {
    const a = ((i * 45 + rot - 90) * Math.PI) / 180;
    const ox = CX + R_ORB * Math.cos(a), oy = CY + R_ORB * Math.sin(a);
    const [sx, sy] = CAOS[i];
    const dx = sx + 3 * Math.sin(2 * Math.PI * (t + i / 8)), dy = sy + 3 * Math.cos(2 * Math.PI * (t * 1.3 + i / 5));
    const kk = Math.min(k, 1);
    const x = lerp(dx, ox, kk), y = lerp(dy, oy, kk);
    if (lineaOp > 0.01) {
      // la línea sale del aro de León hacia el nodo
      const ang = Math.atan2(y - CY, x - CX);
      const x0 = CX + 30 * Math.cos(ang), y0 = CY + 30 * Math.sin(ang);
      const largo = t < 0.5 ? 1 : dibuja;
      const ex = lerp(x0, x, largo), ey = lerp(y0, y, largo);
      lineas += `<line x1="${x0}" y1="${y0}" x2="${ex}" y2="${ey}" stroke="${AZUL_CLARO}" stroke-width="0.9" stroke-linecap="round" opacity="${(0.75 * lineaOp).toFixed(3)}"/>`;
    }
    const brillo = 0.5 + 0.35 * kk;
    nodos += `<g transform="translate(${x} ${y})">
      <circle r="10.5" fill="${NOCHE2}" stroke="#ffffff" stroke-opacity="${(0.1 + 0.12 * kk).toFixed(3)}" stroke-width="0.8"/>
      <g transform="translate(-6 -6) scale(0.5)" fill="none" stroke="#ffffff" stroke-opacity="${brillo.toFixed(3)}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ic}</g>
    </g>`;
  });

  // punto que recorre la línea bajo el nombre (como la línea continua del sitio)
  const px = lerp(196, 496, (t * 1) % 1);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W * ESCALA}" height="${H * ESCALA}" viewBox="0 0 ${W} ${H}">
  <defs>
    <clipPath id="foto"><circle cx="${CX}" cy="${CY}" r="23"/></clipPath>
    <radialGradient id="halo"><stop offset="0" stop-color="${AZUL}" stop-opacity="0.35"/><stop offset="1" stop-color="${AZUL}" stop-opacity="0"/></radialGradient>
    <radialGradient id="flash"><stop offset="0" stop-color="${AZUL_CLARO}" stop-opacity="0.7"/><stop offset="1" stop-color="${AZUL_CLARO}" stop-opacity="0"/></radialGradient>
    <linearGradient id="riel" x1="0" x2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.18"/><stop offset="1" stop-color="#ffffff" stop-opacity="0.02"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  <rect width="${W}" height="${H}" rx="18" fill="${NOCHE}"/>
  <circle cx="${CX}" cy="${CY}" r="80" fill="url(#halo)"/>
  <circle cx="${CX}" cy="${CY}" r="${R_ORB}" fill="none" stroke="#ffffff" stroke-opacity="0.06"/>
  <circle cx="${CX}" cy="${CY}" r="${R_ORB + 20}" fill="none" stroke="#ffffff" stroke-opacity="0.04"/>
  ${lineas}
  ${destello > 0 ? `<circle cx="${CX}" cy="${CY}" r="${40 + 20 * destello}" fill="url(#flash)" opacity="${destello.toFixed(3)}"/>` : ""}
  ${nodos}
  <image href="data:image/jpeg;base64,${foto}" x="${CX - 23}" y="${CY - 23}" width="46" height="46" clip-path="url(#foto)" preserveAspectRatio="xMidYMid slice"/>
  <circle cx="${CX}" cy="${CY}" r="27" fill="none" stroke="#ffffff" stroke-width="3.2"/>
  <circle cx="${CX + 27 * Math.cos(-Math.PI / 4)}" cy="${CY + 27 * Math.sin(-Math.PI / 4)}" r="${5.2 + 1.5 * destello}" fill="${AZUL_CLARO}" stroke="${NOCHE}" stroke-width="1.5"/>

  <line x1="174" y1="26" x2="174" y2="134" stroke="#ffffff" stroke-opacity="0.08"/>

  <svg x="194" y="20" width="76" height="19" viewBox="0 0 559 140">${wmInterior}</svg>
  <text x="195" y="76" font-family="Poppins" font-weight="500" font-size="22" fill="#ffffff" letter-spacing="-0.3">Leon Wladislawoski</text>
  <text x="196" y="96" font-family="Poppins" font-weight="400" font-size="11.5" fill="${AZUL_CLARO}">Fundador · Automatización e IA para dueños</text>
  <text x="196" y="114" font-family="Poppins" font-weight="300" font-size="11" fill="#ffffff" fill-opacity="0.75">Tu negocio conectado. <tspan fill-opacity="0.45">Tú al mando.</tspan></text>

  <line x1="196" y1="134" x2="496" y2="134" stroke="url(#riel)" stroke-width="1"/>
  ${[196, 296, 396, 496].map((x) => `<circle cx="${x}" cy="134" r="1.8" fill="#ffffff" fill-opacity="0.25"/>`).join("")}
  <circle cx="${px}" cy="134" r="6" fill="${AZUL_CLARO}" opacity="0.25"/>
  <circle cx="${px}" cy="134" r="2.6" fill="${AZUL_CLARO}"/>
</svg>`;
}

const pintar = (svg: string) =>
  new Resvg(svg, { font: { fontFiles: FUENTES, loadSystemFonts: false, defaultFontFamily: "Poppins" } }).render().asPng();

const tmp = join(tmpdir(), "owneria-firma");
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
for (let i = 0; i < CUADROS; i++) writeFileSync(join(tmp, `f${String(i).padStart(3, "0")}.png`), pintar(cuadro(i / CUADROS)));

const r = spawnSync(ffmpeg as string, [
  "-y", "-loglevel", "error", "-framerate", String(FPS), "-i", join(tmp, "f%03d.png"),
  "-filter_complex", "[0:v]split[a][b];[a]palettegen=max_colors=128:stats_mode=full[p];[b][p]paletteuse=dither=none:diff_mode=rectangle",
  "-loop", "0", join(SALIDA, "leon.gif"),
], { stdio: "inherit" });
if (r.status !== 0) throw new Error("ffmpeg falló");

// cuadro fijo (Outlook de escritorio solo muestra el primero; también sirve de muestra)
writeFileSync(join(SALIDA, "leon.png"), pintar(cuadro(0)));
writeFileSync(join(tmp, "caos.png"), pintar(cuadro(0.5)));
console.log("listo:", SALIDA, "| muestra caos:", join(tmp, "caos.png"));
