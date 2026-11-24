// Reel animado (1080×1920, 30 fps, ~16 s) hecho del artículo: tipografía en movimiento, el aro del logo
// que se dibuja, los puntos clave uno a uno, el dato real contando hacia arriba (o el mapa armándose)
// y cierre con la marca. Cada cuadro se dibuja con satori + resvg y ffmpeg arma el MP4.
import { spawn } from "node:child_process";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import ffmpeg from "ffmpeg-static";
import sharp from "sharp";
import { recortar, type Lamina } from "./contenido";
import { b64, FUENTES, h, img, P, partir, wordmark, type Nodo, type Paleta, type Tema } from "./render";

const W = 1080;
const H = 1920;
const FPS = 30;

// Curvas de movimiento.
const lim = (x: number) => Math.min(1, Math.max(0, x));
const expo = (x: number) => (x >= 1 ? 1 : 1 - 2 ** (-10 * x));
const tramo = (t: number, a: number, b: number) => expo(lim((t - a) / (b - a)));
/** Aparece entre a y a+dur, se va entre z-dur y z. */
const vida = (t: number, a: number, z: number, dur = 0.5) => Math.min(tramo(t, a, a + dur), 1 - lim((t - (z - dur * 0.6)) / (dur * 0.6)));

type Escena = { a: number; z: number; dibuja: (t: number) => Nodo };

