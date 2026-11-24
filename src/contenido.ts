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
};

export type Lamina =
  | { tipo: "portada"; categoria: string; titulo: string }
  | { tipo: "punto"; n: number; titulo: string; texto: string }
  | { tipo: "cierre"; titulo: string };

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

  return [
    { tipo: "portada", categoria: a.categoria, titulo: a.titulo },
    ...puntos,
    { tipo: "cierre", titulo: "¿Quieres aplicarlo en tu negocio?" },
  ];
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
    .slice(0, 10)
    .map((t) => `#${t}`);
  return [
    a.titulo,
    "",
    a.descripcion,
    "",
    ...puntos,
    "",
    `Artículo completo en owneria.mx/blog/${a.slug} (enlace en la bio).`,
    "",
    tags.join(" "),
  ].join("\n");
}
