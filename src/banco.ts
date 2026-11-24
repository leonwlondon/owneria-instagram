// Piezas propias que NO vienen del blog. Todo sale de material real del sitio (casos, lo construido, la demo)
// o es explicación general correcta (glosario) e ideas de León ya escritas en el sitio y el blog.
// Sin nombres de clientes ni cifras inventadas; la demo de preguntas lleva «datos de ejemplo».
import type { Lamina } from "./contenido";

export type Respuesta =
  | { tipo: "barras"; intro: string; filas: [string, number, string][]; pie?: string }
  | { tipo: "lista"; intro: string; filas: { t: string; s: string; tono: "ok" | "aviso" | "mal" }[]; pie?: string };

export type Pieza =
  | {
      id: string;
      serie: "caso";
      giro: string;
      titulo: string;
      antes: string;
      conecto: string[];
      metricas: { v: string; t: string }[];
      ganas: string;
      cofre: string;
    }
  | { id: string; serie: "hecho"; titulo: string; texto: string }
  | { id: string; serie: "pregunta"; pregunta: string; respuesta: Respuesta }
  | { id: string; serie: "glosario"; termino: string; definicion: string; ejemplo: string }
  | { id: string; serie: "idea"; texto: string; contexto: string };

const CASOS: Pieza[] = [
  {
    id: "caso-centro-negocios",
    serie: "caso",
    giro: "Centro de negocios",
    titulo: "El cierre de mes dejó de ser pesadilla.",
    antes:
      "Cobranza, pagos a proveedores entre varias razones sociales y conciliación del banco, todo a mano. Un cambio de razón social exigía avisar a cientos de clientes y firmar con cada uno.",
    conecto: [
      "Cobranza que se cobra sola: estado de cuenta, tarjeta y domiciliación.",
      "Facturación masiva del mes que corre sola, con pausa y reintento.",
      "Depósitos que llegan y se concilian contra cada cliente.",
      "Contratos firmados con firma electrónica avanzada.",
    ],
    metricas: [{ v: "1", t: "sola corrida al mes factura a todos los clientes" }],
    ganas: "Sabes en todo momento quién te debe, a quién le pagas y cuánto. Un trámite de meses se vuelve un flujo de días.",
    cofre: "CFDI · bancos por webhook · firma electrónica por API · WhatsApp · app iOS y Android",
  },
  {
    id: "caso-sucursales-maquinas",
    serie: "caso",
    giro: "Sucursales con máquinas",
    titulo: "Todas las sucursales, en tu celular.",
    antes:
      "Máquinas en varias sucursales sin visibilidad. Las fallas se descubrían tarde, el cobro dependía de la caja y para todo había que mandar a alguien.",
    conecto: [
      "Firmware propio en cada máquina: en línea, trabajando, detenida o en mantenimiento.",
      "Un supervisor que reinicia solo lo que se traba.",
      "Precios electrónicos en anaquel que cambian desde el panel.",
      "Mantenimiento con historia y costo por máquina.",
    ],
    metricas: [
      { v: "69", t: "máquinas conectadas en vivo" },
      { v: "235", t: "etiquetas de precio electrónicas" },
    ],
    ganas: "Ves qué máquina trabaja y cuál está detenida, y resuelves a distancia lo que antes exigía una visita.",
    cofre: "ESP32 · MQTT · RFID · OTA · terminales de cobro · etiquetas electrónicas · IA",
  },
  {
    id: "caso-multicanal",
    serie: "caso",
    giro: "Fabricante multicanal",
    titulo: "Todos tus canales, una sola pantalla.",
    antes:
      "Las ventas vivían en el ERP y en varios marketplaces, cada uno con su reporte. Para saber cómo iba el negocio había que juntar todo en un Excel con macros.",
    conecto: [
      "Un conector que lee ventas, pagos y facturación del ERP.",
      "Cruce por API con marketplaces, tienda en línea y logística.",
      "Margen real por producto y por canal, contra el costo del ERP.",
    ],
    metricas: [{ v: "5→1", t: "plataformas de venta en una sola pantalla" }],
    ganas: "Sabes qué canal, qué producto y qué día te deja más. Sin esperar al cierre.",
    cofre: "ERP con Service Layer · APIs de marketplaces · tienda en línea · tablero en tiempo real",
  },
  {
    id: "caso-viajes",
    serie: "caso",
    giro: "Agencia de viajes en grupo",
    titulo: "Cotizar un viaje en minutos.",
    antes: "Cada viaje se armaba a mano, proveedor por proveedor, y el margen se conocía hasta el final.",
    conecto: [
      "Una plataforma enlazada por API con vuelos, hoteles, trenes y actividades.",
      "Itinerarios que se arman y cotizan solos.",
      "El margen calculado en cada venta.",
    ],
    metricas: [{ v: "20", t: "APIs de proveedores mapeadas para conectar" }],
    ganas: "Escalas sin contratar más gente y conoces tu margen en cada viaje.",
    cofre: "APIs de vuelos, hoteles, trenes y atracciones · clima · base de datos en la nube",
  },
  {
    id: "caso-fiscal",
    serie: "caso",
    giro: "Monitor fiscal",
    titulo: "Enterarte antes que el SAT.",
    antes:
      "Revisar que lo facturado y lo declarado coincidiera con el SAT, y vigilar listas negras, dependía de revisiones esporádicas del contador.",
    conecto: [
      "Conexión con el SAT usando la e.firma.",
      "Cuadre de lo declarado contra lo facturado y lo retenido.",
      "Cada cliente y proveedor revisado contra las listas negras.",
      "Un asistente con IA que explica cada alerta en español claro.",
    ],
    metricas: [{ v: "6 cifras", t: "en retenciones sin enterar, detectadas en la primera revisión" }],
    ganas: "Tranquilidad fiscal: lo que antes se descubría en una auditoría, ahora llega como aviso.",
    cofre: "e.firma · servicios del SAT · listas 69 y 69-B · procesos con reintentos · IA",
  },
  {
    id: "caso-colegio",
    serie: "caso",
    giro: "Colegio",
    titulo: "Un colegio que se coordina solo.",
    antes:
      "Eventos, compras, mantenimiento y admisiones vivían en correos y hojas. Los papás tenían que leer boletines completos para encontrar lo que les tocaba.",
    conecto: [
      "Un hub con eventos, compras, mantenimiento y admisiones.",
      "App de caseta con QR y NFC que funciona sin internet.",
      "Pantallas con avisos en todo el colegio.",
      "App para padres que solo muestra lo de sus hijos.",
    ],
    metricas: [
      { v: "15×", t: "más rápido el hub tras optimizar su base de datos" },
      { v: "0", t: "internet necesario en la caseta" },
    ],
    ganas: "La dirección ve todo en un solo lugar, la caseta sabe quién entra y cada familia recibe solo lo suyo.",
    cofre: "Base de datos en la nube · IA · pases en wallet · NFC · Android TV y Fire TV",
  },
];

