// Reel de muestra: bun src/muestra-reel.ts <número de artículo> <tema>
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { ARRANQUE_1 } from "../../app/src/content/blog/arranque-1";
import { ARRANQUE_2 } from "../../app/src/content/blog/arranque-2";
import { CATEGORIAS } from "../../app/src/lib/blog/tipos";
import { laminas } from "./contenido";
import { dibujarReel } from "./reel";
import type { Tema } from "./render";

const p = [...ARRANQUE_1, ...ARRANQUE_2][Number(process.argv[2] ?? 7)]!;
const tema = (process.argv[3] ?? "noche") as Tema;
const dir = join(import.meta.dir, "..", "muestras", "reels");
mkdirSync(dir, { recursive: true });
const t = Date.now();
const r = await dibujarReel(laminas({ ...p, categoria: CATEGORIAS[p.categoria] }), tema, join(dir, `${p.slug}.mp4`), join(dir, `${p.slug}.jpg`));
console.log(p.slug, r, `${((Date.now() - t) / 1000).toFixed(0)} s`);
