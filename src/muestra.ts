// Genera muestras locales en muestras/<slug>/ con los artículos de arranque del repo del sitio.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ARRANQUE_1 } from "../../app/src/content/blog/arranque-1";
import { ARRANQUE_2 } from "../../app/src/content/blog/arranque-2";
import { CATEGORIAS } from "../../app/src/lib/blog/tipos";
import { laminas, textoPost, type Articulo } from "./contenido";
import { dibujarCarrusel, TEMAS } from "./render";

const cuantos = Number(process.argv[2] ?? 2);
for (const [k, p] of [...ARRANQUE_1, ...ARRANQUE_2].slice(0, cuantos).entries()) {
  const a: Articulo = { ...p, categoria: CATEGORIAS[p.categoria] };
  const ls = laminas(a);
  const dir = join(import.meta.dir, "..", "muestras", a.slug);
  mkdirSync(dir, { recursive: true });
  const imgs = await dibujarCarrusel(a.slug, ls, TEMAS[k % TEMAS.length]!);
  for (const [i, b] of imgs.entries()) writeFileSync(join(dir, `${String(i + 1).padStart(2, "0")}.jpg`), b);
  writeFileSync(join(dir, "texto.txt"), textoPost(a, ls));
  console.log(a.slug, ls.length, "láminas");
}
