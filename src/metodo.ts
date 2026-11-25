// Serie «Método OWNER»: 6 carruseles que en la cuadrícula del perfil leen O W N / E R + portada.
// Instagram pone lo más nuevo arriba a la izquierda, así que se publican al revés: portada, R, E, N, W, O.
//   bun src/metodo.ts            → dibuja en img/metodo-owner/ y arma muestras/metodo-perfil.jpg (vista previa)
//   bun src/metodo.ts publicar   → publica las 6 en orden (corre en GitHub Actions: .github/workflows/metodo.yml)
// Textos tomados de app/src/components/owneria/Metodo.tsx (constante METODO) del sitio.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { b64, FUENTES, h, img, P, wordmark, type Nodo } from "./render";

type Fase = { letra: string; en: string; es: string; d: string; entregable: string; puntos: string[]; texto: string };

export const METODO: Fase[] = [
  {
    letra: "O",
    en: "Observe",
    es: "Observar",
    d: "Diagnóstico de tu operación: quién hace qué, con qué herramienta y dónde se pierde tiempo o dinero.",
    entregable: "Diagnóstico escrito con hallazgos",
    puntos: [
      "Entrevistas contigo y con tu equipo.",
      "Inventario de sistemas, archivos y accesos: banco, SAT, ERP, hojas de cálculo, WhatsApp.",
      "Lo que se sigue haciendo a mano y lo que solo sabe una persona.",
    ],
    texto:
      "Antes de proponer cualquier herramienta, hay que ver cómo funciona tu negocio hoy: quién hace qué, con qué sistema y dónde se pierde tiempo o dinero.\n\nEntrevistas contigo y con tu equipo, inventario de sistemas y accesos (banco, SAT, ERP, hojas de cálculo, WhatsApp) y todo lo que se sigue haciendo a mano o que solo sabe una persona.",
  },
  {
    letra: "W",
    en: "Weigh",
    es: "Priorizar",
    d: "Ordeno lo que encontré por impacto y esfuerzo, y decidimos juntos qué va primero.",
    entregable: "Hoja de ruta por etapas",
    puntos: [
      "Impacto en dinero, tiempo y riesgo de cada hallazgo.",
      "Victorias rápidas primero, proyectos de fondo después.",
      "Cada etapa con alcance y costo claros antes de empezar.",
    ],
    texto:
      "No todo se arregla al mismo tiempo. Cada hallazgo se pesa por su impacto en dinero, tiempo y riesgo contra el esfuerzo que cuesta, y decidimos juntos qué va primero.\n\nVictorias rápidas primero, proyectos de fondo después, y cada etapa con alcance y costo claros antes de empezar.",
  },
  {
    letra: "N",
    en: "Normalize",
    es: "Ordenar",
    d: "Antes de meter tecnología, ordeno el proceso. Automatizar un desorden solo lo hace más rápido.",
    entregable: "Procesos y reglas del negocio documentados",
    puntos: [
      "Un solo flujo por proceso, con responsables claros.",
      "Las reglas que hoy viven en la cabeza de alguien, por escrito.",
      "Qué dato manda en cada paso y de dónde sale.",
    ],
    texto:
      "Automatizar un desorden solo lo hace más rápido. Por eso, antes de meter tecnología, se ordena el proceso.\n\nUn solo flujo por proceso con responsables claros, las reglas que hoy viven en la cabeza de alguien por escrito, y qué dato manda en cada paso y de dónde sale.",
  },
  {
    letra: "E",
    en: "Engineer",
    es: "Construir",
    d: "Conecto lo que tiene API o MCP y construyo lo que no existe. Por etapas, sin parar tu operación.",
    entregable: "Sistema funcionando, tuyo",
    puntos: [
      "Integraciones con banco, SAT, ERP, marketplaces y sucursales.",
      "Automatizaciones, agentes de IA y avisos por WhatsApp o correo.",
      "Sensores y máquinas conectadas cuando el negocio lo pide.",
    ],
    texto:
      "Con el proceso en orden, toca construir: conectar lo que ya tiene API o MCP y hacer lo que no existe. Por etapas y sin parar tu operación.\n\nIntegraciones con banco, SAT, ERP, marketplaces y sucursales; automatizaciones, agentes de IA y avisos por WhatsApp o correo; sensores y máquinas conectadas cuando el negocio lo pide.",
  },
  {
    letra: "R",
    en: "Run",
    es: "Operar",
    d: "Te entrego el control: tableros, alertas y acompañamiento. Medimos con tus datos y ajustamos.",
    entregable: "Panel del dueño y revisión periódica",
    puntos: [
      "Tu negocio en el celular, actualizado.",
      "Alertas cuando algo se sale de lo normal, antes de que te enteres tarde.",
      "Ajustes y siguiente etapa con base en lo que ya se midió.",
    ],
    texto:
      "El sistema no sirve si no lo usas. Te entrego el control: tableros, alertas y acompañamiento, medido con tus datos.\n\nTu negocio en el celular y actualizado, alertas cuando algo se sale de lo normal antes de que te enteres tarde, y ajustes y siguiente etapa con base en lo que ya se midió.",
  },
];

