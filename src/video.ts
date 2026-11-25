// Videos con voz en off por artículo del blog: uno largo 16:9 (~3 min, YouTube) y uno corto 9:16 (≤29 s, Reels/Shorts).
// El guion sale del artículo publicado (no se inventa nada). Voz: `say` de macOS (Paulina, es_MX).
// Uso: bun src/video.ts <slug|número> [largo|corto|ambos] [tema]   → ../videos/<slug>/
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import ffmpeg from "ffmpeg-static";
import sharp from "sharp";
import { recortar, textoPlano, type Articulo } from "./contenido";
import { b64, FUENTES, h, img, P, wordmark, type Nodo, type Paleta, type Tema } from "./render";

// Voz: «es-MX-JorgeNeural» (Microsoft, en línea, con edge-tts) o una de macOS para `say` (p. ej. VOZ=Paulina).
const VOZ = process.env.VOZ ?? "es-MX-JorgeNeural";
const NEURAL = /^[a-z]{2}-[A-Z]{2}-/.test(VOZ);
const EDGE = process.env.EDGE_TTS ?? join(process.env.HOME ?? "", "Library/Python/3.9/bin/edge-tts");
const RITMO = 180;
const HZ = 48000;
const GAP = 0.3; // pausa entre oraciones
const ENTRE = 0.55; // pausa entre escenas
const TMP = join(tmpdir(), `owneria-video-${process.pid}`);
mkdirSync(TMP, { recursive: true });

const lim = (x: number) => Math.min(1, Math.max(0, x));
const expo = (x: number) => (x >= 1 ? 1 : 1 - 2 ** (-10 * x));
const tramo = (t: number, a: number, b: number) => expo(lim((t - a) / (b - a)));
const vida = (t: number, a: number, z: number, dur = 0.5) => Math.min(tramo(t, a, a + dur), 1 - lim((t - (z - dur * 0.6)) / (dur * 0.6)));

type Clip = { texto: string; pcm: Buffer; dur: number; t0: number };
type Escena = { a: number; z: number; dibuja: (t: number) => Nodo[] };
type Lienzo = { W: number; H: number; V: boolean };