const HECHOS: Pieza[] = (
  [
    ["CRM de contratos con firma", "Contrataciones y renovaciones en tableros; cada tarjeta tiene su propio correo y se manda a firma con recordatorios en días hábiles."],
    ["Monedero por contrato", "El cliente paga un año, el proveedor cobra cada mes: el sistema calcula lo que toca pagar y cuadra al peso contra su factura."],
    ["Sitio que se prueba solo", "Experimentos A/B con regla estadística: una versión solo gana con 95 % de confianza. Los prospectos caen directo al CRM."],
    ["Vendedor con IA", "Califica prospectos, da seguimiento a los 1, 3, 7, 14 y 30 días y recupera a los que se perdieron."],
    ["Telefonía que se contrata sola", "Portal y app para firmar, pagar y ver la vigencia del servicio, con aviso 60 días antes de vencer."],
    ["Torre de control de servidores", "Un semáforo por servidor, aviso antes de que se llene un disco y escritorio remoto propio de un clic."],
    ["Avisos por WhatsApp", "Una pasarela que manda a cada grupo lo que le toca: la sucursal recibe su alerta y tú solo lo importante."],
    ["Todo lo que vence", "Contratos, seguros, e.firmas, pasaportes e impuestos con aviso anticipado. Encontró fechas del SAT mal calculadas en sistemas comerciales."],
    ["Patrimonio cifrado", "Cuentas, inversiones e ingresos por proyecto, cifrados en tu navegador con una frase que solo tú sabes."],
    ["Una tarea en foco", "Para el dueño que salta entre negocios: un solo proyecto y una sola tarea a la vez, en el celular y en el reloj."],
    ["Emergencias médicas", "Modernización de un sistema de ambulancias: un paciente único, búsqueda instantánea y un bot que contesta consultas."],
    ["Espacios que se controlan", "Luces, enchufes y escenas desde un panel, con rutinas como «buenas noches» para todo el lugar."],
    ["La memoria del negocio", "Decisiones, pendientes y bitácora de cada proyecto, leídos por un equipo de agentes de IA que sabe en qué va todo."],
    ["Apps en las tiendas", "Apps propias en App Store y Google Play para clientes, guardias, papás y vendedores. Tuyas, no rentadas."],
  ] as const
).map(([titulo, texto], k) => ({ id: `hecho-${String(k + 1).padStart(2, "0")}`, serie: "hecho" as const, titulo, texto }));