const TAGS = "#metodoowner #dueñosdenegocio #automatizacion #inteligenciaartificial #pymesmexico #owneria";

const W = 1080;
const H = 1350;
const PAD = 88;
const p = P.noche;
const AZUL = "#2563EB";
const CLARO = "#60A5FA";
const Y_LINEA = 1060; // línea continua: misma altura en todas las láminas y portadas

type Lam =
  | { tipo: "letra"; fase: number }
  | { tipo: "fase"; fase: number }
  | { tipo: "incluye"; fase: number }
  | { tipo: "entregable"; fase: number }
  | { tipo: "cierre"; fase: number }
  | { tipo: "portada" }
  | { tipo: "mapa" }
  | { tipo: "cierreMetodo" };

/** Línea recta con nodos: cruza de lámina a lámina y de portada a portada en la cuadrícula. */
function linea(nodoCentro: boolean) {
  const nodo = `<circle cx="540" cy="${Y_LINEA}" r="17" fill="${p.fondo}" stroke="${CLARO}" stroke-width="5"/><circle cx="540" cy="${Y_LINEA}" r="6" fill="${CLARO}"/>`;
  return img(
    b64(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><line x1="0" y1="${Y_LINEA}" x2="${W}" y2="${Y_LINEA}" stroke="${CLARO}" stroke-opacity="0.5" stroke-width="3"/>${
        nodoCentro ? nodo : ""
      }</svg>`,
    ),
    W,
    H,
    { position: "absolute", left: 0, top: 0 },
  );
}

const etiqueta = (t: string, color = CLARO) =>
  h("div", { alignItems: "center", gap: 18, fontSize: 26, fontWeight: 500, letterSpacing: 4, color }, h("div", { width: 56, height: 3, background: color }), t);

const CHECK = '<path d="M5 12.5l4.5 4.5L19 7.5"/>';
const FLECHA = '<path d="M4 12h16M14 6l6 6-6 6"/>';
const icono = (path: string, t: number, color = CLARO) =>
  img(
    b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`),
    t,
    t,
  );

/** Las cinco letras en fila; la fase actual en azul claro. */
const fila = (activa: number | null, tam: number) =>
  h(
    "div",
    { gap: tam * 0.12, alignItems: "flex-end" },
    ...METODO.map((f, k) =>
      h("div", { fontSize: tam, fontWeight: 300, lineHeight: 1, letterSpacing: -1, color: activa === null || k === activa ? CLARO : "rgba(255,255,255,0.22)" }, f.letra),
    ),
  );

/** Marco común: fondo noche, línea, cabecera (marca + avance) y pie. */
function marco(i: number, total: number, fondo: Nodo[], contenido: Nodo, pie: Nodo[], nodo = false, cabecera?: Nodo) {
  return h(
    "div",
    { width: W, height: H, position: "relative", background: p.fondo, fontFamily: "Poppins", color: p.texto, overflow: "hidden" },
    h("div", {
      position: "absolute",
      left: 0,
      top: 0,
      width: W,
      height: H,
      backgroundImage: "radial-gradient(circle at 50% 38%, rgba(37,99,235,0.30), rgba(12,14,20,0) 58%)",
    }),
    ...fondo,
    linea(nodo),
    h(
      "div",
      { position: "absolute", left: 0, top: 0, width: W, height: H, flexDirection: "column", padding: `80px ${PAD}px 76px` },
      cabecera ??
        h(
          "div",
          { justifyContent: "space-between", alignItems: "center" },
          img(wordmark(p), 210, Math.round((210 * 140) / 559)),
          h(
            "div",
            { gap: 8, alignItems: "center" },
            ...Array.from({ length: total }, (_, k) => h("div", { width: k === i ? 46 : 14, height: 8, borderRadius: 8, background: k === i ? CLARO : p.linea })),
          ),
        ),
      h("div", { flex: 1, flexDirection: "column", justifyContent: "center", paddingBottom: 230 }, contenido),
      h("div", { justifyContent: "space-between", alignItems: "center", fontSize: 26, color: p.tenue }, ...pie),
    ),
  );
}

const num = (k: number) => String(k + 1).padStart(2, "0");

function arbol(l: Lam, i: number, total: number): Nodo {
  if (l.tipo === "letra") {
    const f = METODO[l.fase]!;
    // Portada de la letra: misma caja, tamaño y alineación en las cinco para que la cuadrícula lea OWNER.
    return h(
      "div",
      { width: W, height: H, position: "relative", background: p.fondo, fontFamily: "Poppins", color: p.texto, overflow: "hidden" },
      h("div", {
        position: "absolute",
        left: 0,
        top: 0,
        width: W,
        height: H,
        backgroundImage: "radial-gradient(circle at 50% 42%, rgba(37,99,235,0.34), rgba(12,14,20,0) 60%)",
      }),
      linea(true),
      h(
        "div",
        { position: "absolute", left: 0, top: 70, width: W, height: 960, alignItems: "center", justifyContent: "center", fontSize: 860, fontWeight: 300, lineHeight: 1, color: p.texto },
        f.letra,
      ),
      h(
        "div",
        { position: "absolute", left: 0, top: 0, width: W, padding: `80px ${PAD}px`, justifyContent: "space-between", fontSize: 26, fontWeight: 500, letterSpacing: 4, color: p.tenue },
        h("div", {}, "MÉTODO OWNER"),
        h("div", {}, `${num(l.fase)} / 05`),
      ),
      h(
        "div",
        { position: "absolute", left: 0, top: Y_LINEA + 50, width: W, flexDirection: "column", alignItems: "center" },
        h("div", { fontSize: 30, fontWeight: 500, letterSpacing: 6, color: CLARO }, f.en.toUpperCase()),
        h("div", { marginTop: 6, fontSize: 52, fontWeight: 300, color: p.texto }, f.es),
      ),
    );
  }

  if (l.tipo === "portada") {
    return h(
      "div",
      { width: W, height: H, position: "relative", background: p.fondo, fontFamily: "Poppins", color: p.texto, overflow: "hidden" },
      h("div", {
        position: "absolute",
        left: 0,
        top: 0,
        width: W,
        height: H,
        backgroundImage: "radial-gradient(circle at 50% 42%, rgba(37,99,235,0.34), rgba(12,14,20,0) 60%)",
      }),
      linea(true),
      h(
        "div",
        { position: "absolute", left: 0, top: 0, width: W, padding: `80px ${PAD}px`, justifyContent: "space-between", alignItems: "center" },
        img(wordmark(p), 210, Math.round((210 * 140) / 559)),
        h("div", { fontSize: 26, fontWeight: 500, letterSpacing: 4, color: p.tenue }, "@owneria.mx"),
      ),
      h(
        "div",
        { position: "absolute", left: 0, top: 250, width: W, flexDirection: "column", alignItems: "center" },
        h("div", { fontSize: 30, fontWeight: 500, letterSpacing: 8, color: CLARO }, "MÉTODO"),
        h("div", { marginTop: 10, fontSize: 215, fontWeight: 300, lineHeight: 1, letterSpacing: -2, color: p.texto }, "OWNER"),
        h(
          "div",
          { marginTop: 70, flexDirection: "column", alignItems: "center", fontSize: 78, fontWeight: 300, lineHeight: 1.1, letterSpacing: -2 },
          h("div", {}, "Recupera el mando"),
          h("div", { color: CLARO, fontWeight: 400 }, "de tu negocio."),
        ),
      ),
      h(
        "div",
        { position: "absolute", left: 0, top: Y_LINEA + 50, width: W, flexDirection: "column", alignItems: "center" },
        h("div", { fontSize: 30, fontWeight: 500, letterSpacing: 6, color: CLARO }, "5 FASES"),
        h("div", { marginTop: 6, fontSize: 52, fontWeight: 300, color: p.texto }, "Desliza"),
      ),
    );
  }

  if (l.tipo === "fase") {
    const f = METODO[l.fase]!;
    return marco(
      i,
      total,
      [h("div", { position: "absolute", right: -30, top: 90, fontSize: 900, fontWeight: 300, lineHeight: 1, color: "rgba(255,255,255,0.05)" }, f.letra)],
      h(
        "div",
        { flexDirection: "column" },
        etiqueta(`FASE ${num(l.fase)} DE 05`),
        h("div", { marginTop: 30, fontSize: 150, fontWeight: 300, lineHeight: 1, letterSpacing: -5, color: CLARO }, f.en),
        h("div", { marginTop: 10, fontSize: 84, fontWeight: 400, lineHeight: 1.1, letterSpacing: -2 }, f.es),
        h("div", { marginTop: 44, fontSize: 42, fontWeight: 300, lineHeight: 1.42, color: p.suave }, f.d),
      ),
      [h("div", {}, "@owneria.mx"), h("div", { alignItems: "center", gap: 12 }, "Desliza", icono(FLECHA, 28, p.tenue))],
    );
  }

  if (l.tipo === "incluye") {
    const f = METODO[l.fase]!;
    return marco(
      i,
      total,
      [],
      h(
        "div",
        { flexDirection: "column" },
        etiqueta("QUÉ INCLUYE"),
        h("div", { marginTop: 30, fontSize: 70, fontWeight: 500, lineHeight: 1.1, letterSpacing: -2 }, `${f.letra} · ${f.es}`),
        h(
          "div",
          { flexDirection: "column", marginTop: 50, gap: 30 },
          ...f.puntos.map((t) =>
            h(
              "div",
              { gap: 22, alignItems: "flex-start" },
              h("div", { width: 48, height: 48, borderRadius: 48, background: "rgba(96,165,250,0.14)", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 4 }, icono(CHECK, 28)),
              h("div", { fontSize: 39, fontWeight: 300, lineHeight: 1.38, color: p.suave }, t),
            ),
          ),
        ),
      ),
      [h("div", {}, "@owneria.mx"), h("div", {}, `${num(i)} / ${num(total - 1)}`)],
    );
  }

  if (l.tipo === "entregable") {
    const f = METODO[l.fase]!;
    return marco(
      i,
      total,
      [
        // Aro del logo como sello de «lo que te llevas».
        img(
          b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="8"/></svg>`),
          1100,
          1100,
          { position: "absolute", left: 380, top: -260 },
        ),
      ],
      h(
        "div",
        { flexDirection: "column" },
        etiqueta("ENTREGABLE"),
        h("div", { marginTop: 36, fontSize: f.entregable.length > 30 ? 92 : 108, fontWeight: 300, lineHeight: 1.08, letterSpacing: -3 }, f.entregable),
        h("div", { marginTop: 56, fontSize: 34, fontWeight: 300, lineHeight: 1.45, color: p.tenue }, `Lo que te llevas al cerrar ${f.en} · ${f.es}.`),
      ),
      [h("div", {}, "@owneria.mx"), h("div", {}, `${num(i)} / ${num(total - 1)}`)],
    );
  }

  if (l.tipo === "mapa") {
    return marco(
      i,
      total,
      [],
      h(
        "div",
        { flexDirection: "column" },
        etiqueta("LAS 5 FASES"),
        h(
          "div",
          { flexDirection: "column", marginTop: 40, gap: 22 },
          ...METODO.map((f) =>
            h(
              "div",
              { alignItems: "center", gap: 34 },
              h("div", { width: 96, fontSize: 96, fontWeight: 300, lineHeight: 1, color: CLARO, justifyContent: "center" }, f.letra),
              h(
                "div",
                { flexDirection: "column" },
                h("div", { fontSize: 44, fontWeight: 400, lineHeight: 1.1 }, `${f.en} · ${f.es}`),
                h("div", { marginTop: 4, fontSize: 28, fontWeight: 300, color: p.tenue }, f.entregable),
              ),
            ),
          ),
        ),
      ),
      [h("div", {}, "@owneria.mx"), h("div", { alignItems: "center", gap: 12 }, "Desliza", icono(FLECHA, 28, p.tenue))],
    );
  }

  // Cierre: lleva a owneria.mx/metodo.
  const activa = l.tipo === "cierre" ? l.fase : null;
  return marco(
    i,
    total,
    [],
    h(
      "div",
      { flexDirection: "column" },
      fila(activa, 150),
      h(
        "div",
        { marginTop: 50, flexDirection: "column", fontSize: 76, fontWeight: 300, lineHeight: 1.1, letterSpacing: -2 },
        h("div", {}, "Recupera el mando"),
        h("div", { color: CLARO, fontWeight: 400 }, "de tu negocio."),
      ),
      h(
        "div",
        { marginTop: 56, alignSelf: "flex-start", alignItems: "center", gap: 16, background: AZUL, borderRadius: 999, padding: "22px 40px", fontSize: 36, fontWeight: 500 },
        "owneria.mx/metodo",
        icono(FLECHA, 36, "#FFFFFF"),
      ),
    ),
    [h("div", {}, "Tu negocio conectado. Tú al mando."), h("div", {}, "@owneria.mx")],
  );
}

type Pieza = { carpeta: string; laminas: Lam[]; texto: string };

export const PIEZAS: Pieza[] = [
  ...METODO.map((f, k): Pieza => ({
    carpeta: `${num(k)}-${f.letra.toLowerCase()}`,
    laminas: [
      { tipo: "letra", fase: k },
      { tipo: "fase", fase: k },
      { tipo: "incluye", fase: k },
      { tipo: "entregable", fase: k },
      { tipo: "cierre", fase: k },
    ],
    texto: [
      `${f.letra} de OWNER · ${f.en} (${f.es})`,
      "",
      f.texto,
      "",
      `Entregable: ${f.entregable}.`,
      "",
      `Fase ${k + 1} de 5 del Método OWNER. El método completo en owneria.mx/metodo`,
      "",
      TAGS,
    ].join("\n"),
  })),
  {
    carpeta: "06-metodo",
    laminas: [{ tipo: "portada" }, { tipo: "mapa" }, { tipo: "cierreMetodo" }],
    texto: [
      "Método OWNER: recupera el mando de tu negocio.",
      "",
      "Cinco fases, en orden, para pasar de una operación que depende de ti a un negocio conectado que puedes ver y dirigir desde el celular.",
      "",
      ...METODO.map((f) => `${f.letra} · ${f.en} (${f.es}): ${f.entregable.toLowerCase()}.`),
      "",
      "Primero se entiende, luego se prioriza, se ordena, se construye y se opera. Cada fase deja algo tuyo.",
      "",
      "Cada letra tiene su publicación en el perfil. El método completo en owneria.mx/metodo",
      "",
      TAGS,
    ].join("\n"),
  },
];

// Orden de publicación: la portada primero (queda abajo a la derecha), la O al final (arriba a la izquierda).
export const ORDEN = ["06-metodo", "05-r", "04-e", "03-n", "02-w", "01-o"];

const RAIZ = join(import.meta.dir, "..");
const BASE = join(RAIZ, "img", "metodo-owner");

async function dibujar() {
  for (const pz of PIEZAS) {
    const dir = join(BASE, pz.carpeta);
    mkdirSync(dir, { recursive: true });
    for (const [i, l] of pz.laminas.entries()) {
      const svg = await satori(arbol(l, i, pz.laminas.length) as never, { width: W, height: H, fonts: FUENTES });
      const png = new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng();
      writeFileSync(join(dir, `${num(i)}.jpg`), await sharp(png).jpeg({ quality: 90, mozjpeg: true }).toBuffer());
    }
    writeFileSync(join(dir, "texto.txt"), pz.texto);
  }
  // Vista previa del perfil: 3 columnas, celdas 3:4 (recorte centrado, como las muestra Instagram).
  const M = join(RAIZ, "muestras");
  mkdirSync(M, { recursive: true });
  const cw = 360, ch = 480, g = 4;
  const enCuadricula = [...ORDEN].reverse(); // lo más nuevo primero
  const celdas = await Promise.all(
    enCuadricula.map(async (c, i) => ({
      input: await sharp(join(BASE, c, "01.jpg")).extract({ left: 34, top: 0, width: 1012, height: 1350 }).resize(cw, ch).toBuffer(),
      left: (i % 3) * (cw + g),
      top: Math.floor(i / 3) * (ch + g),
    })),
  );
  await sharp({ create: { width: cw * 3 + g * 2, height: ch * 2 + g, channels: 3, background: "#ffffff" } })
    .composite(celdas)
    .jpeg({ quality: 90 })
    .toFile(join(M, "metodo-perfil.jpg"));
  // Hoja de cada carrusel.
  const w = 360, hh = 450;
  for (const pz of PIEZAS) {
    const comp = await Promise.all(
      pz.laminas.map(async (_, i) => ({ input: await sharp(join(BASE, pz.carpeta, `${num(i)}.jpg`)).resize(w, hh).toBuffer(), left: i * (w + g), top: 0 })),
    );
    await sharp({ create: { width: 5 * (w + g) - g, height: hh, channels: 3, background: "#222222" } })
      .composite(comp)
      .jpeg({ quality: 88 })
      .toFile(join(M, `metodo-hoja-${pz.carpeta}.jpg`));
  }
  console.log("Listo: img/metodo-owner/ y muestras/metodo-perfil.jpg");
}

// ---------- Publicación (GitHub Actions, con IG_USER_ID e IG_TOKEN) ----------
const API = process.env["IG_API"] || "https://graph.facebook.com/v23.0";
const RAW = process.env["RAW_BASE"] || "https://leonwlondon.github.io/owneria-instagram";
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function ig(ruta: string, datos?: Record<string, string>) {
  const token = process.env["IG_TOKEN"];
  if (!token) throw new Error("Falta IG_TOKEN");
  const r = datos
    ? await fetch(`${API}/${ruta}`, { method: "POST", body: new URLSearchParams({ ...datos, access_token: token }) })
    : await fetch(`${API}/${ruta}${ruta.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(token)}`);
  const j = (await r.json()) as Record<string, unknown>;
  if (!r.ok || j["error"]) throw new Error(`Instagram ${ruta}: ${JSON.stringify(j["error"] ?? j)}`);
  return j;
}

async function listo(id: string) {
  for (let i = 0; i < 40; i++) {
    const s = await ig(`${id}?fields=status_code`);
    if (s["status_code"] === "FINISHED") return;
    if (s["status_code"] === "ERROR" || s["status_code"] === "EXPIRED") throw new Error(`Contenedor ${id}: ${s["status_code"]}`);
    await espera(5000);
  }
  throw new Error(`Contenedor ${id} no terminó de procesarse`);
}

async function publicar() {
  const usuario = process.env["IG_USER_ID"];
  if (!usuario) throw new Error("Falta IG_USER_ID");
  const ARCH = join(RAIZ, "metodo-publicado.json");
  const hechos: Record<string, { media: string; fecha: string }> = existsSync(ARCH) ? JSON.parse(readFileSync(ARCH, "utf8")) : {};
  for (const c of ORDEN) {
    if (hechos[c]) {
      console.log(`${c}: ya publicado (${hechos[c].media})`);
      continue;
    }
    const pz = PIEZAS.find((x) => x.carpeta === c)!;
    const urls = pz.laminas.map((_, i) => `${RAW}/img/metodo-owner/${c}/${num(i)}.jpg`);
    for (const u of urls) {
      const r = await fetch(u, { method: "HEAD" });
      if (!r.ok) throw new Error(`No está en GitHub Pages: ${u}`);
    }
    const hijos: string[] = [];
    for (const u of urls) hijos.push(String((await ig(`${usuario}/media`, { image_url: u, is_carousel_item: "true" }))["id"]));
    const id = String((await ig(`${usuario}/media`, { media_type: "CAROUSEL", children: hijos.join(","), caption: pz.texto }))["id"]);
    await listo(id);
    const media = String((await ig(`${usuario}/media_publish`, { creation_id: id }))["id"]);
    hechos[c] = { media, fecha: new Date().toISOString() };
    writeFileSync(ARCH, `${JSON.stringify(hechos, null, 2)}\n`);
    console.log(`Publicado ${c} → ${media}`);
    // Un minuto entre cada una para que Instagram respete el orden.
    if (c !== ORDEN[ORDEN.length - 1]) await espera(60_000);
  }
}

if (import.meta.main) {
  if (process.argv[2] === "publicar") await publicar();
  else await dibujar();
}
