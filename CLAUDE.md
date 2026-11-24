# Owneria · Instagram diario (@owneria.mx)

Publica cada día en Instagram un carrusel hecho del artículo del blog de owneria.mx. Sin aprobación: automático.

- **Código:** esta carpeta → GitHub `leonwlondon/owneria-instagram`. Corre en GitHub Actions (`.github/workflows/diario.yml`), diario 14:30 UTC (8:30 CDMX), después del blog (7:00).
- **Flujo:** `src/diario.ts` lee `https://owneria.mx/api/public/articulos` (ruta del sitio, solo artículos, sin noticias) → elige el más nuevo sin publicar y el más viejo sin publicar (máx. 2 al día, así se ponen al día los anteriores) → `src/contenido.ts` arma las láminas (portada, hasta 5 secciones `##`, cierre) y el texto con hashtags → `src/render.ts` dibuja JPEG 1080×1350 (satori + resvg + sharp, Poppins y logo en `fuentes/` y `marca/`) → sube `img/<slug>/` al repo → Instagram las baja de raw.githubusercontent.com (por eso el repo debe ser público) → carrusel con la Graph API → anota en `publicados.json`.
- **Secretos (GitHub Actions, nunca en el código):** `IG_USER_ID` (cuenta de Instagram profesional) e `IG_TOKEN` (token de página de larga duración con `instagram_content_publish`). Opcional `IG_API` (por omisión `https://graph.facebook.com/v23.0`).
- **Probar sin publicar:** `PRUEBA=1 bun src/diario.ts` (o «Run workflow» con «Solo dibujar»). Muestras locales: `bun src/muestra.ts 10` → `muestras/`.
- **Si falla:** la Action queda en rojo y GitHub avisa por correo. Volver a correrla es seguro: lo publicado ya está en `publicados.json`.
- **Reglas:** todo sale del artículo publicado; no inventar cifras ni casos.