// ---------- Voz ----------
const SIGLAS: [RegExp, string][] = [
  [/owneria\.mx\/blog/gi, "ounería punto eme equis, diagonal blog"],
  [/owneria\.mx/gi, "ounería punto eme equis"],
  [/\bOwneria\b/gi, "Ounería"],
  [/\bCRM\b/g, "ce erre eme"],
  [/\bERP\b/g, "e erre pe"],
  [/\bMCP\b/g, "eme ce pe"],
  [/\bCFDI\b/g, "ce efe de i"],
  [/\bKPIs?\b/g, "ka pe is"],
  [/\bIoT\b/g, "ai o ti"],
  [/\bp\. ?ej\./gi, "por ejemplo"],
  [/(\d)-([A-Z])\b/g, "$1 $2"],
  [/(\d)\/(\d)/g, "$1 $2"],
  [/[→•«»“”"]/g, " "],
  [/&/g, " y "],
];
const decir = (t: string) => SIGLAS.reduce((s, [de, a]) => s.replace(de, a), t);

const voces = new Map<string, { pcm: Buffer; dur: number }>();
function voz(texto: string, ritmo = RITMO) {
  const k = `${ritmo}|${texto}`;
  const ya = voces.get(k);
  if (ya) return ya;
  if (NEURAL) {
    // Voz neuronal de Microsoft (edge-tts): baja un MP3 por oración y se le quita el silencio de las orillas.
    const mp3 = join(TMP, `${voces.size}.mp3`);
    const pct = Math.round((ritmo / RITMO - 1) * 100);
    let ok = false;
    for (let k = 0; k < 4 && !ok; k++) {
      if (k) Bun.sleepSync(1500 * k);
      ok = spawnSync(EDGE, ["--voice", VOZ, `--rate=${pct >= 0 ? "+" : ""}${pct}%`, `--text=${decir(texto)}`, "--write-media", mp3]).status === 0;
    }
    if (!ok) throw new Error(`edge-tts falló con: ${texto}`);
    const corte = "silenceremove=start_periods=1:start_threshold=-50dB";
    const c = spawnSync(ffmpeg as unknown as string, ["-y", "-loglevel", "error", "-i", mp3, "-af", `${corte},areverse,${corte},areverse`, "-ac", "1", "-ar", String(HZ), "-f", "s16le", "-"], { maxBuffer: 1 << 28 });
    if (c.status !== 0 || !c.stdout.length) throw new Error(`ffmpeg no pudo leer la voz: ${c.stderr}`);
    const v = { pcm: c.stdout as Buffer, dur: c.stdout.length / 2 / HZ };
    voces.set(k, v);
    return v;
  }
  const f = join(TMP, `${voces.size}.wav`);
  const r = spawnSync("say", ["-v", VOZ, "-r", String(ritmo), "--file-format=WAVE", `--data-format=LEI16@${HZ}`, "-o", f], { input: decir(texto) });
  if (r.status !== 0) throw new Error(`say falló: ${r.stderr}`);
  const b = readFileSync(f);
  const i = b.indexOf("data");
  let n = b.readUInt32LE(i + 4);
  if (!n || i + 8 + n > b.length) n = b.length - i - 8;
  const v = { pcm: b.subarray(i + 8, i + 8 + n), dur: n / 2 / HZ };
  voces.set(k, v);
  return v;
}

function linea(grupos: string[][], ritmo = RITMO) {
  let t = 0.5;
  const es = grupos.map((g) => {
    const a = Math.max(0, t - 0.4);
    const clips: Clip[] = g.map((texto) => {
      const v = voz(texto, ritmo);
      const c = { texto, ...v, t0: t };
      t += v.dur + GAP;
      return c;
    });
    t += ENTRE;
    return { a, z: t - 0.25, clips };
  });
  return { es, fin: t };
}

function wav(clips: Clip[], dur: number, archivo: string) {
  const datos = Buffer.alloc(Math.ceil(dur * HZ) * 2);
  for (const c of clips) c.pcm.copy(datos, Math.round(c.t0 * HZ) * 2, 0, Math.min(c.pcm.length, datos.length - Math.round(c.t0 * HZ) * 2));
  const cab = Buffer.alloc(44);
  cab.write("RIFF", 0);
  cab.writeUInt32LE(36 + datos.length, 4);
  cab.write("WAVEfmt ", 8);
  cab.writeUInt32LE(16, 16);
  cab.writeUInt16LE(1, 20);
  cab.writeUInt16LE(1, 22);
  cab.writeUInt32LE(HZ, 24);
  cab.writeUInt32LE(HZ * 2, 28);
  cab.writeUInt16LE(2, 32);
  cab.writeUInt16LE(16, 34);
  cab.write("data", 36);
  cab.writeUInt32LE(datos.length, 40);
  writeFileSync(archivo, Buffer.concat([cab, datos]));
}

// ---------- Guion ----------
function oraciones(md: string) {
  return md
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l && !/^::figura/.test(l) && !/^#/.test(l) && !/^\|/.test(l) && !/^```/.test(l))
    .flatMap((l) => textoPlano(l.replace(/^([-*]|\d+\.) /, "").replace(/^> ?/, "")).split(/(?<=[.!?:])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])/))
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
}
function partes(a: Articulo) {
  const [ini, ...resto] = a.cuerpo.split(/^## +/m);
  const secs = resto
    .map((r) => {
      const corte = r.indexOf("\n");
      return { titulo: textoPlano(corte < 0 ? r : r.slice(0, corte)), oraciones: oraciones(corte < 0 ? "" : r.slice(corte)) };
    })
    .filter((s) => s.oraciones.length);
  return { intro: oraciones(ini ?? ""), secs };
}
const CIERRE = "Ese es el resumen. El artículo completo está en owneria.mx/blog";

// ---------- Dibujo ----------
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
function palabras(texto: string, t: number, inicio: number, estilo: Record<string, unknown> = {}, paso = 0.07) {
  return texto.split(" ").map((w, k) => {
    const v = tramo(t, inicio + k * paso, inicio + k * paso + 0.5);
    return h("div", { opacity: v, transform: `translateY(${Math.round((1 - v) * 50)}px)`, marginRight: "0.26em", ...estilo }, w);
  });
}
const lleno = (L: Lienzo, estilo: Record<string, unknown>, ...hijos: Nodo[]) =>
  h("div", { position: "absolute", left: 90, right: 90, top: 0, bottom: 0, flexDirection: "column", justifyContent: "center", ...estilo }, ...hijos);

function marco(L: Lienzo, p: Paleta, capas: Nodo[], avance: number, cuenta: string) {
  const { W, H, V } = L;
  return h(
    "div",
    { width: W, height: H, position: "relative", background: p.fondo, fontFamily: "Poppins", color: p.texto, overflow: "hidden" },
    h("div", { position: "absolute", left: 0, top: 0, width: W, height: H, backgroundImage: p.capas }),
    ...capas,
    h("div", { position: "absolute", left: 90, top: V ? 120 : 64 }, img(wordmark(p), V ? 230 : 210, Math.round(((V ? 230 : 210) * 140) / 559))),
    h("div", { position: "absolute", left: 90, bottom: V ? 150 : 56, fontSize: V ? 30 : 26, color: p.tenue }, V ? "@owneria.mx" : "owneria.mx/blog"),
    h("div", { position: "absolute", right: 90, bottom: V ? 150 : 56, fontSize: V ? 30 : 26, color: p.tenue }, cuenta),
    h("div", { position: "absolute", left: 0, bottom: 0, height: V ? 10 : 8, width: Math.round(W * avance), background: p.acento }),
  );
}

function escPortada(L: Lienzo, p: Paleta, a: Articulo, c: Clip): (t: number) => Nodo[] {
  const { H, V } = L;
  const tam = a.titulo.length > 62 ? (V ? 78 : 78) : V ? 94 : 94;
  return (t) => [
    lleno(
      L,
      { right: V ? 90 : 620 },
      h("div", { fontSize: V ? 34 : 30, letterSpacing: 6, color: p.acento, opacity: tramo(t, c.t0 - 0.4, c.t0 + 0.2), marginBottom: 36 }, a.categoria.toUpperCase()),
      h("div", { flexWrap: "wrap", fontSize: tam, fontWeight: 500, lineHeight: 1.12 }, ...palabras(a.titulo, t, c.t0)),
      ...(V ? [h("div", { marginTop: 90 }, aro(p, 300, tramo(t, c.t0, c.t0 + 1.8), tramo(t, c.t0 + 1.2, c.t0 + 1.9)))] : []),
    ),
    ...(V ? [] : [h("div", { position: "absolute", right: 150, top: (H - 420) / 2 }, aro(p, 420, tramo(t, c.t0, c.t0 + 1.8), tramo(t, c.t0 + 1.2, c.t0 + 1.9)))]),
  ];
}

function renglon(p: Paleta, c: Clip, t: number, fs: number, max: number) {
  const v = tramo(t, c.t0 - 0.15, c.t0 + 0.45);
  const activo = t >= c.t0 - 0.15 && t < c.t0 + c.dur + GAP;
  return h(
    "div",
    { opacity: v, transform: `translateY(${Math.round((1 - v) * 40)}px)`, marginBottom: Math.round(fs * 1.05), alignItems: "flex-start" },
    h("div", { width: 14, height: 14, borderRadius: 7, background: activo ? p.acento : p.linea, marginTop: Math.round(fs * 0.5), marginRight: 24, flexShrink: 0 }),
    h("div", { fontSize: fs, lineHeight: 1.4, color: activo ? p.texto : p.suave, flex: 1 }, recortar(c.texto, max)),
  );
}

/** 16:9: a la izquierda número y título de la sección; a la derecha las oraciones, una por una con la voz. */
function escSeccion(L: Lienzo, p: Paleta, num: string, etiqueta: string, titulo: string, tT: number, clips: Clip[]): (t: number) => Nodo[] {
  const total = clips.reduce((n, c) => n + Math.min(c.texto.length, 210), 0);
  const fs = total > 440 ? 30 : total > 320 ? 34 : 38;
  const fin = clips[clips.length - 1]!;
  return (t) => [
    h("div", { position: "absolute", right: -160, bottom: -260 }, aro(p, 760, tramo(t, clips[0]!.t0, fin.t0 + 1.5), 0, p.aro, 2)),
    h(
      "div",
      { position: "absolute", left: 90, width: 590, top: 0, bottom: 0, flexDirection: "column", justifyContent: "center" },
      num
        ? h("div", { fontSize: 140, fontWeight: 300, color: p.acento, lineHeight: 1, marginBottom: 24 }, num)
        : h("div", { fontSize: 28, letterSpacing: 5, color: p.acento, marginBottom: 28 }, etiqueta.toUpperCase()),
      h("div", { flexWrap: "wrap", fontSize: titulo.length > 60 ? 42 : 50, fontWeight: 500, lineHeight: 1.2 }, ...palabras(titulo, t, tT)),
    ),
    h("div", { position: "absolute", left: 740, top: 250, bottom: 250, width: 2, background: p.linea }),
    h("div", { position: "absolute", left: 800, right: 90, top: 0, bottom: 0, flexDirection: "column", justifyContent: "center" }, ...clips.map((c) => renglon(p, c, t, fs, 210))),
  ];
}

/** 9:16: una frase grande, palabra por palabra al ritmo de la voz. */
function escFrase(L: Lienzo, p: Paleta, c: Clip): (t: number) => Nodo[] {
  const n = c.texto.split(" ").length;
  const fs = c.texto.length > 170 ? 50 : c.texto.length > 110 ? 58 : 68;
  return (t) => [lleno(L, {}, h("div", { flexWrap: "wrap", fontSize: fs, lineHeight: 1.3 }, ...palabras(c.texto, t, c.t0, {}, (c.dur * 0.9) / n)))];
}

function escClaves(L: Lienzo, p: Paleta, clips: Clip[]): (t: number) => Nodo[] {
  return (t) => [
    lleno(
      L,
      {},
      h("div", { fontSize: 34, letterSpacing: 6, color: p.acento, marginBottom: 60, opacity: tramo(t, clips[0]!.t0 - 0.4, clips[0]!.t0) }, "LAS CLAVES"),
      ...clips.map((c, i) => {
        const v = tramo(t, c.t0 - 0.1, c.t0 + 0.5);
        return h(
          "div",
          { opacity: v, transform: `translateY(${Math.round((1 - v) * 50)}px)`, marginBottom: 64, alignItems: "flex-start" },
          h("div", { fontSize: 44, fontWeight: 300, color: p.acento, width: 96, flexShrink: 0, marginTop: 6 }, `0${i + 1}`),
          h("div", { fontSize: c.texto.length > 48 ? 48 : 56, fontWeight: 500, lineHeight: 1.2, flex: 1 }, c.texto),
        );
      }),
    ),
  ];
}

function escCierre(L: Lienzo, p: Paleta, c: Clip): (t: number) => Nodo[] {
  const { V } = L;
  return (t) => [
    lleno(
      L,
      { alignItems: "center" },
      aro(p, V ? 260 : 200, tramo(t, c.t0 - 0.2, c.t0 + 1.4), tramo(t, c.t0 + 0.8, c.t0 + 1.5)),
      h("div", { marginTop: 50, opacity: tramo(t, c.t0 + 0.3, c.t0 + 0.9) }, img(wordmark(p), V ? 560 : 520, Math.round(((V ? 560 : 520) * 140) / 559))),
      h("div", { marginTop: 56, fontSize: V ? 44 : 38, color: p.suave, opacity: tramo(t, c.t0 + 0.9, c.t0 + 1.5) }, "Lee el artículo completo"),
      h("div", { marginTop: 14, fontSize: V ? 66 : 60, fontWeight: 500, opacity: tramo(t, c.t0 + 1.2, c.t0 + 1.8) }, "owneria.mx/blog"),
    ),
  ];
}

// ---------- Grabación ----------
async function grabar(L: Lienzo, fps: number, p: Paleta, es: Escena[], clips: Clip[], dur: number, salida: string, portada?: { t: number; archivo: string }) {
  const { W, H } = L;
  const audio = join(TMP, `audio-${L.V ? "v" : "h"}.wav`);
  wav(clips, dur, audio);
  const cuadro = (t: number) => {
    const i = es.findIndex((e) => t <= e.z);
    const capas = es
      .filter((e) => t >= e.a - 0.01 && t <= e.z + 0.01)
      .map((e) => {
        const sale = 1 - lim((t - (e.z - 0.21)) / 0.21);
        const op = e === es[es.length - 1] ? tramo(t, e.a, e.a + 0.3) : e.a === 0 ? sale : vida(t, e.a, e.z, 0.35);
        return h("div", { position: "absolute", left: 0, top: 0, width: W, height: H, opacity: op }, ...e.dibuja(t));
      });
    // Barra de avance: da un paso con cada oración.
    const hechos = clips.filter((c) => c.t0 <= t);
    const ult = hechos[hechos.length - 1];
    const avance = ult ? (hechos.length - 1 + tramo(t, ult.t0, ult.t0 + 0.6)) / clips.length : 0;
    return marco(L, p, capas, avance, `${String(Math.max(1, i + 1)).padStart(2, "0")} / ${String(es.length).padStart(2, "0")}`);
  };
  // MUESTRA=0.3,0.6 (fracciones del video): solo dibuja esos cuadros en JPG, sin grabar.
  if (process.env.MUESTRA) {
    for (const fr of process.env.MUESTRA.split(",").map(Number)) {
      const svg = await satori(cuadro(fr * dur) as never, { width: W, height: H, fonts: FUENTES });
      await sharp(new Resvg(svg).render().asPng()).resize(960).jpeg({ quality: 80 }).toFile(salida.replace(".mp4", `-${fr}.jpg`));
    }
    return { segundos: dur, cuadros: 0, dibujados: 0 };
  }
  const proc = spawn(
    ffmpeg as unknown as string,
    [
      "-y", "-loglevel", "error",
      "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${W}x${H}`, "-framerate", String(fps), "-i", "-",
      "-i", audio,
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "160k", "-ac", "2", "-t", dur.toFixed(3), "-movflags", "+faststart", salida,
    ],
    { stdio: ["pipe", "inherit", "inherit"] },
  );
  const fin = new Promise<void>((ok, mal) => proc.on("close", (c) => (c === 0 ? ok() : mal(new Error(`ffmpeg salió con ${c}`)))));
  const cuadros = Math.round(dur * fps);
  const fP = portada ? Math.round(portada.t * fps) : -1;
  let antes = "";
  let pix: Buffer = Buffer.alloc(0);
  let dibujados = 0;
  for (let f = 0; f < cuadros; f++) {
    const t = f / fps;
    const arbol = cuadro(t);
    const k = JSON.stringify(arbol);
    if (k !== antes) {
      const svg = await satori(arbol as never, { width: W, height: H, fonts: FUENTES });
      pix = new Resvg(svg).render().pixels;
      antes = k;
      dibujados++;
    }
    if (f === fP) await sharp(pix, { raw: { width: W, height: H, channels: 4 } }).jpeg({ quality: 90 }).toFile(portada!.archivo);
    if (!proc.stdin.write(pix)) await new Promise((ok) => proc.stdin.once("drain", ok));
  }
  proc.stdin.end();
  await fin;
  return { segundos: dur, cuadros, dibujados };
}

// ---------- Largo 16:9 ----------
async function largo(a: Articulo, tema: Tema, dir: string) {
  const L: Lienzo = { W: 1920, H: 1080, V: false };
  const p = P[tema];
  const { intro, secs } = partes(a);
  const d = (s: string) => voz(s).dur + GAP;
  const ini = intro.slice(0, 2);
  let total = 0.5 + d(a.titulo) + d(CIERRE) + 2 * ENTRE + 1.5 + ini.reduce((n, s) => n + d(s), ENTRE);
  for (const s of secs) total += d(s.titulo) + ENTRE;
  const cuantas = secs.map(() => 0);
  bucle: for (let k = 0; k < 9; k++)
    for (let i = 0; i < secs.length; i++) {
      const o = secs[i]!.oraciones[k];
      if (!o || cuantas[i] !== k) continue;
      const c = d(o) + (k > 0 && k % 3 === 0 ? ENTRE : 0);
      if (total + c > 182) break bucle;
      total += c;
      cuantas[i] = k + 1;
    }
  // Grupos de voz: portada, intro, secciones (de 3 en 3 oraciones), cierre.
  const grupos: string[][] = [[a.titulo], ini];
  const meta: { sec: number; primero: boolean }[] = [];
  secs.forEach((s, i) => {
    const os = s.oraciones.slice(0, cuantas[i]);
    for (let k = 0; k < Math.max(1, os.length); k += 3) {
      grupos.push(k === 0 ? [s.titulo, ...os.slice(0, 3)] : os.slice(k, k + 3));
      meta.push({ sec: i, primero: k === 0 });
    }
  });
  grupos.push([CIERRE]);
  const { es: tl, fin } = linea(grupos.filter((g) => g.length));
  const es: Escena[] = tl.map((e, j) => {
    if (j === 0) return { a: 0, z: e.z, dibuja: escPortada(L, p, a, e.clips[0]!) };
    if (j === tl.length - 1) return { a: e.a, z: fin + 2, dibuja: escCierre(L, p, e.clips[0]!) };
    if (j === 1 && ini.length) return { a: e.a, z: e.z, dibuja: escSeccion(L, p, "", a.categoria, a.titulo, e.a, e.clips) };
    const m = meta[j - (ini.length ? 2 : 1)]!;
    const s = secs[m.sec]!;
    const cuerpo = m.primero ? e.clips.slice(1) : e.clips;
    return { a: e.a, z: e.z, dibuja: escSeccion(L, p, String(m.sec + 1).padStart(2, "0"), "", s.titulo, m.primero ? e.clips[0]!.t0 : e.a - 5, cuerpo.length ? cuerpo : e.clips) };
  });
  const clips = tl.flatMap((e) => e.clips);
  const dur = fin + 1.5;
  const r = await grabar(L, 24, p, es, clips, dur, join(dir, "largo.mp4"), { t: tl[0]!.z - 0.4, archivo: join(dir, "miniatura.jpg") });
  return { ...r, guion: clips.map((c) => c.texto) };
}

// ---------- Corto 9:16 (≤29 s) ----------
async function corto(a: Articulo, tema: Tema, dir: string) {
  const L: Lienzo = { W: 1080, H: 1920, V: true };
  const p = P[tema];
  const { intro, secs } = partes(a);
  const fin0 = "Léelo completo en owneria.mx";
  const gancho = intro.find((s) => s.length < 150) ?? "";
  const tit = secs.map((s) => s.titulo).filter((s) => s.length < 70);
  let grupos: string[][] = [];
  let ritmo = RITMO;
  elegir: for (ritmo of [RITMO, 195, 210, 225]) {
    for (const [conG, n] of [[true, 3], [true, 2], [false, 3], [false, 2], [true, 0], [false, 0]] as [boolean, number][]) {
      if (n > tit.length || (conG && !gancho)) continue;
      grupos = [[a.titulo], ...(conG ? [[gancho]] : []), ...(n ? [tit.slice(0, n)] : []), [fin0]];
      if (linea(grupos, ritmo).fin + 0.6 <= 29) break elegir;
    }
  }
  const { es: tl, fin } = linea(grupos, ritmo);
  const es: Escena[] = tl.map((e, j) => {
    if (j === 0) return { a: 0, z: e.z, dibuja: escPortada(L, p, a, e.clips[0]!) };
    if (j === tl.length - 1) return { a: e.a, z: 30, dibuja: escCierre(L, p, e.clips[0]!) };
    return { a: e.a, z: e.z, dibuja: e.clips.length === 1 && e.clips[0]!.texto === gancho ? escFrase(L, p, e.clips[0]!) : escClaves(L, p, e.clips) };
  });
  const clips = tl.flatMap((e) => e.clips);
  const dur = Math.min(29, fin + 1.2);
  const r = await grabar(L, 30, p, es, clips, dur, join(dir, "corto.mp4"), { t: tl[0]!.z - 0.4, archivo: join(dir, "portada-corto.jpg") });
  return { ...r, guion: clips.map((c) => c.texto) };
}

// ---------- Principal ----------
const [cual, que = "ambos", temaArg] = process.argv.slice(2);
if (!cual) throw new Error("Uso: bun src/video.ts <slug|número> [largo|corto|ambos] [tema]");
const todos = (await (await fetch("https://owneria.mx/api/public/articulos")).json()) as Articulo[];
const idx = /^\d+$/.test(cual) ? Number(cual) : todos.findIndex((x) => x.slug === cual);
const a = todos[idx];
if (!a) throw new Error(`No encontré el artículo ${cual}`);
const tema = (temaArg as Tema) ?? (["noche", "azul", "claro"] as Tema[])[idx % 3]!;
const dir = join(import.meta.dir, "..", "..", "videos", a.slug);
mkdirSync(dir, { recursive: true });
const t0 = Date.now();
let notas = `# ${a.titulo}\n\nTítulo para YouTube: ${a.titulo}\n\nDescripción: ${a.descripcion}\n\nArtículo: https://owneria.mx/blog/${a.slug}\n\nEtiquetas: ${[...new Set(a.palabrasClave)].join(", ")}\n`;
if (que !== "largo") {
  const r = await corto(a, tema, dir);
  console.log(`${a.slug} corto: ${r.segundos.toFixed(1)} s, ${r.dibujados}/${r.cuadros} cuadros, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  notas += `\n## Guion del corto (${r.segundos.toFixed(0)} s)\n\n${r.guion.join("\n")}\n`;
}
if (que !== "corto") {
  const r = await largo(a, tema, dir);
  console.log(`${a.slug} largo: ${r.segundos.toFixed(1)} s, ${r.dibujados}/${r.cuadros} cuadros, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  notas += `\n## Guion del largo (${(r.segundos / 60).toFixed(1)} min)\n\n${r.guion.join("\n")}\n`;
}
writeFileSync(join(dir, que === "ambos" ? "guion.md" : `guion-${que}.md`), notas);