function aro(p: Paleta, d: number, avance: number, conPunto: number, color = p.texto, grosor = 7) {
  const c = 2 * Math.PI * 40;
  return img(
    b64(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="${color}" stroke-width="${grosor}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - avance)}" transform="rotate(-90 50 50)"/><circle cx="50" cy="50" r="${11 * conPunto}" fill="${p.punto === p.fondo ? p.texto : p.punto}"/></svg>`,
    ),
    d,
    d,
  );
}

/** Palabras que suben una tras otra. */
function palabras(texto: string, t: number, inicio: number, estilo: Record<string, unknown>, color?: string) {
  return texto.split(" ").map((w, k) => {
    const v = tramo(t, inicio + k * 0.07, inicio + k * 0.07 + 0.6);
    return h("div", { opacity: v, transform: `translateY(${(1 - v) * 60}px)`, marginRight: "0.26em", color, ...estilo }, w);
  });
}

function base(p: Paleta, t: number, hijos: Nodo[]) {
  // El brillo de fondo se mueve despacio todo el video.
  const gx = 70 + Math.sin(t * 0.4) * 18;
  const gy = 12 + Math.cos(t * 0.3) * 8;
  return h(
    "div",
    { width: W, height: H, position: "relative", background: p.fondo, fontFamily: "Poppins", color: p.texto, overflow: "hidden" },
    h("div", {
      position: "absolute",
      left: 0,
      top: 0,
      width: W,
      height: H,
      backgroundImage: p.capas.replace("circle at 88% 6%", `circle at ${gx}% ${gy}%`).replace("circle at 90% 0%", `circle at ${gx}% ${gy}%`).replace("circle at 90% 4%", `circle at ${gx}% ${gy}%`),
    }),
    ...hijos,
    h("div", { position: "absolute", left: 90, top: 120 }, img(wordmark(p), 230, Math.round((230 * 140) / 559))),
    h("div", { position: "absolute", left: 90, bottom: 150, fontSize: 30, color: p.tenue }, "@owneria.mx"),
  );
}

const capa = (hijos: Nodo[] | Nodo, estilo: Record<string, unknown> = {}) =>
  h("div", { position: "absolute", left: 90, right: 90, top: 0, bottom: 0, flexDirection: "column", justifyContent: "center", ...estilo }, ...(Array.isArray(hijos) ? hijos : [hijos]));

function escenas(ls: Lamina[], p: Paleta): Escena[] {
  const portada = ls.find((l) => l.tipo === "portada") as Extract<Lamina, { tipo: "portada" }>;
  const puntos = ls.filter((l) => l.tipo === "punto").slice(0, 3) as Extract<Lamina, { tipo: "punto" }>[];
  const dato = ls.find((l) => l.tipo === "dato") as Extract<Lamina, { tipo: "dato" }> | undefined;
  const mapa = ls.find((l) => l.tipo === "diagrama") as Extract<Lamina, { tipo: "diagrama" }> | undefined;
  const out: Escena[] = [];
  let t0 = 0;

  // 1 · Portada: el aro se dibuja y el título entra palabra por palabra.
  const [a, b] = partir(portada.titulo);
  const tamT = portada.titulo.length > 60 ? 84 : portada.titulo.length > 40 ? 96 : 110;
  out.push({
    a: 0,
    z: 3.6,
    dibuja: (t) =>
      h(
        "div",
        { width: W, height: H, position: "relative" },
        h("div", { position: "absolute", left: 520, top: -260, opacity: 0.18 }, aro(p, 900, tramo(t, 0, 1.6), 0)),
        capa([
          h(
            "div",
            { alignSelf: "flex-start", opacity: tramo(t, 0.1, 0.6), border: `2px solid ${p.acento}`, color: p.acento, borderRadius: 999, padding: "12px 28px", fontSize: 28, fontWeight: 500, letterSpacing: 3 },
            portada.categoria.toUpperCase(),
          ),
          h(
            "div",
            { marginTop: 50, flexWrap: "wrap", fontSize: tamT, fontWeight: 300, lineHeight: 1.08, letterSpacing: -3 },
            ...palabras(a, t, 0.3, {}),
            ...palabras(b, t, 0.3 + a.split(" ").length * 0.07, { fontWeight: 400 }, p.acento),
          ),
        ]),
      ),
  });
  t0 = 3.6;

  // 2 · Tres puntos clave.
  for (const pt of puntos) {
    const ini = t0;
    out.push({
      a: ini,
      z: ini + 3.2,
      dibuja: (t) => {
        const v = tramo(t, ini, ini + 0.7);
        return h(
          "div",
          { width: W, height: H, position: "relative" },
          h(
            "div",
            { position: "absolute", right: -60, top: 420, fontSize: 760, fontWeight: 500, letterSpacing: -50, color: p.aro, transform: `translateX(${(1 - v) * 300}px)` },
            String(pt.n).padStart(2, "0"),
          ),
          capa([
            h("div", { alignItems: "center", gap: 18, fontSize: 30, fontWeight: 500, letterSpacing: 5, color: p.acento, opacity: v }, h("div", { width: 70 * v, height: 4, background: p.acento }), `PUNTO ${String(pt.n).padStart(2, "0")}`),
            h("div", { marginTop: 40, flexWrap: "wrap", fontSize: pt.titulo.length > 45 ? 76 : 88, fontWeight: 500, lineHeight: 1.1, letterSpacing: -2 }, ...palabras(pt.titulo, t, ini + 0.15, {})),
            h(
              "div",
              { marginTop: 44, fontSize: 44, fontWeight: 300, lineHeight: 1.4, color: p.suave, opacity: tramo(t, ini + 0.9, ini + 1.5), transform: `translateY(${(1 - tramo(t, ini + 0.9, ini + 1.5)) * 30}px)` },
              recortar(pt.texto.replace(/^• /gm, "").split("\n")[0]!, 130),
            ),
          ]),
        );
      },
    });
    t0 += 3.2;
  }

  // 3 · El dato contando hacia arriba, o el mapa armándose nodo por nodo.
  if (dato) {
    const ini = t0;
    const n = Number(dato.valor.replace(/[^\d.]/g, ""));
    const suf = dato.valor.replace(/[\d.,]/g, "");
    out.push({
      a: ini,
      z: ini + 3.4,
      dibuja: (t) => {
        const v = tramo(t, ini + 0.2, ini + 2);
        const valor = Number.isInteger(n) ? Math.round(n * v) : (n * v).toFixed(1);
        return h(
          "div",
          { width: W, height: H, position: "relative" },
          h("div", { position: "absolute", left: 300, top: 360, opacity: 0.16 }, aro(p, 1100, v, 0)),
          capa([
            h("div", { fontSize: 30, fontWeight: 500, letterSpacing: 5, color: p.acento, opacity: tramo(t, ini, ini + 0.5) }, "EL DATO"),
            h("div", { fontSize: 460, fontWeight: 300, lineHeight: 1, letterSpacing: -24, color: p.acento }, `${valor}${suf}`),
            h("div", { marginTop: 30, flexWrap: "wrap", fontSize: 52, fontWeight: 300, lineHeight: 1.3 }, ...palabras(dato.texto, t, ini + 0.9, {})),
          ]),
        );
      },
    });
    t0 += 3.4;
  } else if (mapa) {
    const ini = t0;
    const n = mapa.nodos.length;
    out.push({
      a: ini,
      z: ini + 3.4,
      dibuja: (t) =>
        h(
          "div",
          { width: W, height: H, position: "relative" },
          capa([
            h("div", { fontSize: 30, fontWeight: 500, letterSpacing: 5, color: p.acento, opacity: tramo(t, ini, ini + 0.5) }, "EL MAPA"),
            h(
              "div",
              { flexDirection: "column", marginTop: 50, position: "relative" },
              h("div", { position: "absolute", left: 31, top: 36, width: 4, height: (n - 1) * 130 * tramo(t, ini + 0.2, ini + 0.2 + n * 0.3), background: p.acento }),
              ...mapa.nodos.map((x, k) => {
                const v = tramo(t, ini + 0.2 + k * 0.3, ini + 0.8 + k * 0.3);
                return h(
                  "div",
                  { alignItems: "center", gap: 36, height: 130, opacity: v, transform: `translateX(${(1 - v) * 80}px)` },
                  h("div", { width: 66, height: 66, borderRadius: 66, border: `6px solid ${p.acento}`, background: k === n - 1 ? p.acento : p.fondo, flexShrink: 0 }),
                  h("div", { fontSize: 58, fontWeight: k === n - 1 ? 500 : 300, letterSpacing: -1 }, x),
                );
              }),
            ),
          ]),
        ),
    });
    t0 += 3.4;
  }

  // 4 · Cierre: el aro se completa y aparece el punto.
  const ini = t0;
  out.push({
    a: ini,
    z: ini + 2.4,
    dibuja: (t) =>
      h(
        "div",
        { width: W, height: H, position: "relative" },
        capa(
          [
            aro(p, 260, tramo(t, ini, ini + 1.1), tramo(t, ini + 0.9, ini + 1.5), p.texto, 9),
            h("div", { marginTop: 60, fontSize: 40, fontWeight: 300, color: p.suave, opacity: tramo(t, ini + 1, ini + 1.6) }, "owneria.mx/blog"),
          ],
          { alignItems: "center" },
        ),
      ),
  });
  return out;
}

export async function dibujarReel(ls: Lamina[], tema: Tema, salida: string, portadaJpg: string) {
  const p = P[tema];
  const es = escenas(ls, p);
  const dur = es[es.length - 1]!.z;
  const cuadros = Math.round(dur * FPS);
  const proc = spawn(
    ffmpeg as unknown as string,
    [
      "-y", "-loglevel", "error",
      "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${W}x${H}`, "-framerate", String(FPS), "-i", "-",
      "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
      "-shortest", "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", salida,
    ],
    { stdio: ["pipe", "inherit", "inherit"] },
  );
  const fin = new Promise<void>((ok, mal) => proc.on("close", (c) => (c === 0 ? ok() : mal(new Error(`ffmpeg salió con ${c}`)))));

  let portada: Buffer | null = null;
  for (let f = 0; f < cuadros; f++) {
    const t = f / FPS;
    // Cada escena entra y sale con un desvanecido corto; se encima con la siguiente.
    const capas = es
      .filter((e) => t >= e.a - 0.01 && t <= e.z + 0.01)
      .map((e) => {
        const salida = 1 - lim((t - (e.z - 0.21)) / 0.21);
        const op = e === es[es.length - 1] ? tramo(t, e.a, e.a + 0.3) : e.a === 0 ? salida : vida(t, e.a, e.z, 0.35);
        return h("div", { position: "absolute", left: 0, top: 0, width: W, height: H, opacity: op }, e.dibuja(t));
      });
    const svg = await satori(base(p, t, capas) as never, { width: W, height: H, fonts: FUENTES });
    const r = new Resvg(svg).render();
    if (!proc.stdin.write(r.pixels)) await new Promise((ok) => proc.stdin.once("drain", ok));
    // Portada del reel: el título ya completo.
    if (Math.abs(t - 2.6) < 0.5 / FPS) portada = await sharp(r.asPng()).jpeg({ quality: 90 }).toBuffer();
  }
  proc.stdin.end();
  await fin;
  if (portada) await Bun.write(portadaJpg, portada);
  return { segundos: dur, cuadros };
}