const PREGUNTAS: Pieza[] = [
  {
    id: "pregunta-ventas",
    serie: "pregunta",
    pregunta: "¿Cuánto vendimos ayer por sucursal?",
    respuesta: {
      tipo: "barras",
      intro: "Ayer vendiste $412,800. Centro fue la mejor, 12 % arriba de su promedio de los martes.",
      filas: [["Centro", 100, "$148k"], ["Norte", 74, "$109k"], ["Poniente", 61, "$90k"], ["Sur", 44, "$65k"]],
      pie: "Sur lleva tres días por debajo. ¿Reviso por qué?",
    },
  },
  {
    id: "pregunta-sat",
    serie: "pregunta",
    pregunta: "¿Qué clientes están en las listas negras del SAT?",
    respuesta: {
      tipo: "lista",
      intro: "Revisé a 1,284 clientes y proveedores contra las listas de hoy. Encontré dos:",
      filas: [
        { t: "Proveedor · lista 69-B", s: "Presunto · 3 facturas este año", tono: "mal" },
        { t: "Cliente · lista 69", s: "No localizado", tono: "aviso" },
        { t: "Los otros 1,282", s: "Sin coincidencias", tono: "ok" },
      ],
      pie: "Ya le avisé a tu contador con el detalle.",
    },
  },
  {
    id: "pregunta-margen",
    serie: "pregunta",
    pregunta: "¿Qué producto me deja más margen este mes?",
    respuesta: {
      tipo: "barras",
      intro: "Margen real después de comisiones y envío:",
      filas: [["Kit de inicio", 100, "38 %"], ["Proteína 1 kg", 79, "30 %"], ["Barra × 12", 58, "22 %"], ["Colágeno", 34, "13 %"]],
      pie: "El colágeno vende mucho en marketplace, pero ahí casi no te deja.",
    },
  },
  {
    id: "pregunta-maquinas",
    serie: "pregunta",
    pregunta: "¿Qué máquinas están fuera de línea?",
    respuesta: {
      tipo: "lista",
      intro: "De 69 máquinas, 67 están en línea ahora mismo.",
      filas: [
        { t: "Secadora 6 · Centro", s: "Se trabó a las 9:14 y se reinició sola", tono: "ok" },
        { t: "Lavadora 2 · Norte", s: "Sin conexión hace 40 min · técnico avisado", tono: "mal" },
        { t: "Lavadora 9 · Sur", s: "Mantenimiento hasta las 13:00", tono: "aviso" },
      ],
    },
  },
  {
    id: "pregunta-contratos",
    serie: "pregunta",
    pregunta: "¿Qué contratos vencen este mes?",
    respuesta: {
      tipo: "lista",
      intro: "Vencen 14 contratos. Los tres más grandes:",
      filas: [
        { t: "Despacho R.", s: "Vence el 5 · renovación enviada a firma", tono: "ok" },
        { t: "Grupo S.", s: "Vence el 12 · aún no abre el correo", tono: "aviso" },
        { t: "Estudio L.", s: "Vence el 19 · pidió cambiar de plan", tono: "aviso" },
      ],
      pie: "¿Le mando recordatorio a Grupo S. por WhatsApp?",
    },
  },
];

