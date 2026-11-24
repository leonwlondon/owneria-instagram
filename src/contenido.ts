// Convierte un artículo del blog en las láminas del carrusel y el texto del post.
// Todo sale del artículo publicado: no se inventa nada.

export type Articulo = {
  slug: string;
  titulo: string;
  descripcion: string;
  categoria: string; // etiqueta legible, p. ej. "SAT y fiscal"
  palabrasClave: string[];
  cuerpo: string; // Markdown del blog
  publicado: string; // ISO
  ilustracion?: Figura;
  figuras?: Figura[];
};

export type Figura = { plantilla?: string; etiquetas?: string[]; pie?: string };

export type Lamina =
  | { tipo: "portada"; categoria: string; titulo: string }
  | { tipo: "punto"; n: number; titulo: string; texto: string }
  | { tipo: "diagrama"; titulo: string; nodos: string[] }
  | { tipo: "dato"; valor: string; texto: string }
  | { tipo: "cierre"; idea: string };

const MAX_PUNTOS = 5;

/** Quita ligas, negritas y marcas de figura del Markdown. */
export function textoPlano(md: string) {
  return md
    .replace(/::figura \d+::/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/** Recorta en el último fin de oración que quepa; si no hay, en la última palabra con «…». */
export function recortar(s: string, max: number) {
  if (s.length <= max) return s;
  const corte = s.slice(0, max);
  const fin = Math.max(corte.lastIndexOf(". "), corte.lastIndexOf("? "), corte.lastIndexOf("! "));
  if (fin > max * 0.45) return corte.slice(0, fin + 1);
  return `${corte.slice(0, corte.lastIndexOf(" ")).replace(/[,;:]$/, "")}…`;
}

/** Primer bloque útil de una sección: párrafo, o hasta 3 renglones de lista. */
function primerBloque(seccion: string) {
  const bloques = seccion
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter((b) => b && !/^::figura/.test(b) && !/^#{2,}/.test(b));
  const lista = (b: string) =>
    b
      .split("\n")
      .filter((l) => /^([-*]|\d+\.) /.test(l))
      .slice(0, 3)
      .map((l) => `• ${recortar(textoPlano(l.replace(/^([-*]|\d+\.) /, "")), 120)}`)
      .join("\n");
  const esLista = (b: string) => /^([-*]|\d+\.) /m.test(b);
  const b = bloques[0] ?? "";
  if (esLista(b)) return lista(b);
  // «…estas tres condiciones:» seguido de la lista: se muestra la lista.
  if (/:$/.test(b) && esLista(bloques[1] ?? "")) return lista(bloques[1]!);
  return recortar(textoPlano(b), 230);
}

export function laminas(a: Articulo): Lamina[] {
  const secciones = a.cuerpo
    .split(/\n(?=## )/)
    .filter((s) => s.startsWith("## "))
    .map((s) => {
      const [cab, ...resto] = s.split("\n");
      return { titulo: textoPlano(cab!.replace(/^## /, "")), cuerpo: resto.join("\n") };
    })
    .filter((s) => !/preguntas frecuentes/i.test(s.titulo) && primerBloque(s.cuerpo));

  const puntos: Lamina[] = secciones.slice(0, MAX_PUNTOS).map((s, i) => ({
    tipo: "punto",
    n: i + 1,
    titulo: recortar(s.titulo, 70),
    texto: primerBloque(s.cuerpo),
  }));

  const extra: Lamina[] = [];
  const d = dato(a);
  if (d) extra.push(d);
  const g = diagrama(a);
  if (g) extra.push(g);
  // Portada, dos puntos, el dato y el diagrama en medio (rompen el ritmo), el resto de puntos y la idea final.
  const mezcla = [...puntos.slice(0, 2), ...extra, ...puntos.slice(2)].slice(0, 7);
  return [{ tipo: "portada", categoria: a.categoria, titulo: a.titulo }, ...mezcla, { tipo: "cierre", idea: recortar(a.descripcion, 150) }];
}

/** Diagrama con las etiquetas de una figura real del artículo (pasos, sistemas, etc.). */
export function diagrama(a: Articulo): Lamina | null {
  const f = [...(a.figuras ?? []), ...(a.ilustracion ? [a.ilustracion] : [])].find(
    // Sin etiquetas con montos o folios de ejemplo de la ilustración.
    (x) => (x.etiquetas?.length ?? 0) >= 3 && (x.etiquetas?.length ?? 0) <= 6 && !x.etiquetas!.some((e) => /\$|\d{3}/.test(e)),
  );
  if (!f) return null;
  return { tipo: "diagrama", titulo: recortar(textoPlano(f.pie ?? a.titulo), 120), nodos: f.etiquetas!.map((e) => recortar(e, 28)) };
}

/**
 * Un dato con número que ya viene en el artículo (nunca se inventa).
 * Ignora años, artículos de ley («69-B») y números sueltos sin contexto.
 */
export function dato(a: Articulo): Lamina | null {
  const texto = textoPlano(a.cuerpo.replace(/^#+ .*$/gm, ""));
  const oraciones = texto.split(/(?<=[.!?])\s+/);
  for (const o of oraciones) {
    const m = o.match(/(?<![\w-])(\d{1,3}(?:[.,]\d+)?)(\s?%|\s(?:de cada \d+|veces|horas|días|minutos|segundos|semanas|meses|máquinas|sucursales|personas|empleados|millones|mil|por ciento))(?![\w-])/i);
    if (!m) continue;
    const n = Number(m[1]!.replace(",", "."));
    if (n >= 1900 && n <= 2100) continue;
    if (o.length < 40 || o.length > 260 || /^[-•*]|["“”¿?]/.test(o)) continue; // ni ejemplos ni preguntas
    return { tipo: "dato", valor: `${m[1]}${m[2]!.trim() === "%" ? "%" : ""}`, texto: o.trim() };
  }
  return null;
}

const FIJOS = ["dueñosdenegocio", "automatizacion", "inteligenciaartificial", "pymesmexico", "owneria"];

const hashtag = (s: string) =>
  s
    .toLowerCase()
    .replace(/[áàä]/g, "a")
    .replace(/[éèë]/g, "e")
    .replace(/[íìï]/g, "i")
    .replace(/[óòö]/g, "o")
    .replace(/[úùü]/g, "u")
    .replace(/[^a-z0-9ñ]/g, "");

export function textoPost(a: Articulo, ls: Lamina[]) {
  const puntos = ls.filter((l) => l.tipo === "punto").map((l) => `→ ${l.titulo}`);
  const tags = [...new Set([...a.palabrasClave.map(hashtag), ...FIJOS])]
    .filter((t) => t.length > 2 && t.length < 30)
    .slice(0, 6)
    .map((t) => `#${t}`);
  return [
    a.titulo,
    "",
    a.descripcion,
    "",
    ...puntos,
    "",
    `Completo en owneria.mx/blog/${a.slug}`,
    "",
    tags.join(" "),
  ].join("\n");
}
