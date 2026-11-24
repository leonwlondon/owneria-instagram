// Vista previa: hoja por carrusel y la cuadrícula del perfil (portadas recortadas 3:4, como las muestra Instagram).
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const M = join(import.meta.dir, "..", "muestras");
const dirs = readdirSync(M).filter((d) => statSync(join(M, d)).isDirectory()).sort();
const w = 360, h = 450;
for (const d of dirs) {
  const fs = readdirSync(join(M, d)).filter((f) => f.endsWith(".jpg")).sort();
  const comp = await Promise.all(fs.map(async (f, i) => ({ input: await sharp(join(M, d, f)).resize(w, h).toBuffer(), left: (i % 4) * w, top: Math.floor(i / 4) * h })));
  await sharp({ create: { width: w * 4, height: h * 2, channels: 3, background: "#222" } }).composite(comp).jpeg().toFile(join(M, `hoja-${d}.jpg`));
}
// Cuadrícula 3 columnas, celdas 3:4 (recorte centrado de 1080×1350 → 1012×1350).
const cw = 300, ch = 400, g = 4;
const filas = Math.ceil(dirs.length / 3);
const celdas = await Promise.all(
  dirs.map(async (d, i) => ({
    input: await sharp(join(M, d, "01.jpg")).extract({ left: 34, top: 0, width: 1012, height: 1350 }).resize(cw, ch).toBuffer(),
    left: (i % 3) * (cw + g),
    top: Math.floor(i / 3) * (ch + g),
  })),
);
await sharp({ create: { width: cw * 3 + g * 2, height: filas * ch + (filas - 1) * g, channels: 3, background: "#fff" } }).composite(celdas).jpeg().toFile(join(M, "perfil.jpg"));