const GLOSARIO: Pieza[] = (
  [
    ["API", "La puerta por la que un sistema le pide datos a otro, o le pide que haga algo, sin que una persona copie y pegue.", "Tu tienda en línea le avisa a tu ERP de cada venta en el momento."],
    ["ERP", "El sistema donde vive la operación: inventario, compras, ventas, costos y contabilidad.", "SAP Business One, Odoo o Microsoft Dynamics."],
    ["Webhook", "Un aviso automático: cuando algo pasa en un sistema, le manda una señal a otro al instante.", "Entra un depósito al banco y tu sistema lo concilia sin esperar al día siguiente."],
    ["MCP", "Un estándar para que una IA use tus sistemas con permiso: consultar ventas, buscar un cliente, revisar el inventario.", "Le preguntas a la IA quién te debe y ella lo consulta en tu sistema, no lo inventa."],
    ["CFDI", "La factura electrónica que valida el SAT. Cada una trae datos que se pueden leer y cruzar automáticamente.", "Descargar todas tus facturas del mes y cuadrarlas contra el banco."],
    ["Conciliación", "Cuadrar lo que dice el banco contra lo que dice tu sistema, movimiento por movimiento.", "Saber qué depósito corresponde a qué factura sin revisarlo a mano."],
    ["e.firma", "Tu firma electrónica ante el SAT. También sirve para conectar un sistema a los servicios del SAT a tu nombre.", "Descargar tus facturas y tu opinión de cumplimiento sin entrar al portal."],
    ["Lista 69-B", "La lista del SAT de contribuyentes que facturan operaciones que, según el SAT, no existen.", "Revisar a cada proveedor antes de pagarle, no después."],
    ["IoT", "Aparatos conectados a internet que mandan datos o reciben órdenes: máquinas, sensores, pantallas, etiquetas.", "Una lavadora que avisa sola cuando termina o cuando falla."],
    ["Tablero", "Una pantalla con los números que importan, actualizados solos, en lugar de un reporte que alguien arma.", "La venta de hoy contra ayer y contra la meta, en tu celular."],
    ["Automatizar", "Que una tarea repetitiva y con reglas claras se haga sola, y que te avise solo cuando algo sale de lo normal.", "Recordatorios de pago que salen solos y se detienen cuando el cliente paga."],
    ["Agente de IA", "Una IA que no solo contesta: consulta, decide entre opciones y ejecuta pasos dentro de tus sistemas, con reglas.", "Da seguimiento a un prospecto y te pasa solo los que ya están listos para hablar contigo."],
  ] as const
).map(([termino, definicion, ejemplo]) => ({
  id: `glosario-${termino.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-")}`,
  serie: "glosario" as const,
  termino,
  definicion,
  ejemplo,
}));

