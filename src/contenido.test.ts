import { expect, test } from "bun:test";
import { laminas, recortar, textoPlano, textoPost, type Articulo } from "./contenido";

const a: Articulo = {
  slug: "prueba",
  titulo: "Título de prueba",
  descripcion: "Descripción.",
  categoria: "Apps",
  palabrasClave: ["automatizar negocio", "Automatización"],
  publicado: "2026-11-20T13:00:00Z",
  cuerpo: `Intro.\n\n## Primero\n\nHaz esto **ya** con [Owneria](/#x):\n\n1. **Uno.** a\n2. Dos\n3. Tres\n4. Cuatro\n\n## Segundo\n\nTexto *open rate* aquí.\n\n## Preguntas frecuentes\n\n### ¿Algo?\n\nSí.`,
};

test("portada, puntos sin preguntas frecuentes y cierre", () => {
  const ls = laminas(a);
  expect(ls.map((l) => l.tipo)).toEqual(["portada", "punto", "punto", "cierre"]);
  expect(ls[1]).toMatchObject({ titulo: "Primero", texto: "• Uno. a\n• Dos\n• Tres" });
  expect(ls[2]).toMatchObject({ texto: "Texto open rate aquí." });
});

test("limpia markdown y recorta en oración", () => {
  expect(textoPlano("**a** [b](c) ::figura 1::")).toBe("a b");
  expect(recortar("Una frase larga aquí. Otra frase que no cabe en el límite.", 30)).toBe("Una frase larga aquí.");
});

test("texto del post con hashtags sin acentos y sin repetir", () => {
  const t = textoPost(a, laminas(a));
  expect(t).toContain("#automatizarnegocio #automatizacion #dueñosdenegocio");
  expect(t.match(/#automatizacion\b/g)?.length).toBe(1);
  expect(t).toContain("owneria.mx/blog/prueba");
});
