// Muestras del banco: bun src/muestra-banco.ts [con-reel]
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BANCO, laminasPieza } from "./banco";
import { dibujarCarrusel, TEMAS } from "./render";
import { dibujarReelPregunta } from "./reel";

const M = join(import.meta.dir, "..", "muestras");
const vistas = new Set<string>();
let k = 0;
for (const p of BANCO) {
  if (vistas.has(p.serie) && p.serie !== "glosario" && p.serie !== "idea") continue;
  if (vistas.has(p.serie + "2")) continue;
  vistas.add(vistas.has(p.serie) ? p.serie + "2" : p.serie);
  const tema = TEMAS[k++ % TEMAS.length]!;
  const dir = join(M, `banco-${p.id}`);
  mkdirSync(dir, { recursive: true });
  if (p.serie === "pregunta") {
    if (process.argv[2]) await dibujarReelPregunta(p, tema, join(dir, "reel.mp4"), join(dir, "01.jpg"));
    continue;
  }
  for (const [i, b] of (await dibujarCarrusel(p.id, laminasPieza(p), tema)).entries()) writeFileSync(join(dir, `${String(i + 1).padStart(2, "0")}.jpg`), b);
  console.log(p.id, tema);
}