const IDEAS: Pieza[] = (
  [
    ["No te vendo software. Te devuelvo tu negocio.", "Lo que hago, en una frase."],
    ["Empieza por el proceso que más te duele, no por la herramienta que más te gusta.", "El error más común al automatizar es empezar por el software."],
    ["Primero se ordena, luego se automatiza.", "Lo que hoy nadie hace igual dos veces todavía no se puede automatizar."],
    ["Lo que no se usa, no sirve.", "La regla que no ha cambiado en más de 20 años de hacer sistemas."],
    ["Tu negocio ya tiene las respuestas. Falta que te las dé.", "La información ya existe en tu banco, tu ERP, tu tienda y tus hojas."],
    ["Un buen sistema no te esconde nada: trabaja solo y te avisa cuando algo se sale de lo normal.", "Automatizar no es perder el control, es dejar de ser el cable."],
    ["Si no sabes cuánto tarda hoy, no sabrás cuánto ganaste.", "Mide antes de automatizar."],
    ["No necesitas reemplazar tus sistemas. Necesitas que hablen entre sí.", "Casi siempre falta el puente, no otro sistema."],
    ["Si te vas una semana y algo se atora, el negocio depende de ti, no de un proceso.", "La pregunta que todo dueño debería hacerse."],
    ["Una IA sin tus datos opina. Con tus datos, responde.", "La diferencia entre un chat genérico y una IA conectada a tu negocio."],
  ] as const
).map(([texto, contexto], k) => ({ id: `idea-${String(k + 1).padStart(2, "0")}`, serie: "idea" as const, texto, contexto }));

/** Orden de salida: se van turnando las series para que el perfil no repita formato. */
export const BANCO: Pieza[] = (() => {
  const series = [CASOS, HECHOS, PREGUNTAS, GLOSARIO, IDEAS];
  const out: Pieza[] = [];
  for (let k = 0; out.length < series.reduce((s, x) => s + x.length, 0); k++)
    for (const s of series) if (s[k]) out.push(s[k]!);
  return out;
})();

const TAGS = "#dueñosdenegocio #automatizacion #inteligenciaartificial #pymesmexico #owneria";

export function textoPieza(p: Pieza): string {
  switch (p.serie) {
    case "caso":
      return `${p.titulo}\n\n${p.giro}. Antes: ${p.antes}\n\nAhora: ${p.ganas}\n\nCaso real, contado sin nombres.\n\n${TAGS}`;
    case "hecho":
      return `${p.titulo}\n\n${p.texto}\n\nUno de los sistemas que ya construí.\n\n${TAGS}`;
    case "pregunta":
      return `«${p.pregunta}»\n\nCuando tus sistemas están conectados, ya no buscas el dato: lo preguntas como se lo preguntarías a alguien de tu equipo.\n\nDatos de ejemplo.\n\n${TAGS}`;
    case "glosario":
      return `${p.termino}: ${p.definicion}\n\nEjemplo: ${p.ejemplo}\n\nGlosario del dueño.\n\n${TAGS}`;
    case "idea":
      return `${p.texto}\n\n${p.contexto}\n\n${TAGS}`;
  }
}


/** Láminas de cada pieza (los reels de «pregunta» se dibujan aparte en reel.ts). */
export function laminasPieza(p: Pieza): Lamina[] {
  switch (p.serie) {
    case "caso":
      return [
        { tipo: "portada", categoria: `Caso real · ${p.giro}`, titulo: p.titulo },
        { tipo: "seccion", etiqueta: "ANTES", titulo: "Así funcionaba", texto: p.antes, fondo: "antes" },
        { tipo: "seccion", etiqueta: "LO QUE SE CONECTÓ", titulo: "Qué cambió", lista: p.conecto },
        ...p.metricas.map((m): Lamina => ({ tipo: "dato", valor: m.v, texto: m.t })),
        { tipo: "seccion", etiqueta: "AHORA", titulo: p.ganas, fondo: "ahora" },
        { tipo: "seccion", etiqueta: "DETRÁS", titulo: "Con qué está hecho", lista: p.cofre.split(" · "), chips: true },
      ];
    case "hecho":
      return [{ tipo: "seccion", etiqueta: "LO QUE YA CONSTRUÍ", titulo: p.titulo, texto: p.texto }];
    case "glosario":
      return [{ tipo: "termino", termino: p.termino, definicion: p.definicion, ejemplo: p.ejemplo }];
    case "idea":
      return [{ tipo: "frase", texto: p.texto, firma: "León · Owneria" }];
    case "pregunta":
      return [];
  }
}
