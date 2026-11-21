(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TrainingExerciseCatalog = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const CUSTOM_KEY = "exercise_catalog_custom.v1";
  const GROUPS = ["Glúteo", "Cuádriceps", "Isquios", "Espalda", "Pecho", "Hombro", "Brazos", "Core", "Gemelo", "Abdomen"];
  const source = [
    ["E001", "Hip thrust en máquina", "Glúteo", "total_kg"],
    ["E002", "Hip thrust en Smith", "Glúteo", "total_kg"],
    ["E003", "Hip thrust con barra", "Glúteo", "total_kg"],
    ["E004", "Hack squat profunda", "Cuádriceps", "total_kg"],
    ["E005", "Sentadilla pendular profunda", "Cuádriceps", "total_kg"],
    ["E006", "Sentadilla profunda en Smith", "Cuádriceps", "total_kg"],
    ["E007", "Prensa profunda", "Cuádriceps", "total_kg"],
    ["E008", "Bulgarian split squat en Smith", "Glúteo/Cuádriceps", "per_side_kg"],
    ["E009", "Bulgarian con mancuernas", "Glúteo/Cuádriceps", "per_side_kg"],
    ["E010", "Zancada inversa en Smith", "Glúteo/Cuádriceps", "per_side_kg"],
    ["E011", "Peso muerto rumano en Smith", "Isquios/Glúteo", "total_kg"],
    ["E012", "Peso muerto rumano con mancuernas", "Isquios/Glúteo", "total_kg"],
    ["E013", "Hiperextensión a 45º sesgada a glúteo", "Glúteo", "bodyweight_plus_kg"],
    ["E014", "Extensión de cadera en cable", "Glúteo", "per_side_kg"],
    ["E015", "Abducción de cadera en máquina", "Glúteo medio", "total_kg"],
    ["E016", "Abducción unilateral en cable", "Glúteo medio", "per_side_kg"],
    ["E017", "Power Squat / Leverage Power Squat", "Cuádriceps", "total_kg"],
    ["E018", "V-Squat / Lever V-Squat", "Cuádriceps", "total_kg"],
    ["E019", "Elevación lateral en máquina", "Hombro lateral", "total_kg"],
    ["E020", "Elevación lateral unilateral en cable", "Hombro lateral", "per_side_kg"],
    ["E021", "Elevación lateral con mancuernas", "Hombro lateral", "total_kg"],
    ["E022", "Peck-deck inverso", "Hombro posterior", "total_kg"],
    ["E023", "Apertura inversa en cable", "Hombro posterior", "total_kg"],
    ["E024", "Remo posterior con pecho apoyado", "Hombro posterior", "total_kg"],
    ["E025", "Press de hombro en máquina", "Hombro", "total_kg"],
    ["E026", "Jalón medio/neutro", "Espalda/Dorsal", "total_kg"],
    ["E027", "Dominada neutra asistida", "Espalda/Dorsal", "bodyweight_plus_kg"],
    ["E028", "Jalón unilateral en cable", "Espalda/Dorsal", "per_side_kg"],
    ["E029", "Pullover en máquina", "Espalda/Dorsal", "total_kg"],
    ["E030", "Jalón con brazos rectos (Pullover cable)", "Espalda/Dorsal", "total_kg"],
    ["E031", "Remo convergente con pecho apoyado", "Espalda media", "total_kg"],
    ["E032", "Remo T-bar con pecho apoyado", "Espalda media", "total_kg"],
    ["E033", "Remo sentado en cable (Gironda)", "Espalda media", "total_kg"],
    ["E034", "Remo unilateral en cable con apoyo", "Espalda media", "per_side_kg"],
    ["E035", "Press convergente inclinado moderado", "Pecho", "total_kg"],
    ["E036", "Press inclinado en Smith 15-30º", "Pecho", "total_kg"],
    ["E037", "Press inclinado con mancuernas", "Pecho", "total_kg"],
    ["E038", "Press convergente horizontal", "Pecho", "total_kg"],
    ["E039", "Press plano en Smith o con mancuernas", "Pecho", "total_kg"],
    ["E040", "Peck-deck (Aperturas)", "Pecho", "total_kg"],
    ["E041", "Apertura en cable", "Pecho", "total_kg"],
    ["E042", "Extensión de tríceps overhead en cable", "Tríceps", "total_kg"],
    ["E043", "Pressdown en cable", "Tríceps", "total_kg"],
    ["E044", "Curl predicador en cable o máquina", "Bíceps", "total_kg"],
    ["E045", "Curl bayesiano en cable", "Bíceps", "per_side_kg"],
    ["E046", "Curl martillo en cable o mancuernas", "Bíceps/Braquial", "total_kg"],
    ["E047", "Extensión de rodilla", "Cuádriceps", "total_kg"],
    ["E048", "Curl femoral sentado", "Isquios", "total_kg"],
    ["E049", "Curl femoral tumbado", "Isquios", "total_kg"],
    ["E050", "Elevación de talones de pie en máquina", "Gemelo", "total_kg"],
    ["E051", "Gemelo en prensa con rodilla extendida", "Gemelo", "total_kg"],
    ["E052", "Elevación de talones sentada", "Gemelo/Sóleo", "total_kg"],
    ["E053", "Crunch en cable o máquina", "Abdomen", "total_kg"],
    ["E054", "Reverse crunch controlado", "Abdomen", "bodyweight"],
    ["E055", "Pallof press", "Core", "total_kg"],
    ["E056", "Forward-Lean Shrug en Smith", "Espalda/Trapecio", "total_kg"],
    ["E057", "Dual-cable cross pushdown", "Tríceps", "total_kg"],
    ["E058", "Kickback diagonal de glúteo en polea baja", "Glúteo", "per_side_kg"],
    ["E059", "Cossack squat (Sentadilla cosaca)", "Cuádriceps/Glúteo", "bodyweight"],
    ["E060", "Encogimientos trapecio en Smith con inclinación hacia delante", "Espalda/Trapecio", "total_kg"],
    ["E061", "Press banca plano con barra", "Pecho", "total_kg"],
    ["E062", "Press inclinado con barra", "Pecho", "total_kg"],
    ["E063", "Press declinado con barra o Smith", "Pecho", "total_kg"],
    ["E064", "Press plano con mancuernas", "Pecho", "total_kg"],
    ["E065", "Fondos en paralelas para pecho (Dips)", "Pecho/Tríceps", "bodyweight_plus_kg"],
    ["E066", "Flexiones de pecho (Push-ups)", "Pecho", "bodyweight"],
    ["E067", "Cruces de poleas de abajo hacia arriba", "Pecho", "total_kg"],
    ["E068", "Cruces de poleas de arriba hacia abajo", "Pecho", "total_kg"],
    ["E069", "Dominadas pronas (Pull-ups)", "Espalda/Dorsal", "bodyweight_plus_kg"],
    ["E070", "Dominadas supinas (Chin-ups)", "Espalda/Bíceps", "bodyweight_plus_kg"],
    ["E071", "Jalón al pecho agarre ancho", "Espalda/Dorsal", "total_kg"],
    ["E072", "Jalón al pecho agarre supino", "Espalda/Dorsal", "total_kg"],
    ["E073", "Remo con barra (Pendlay / 45º)", "Espalda media", "total_kg"],
    ["E074", "Remo con mancuerna a una mano", "Espalda media", "per_side_kg"],
    ["E075", "Remo en punta (T-Bar libre)", "Espalda media", "total_kg"],
    ["E076", "Remo al mentón (Upright row)", "Hombro/Trapecio", "total_kg"],
    ["E077", "Face pull en polea alta", "Hombro posterior", "total_kg"],
    ["E078", "Press militar de pie con barra (OHP)", "Hombro", "total_kg"],
    ["E079", "Press militar sentado con mancuernas", "Hombro", "total_kg"],
    ["E080", "Press Arnold con mancuernas", "Hombro", "total_kg"],
    ["E081", "Elevaciones laterales sentado con mancuernas", "Hombro lateral", "total_kg"],
    ["E082", "Elevación lateral tumbado en banco inclinado", "Hombro lateral", "per_side_kg"],
    ["E083", "Pájaros con mancuernas (Rear delt flyes)", "Hombro posterior", "total_kg"],
    ["E084", "Elevación frontal con mancuernas o disco", "Hombro", "total_kg"],
    ["E085", "Press francés con barra Z", "Tríceps", "total_kg"],
    ["E086", "Press francés con mancuernas", "Tríceps", "total_kg"],
    ["E087", "Fondos entre bancos (Bench dips)", "Tríceps", "bodyweight_plus_kg"],
    ["E088", "Extensión unilateral de tríceps en polea", "Tríceps", "per_side_kg"],
    ["E089", "Curl de bíceps con barra recta o Z", "Bíceps", "total_kg"],
    ["E090", "Curl de bíceps alterno con mancuernas", "Bíceps", "total_kg"],
    ["E091", "Curl inclinado con mancuernas en banco 60º", "Bíceps", "total_kg"],
    ["E092", "Curl de concentración con mancuerna", "Bíceps", "per_side_kg"],
    ["E093", "Sentadilla trasera con barra (Back Squat)", "Cuádriceps", "total_kg"],
    ["E094", "Sentadilla frontal con barra (Front Squat)", "Cuádriceps", "total_kg"],
    ["E095", "Sentadilla goblet con mancuerna", "Cuádriceps", "total_kg"],
    ["E096", "Sentadilla Sissy (Sissy squat)", "Cuádriceps", "bodyweight"],
    ["E097", "Zancadas caminando (Walking lunges)", "Glúteo/Cuádriceps", "total_kg"],
    ["E098", "Step-up en cajón sesgado a glúteo", "Glúteo", "per_side_kg"],
    ["E099", "Prensa unilateral / a una pierna", "Cuádriceps", "per_side_kg"],
    ["E100", "Belt squat (Sentadilla con cinturón)", "Cuádriceps", "total_kg"],
    ["E101", "Peso muerto convencional con barra", "Isquios/Glúteo", "total_kg"],
    ["E102", "Peso muerto sumo con barra", "Glúteo/Cuádriceps", "total_kg"],
    ["E103", "Peso muerto rumano con barra (RDL)", "Isquios/Glúteo", "total_kg"],
    ["E104", "Peso muerto rumano unilateral (B-Stance)", "Isquios/Glúteo", "per_side_kg"],
    ["E105", "Glute bridge con barra en suelo", "Glúteo", "total_kg"],
    ["E106", "Frog pump con mancuerna o banda", "Glúteo", "total_kg"],
    ["E107", "Nordic hamstring curl (Curl nórdico)", "Isquios", "bodyweight"],
    ["E108", "Buenos días con barra (Good Mornings)", "Isquios/Glúteo", "total_kg"],
    ["E109", "Aducción de cadera en máquina", "Glúteo/Aductores", "total_kg"],
    ["E110", "Rueda abdominal (Ab wheel rollout)", "Abdomen", "bodyweight"],
    ["E111", "Elevación de piernas colgado en barra", "Abdomen", "bodyweight"],
    ["E112", "Plancha frontal isométrica (Plank)", "Core", "bodyweight"],
    ["E113", "Paseo del granjero (Farmer walk)", "Core", "total_kg"],
    ["E114", "Elevación de talones tipo burro (Donkey calf raise)", "Gemelo", "total_kg"],
    ["E115", "Elevación de talones unilateral con mancuerna", "Gemelo", "per_side_kg"]
  ];
  const normalize = (value) => String(value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const ALIASES = {
    "E008": [
        "Sentadilla búlgara",
        "Búlgara Smith",
        "Búlgara",
        "Bulgarian"
    ],
    "E011": [
        "RDL",
        "RDL Smith",
        "Peso muerto rumano"
    ],
    "E012": [
        "RDL mancuernas",
        "RDL mancuerna",
        "Peso muerto rumano mancuernas"
    ],
    "E015": [
        "Abductor",
        "Abducción sentada",
        "Abductor máquina"
    ],
    "E020": [
        "Lateral polea",
        "Elevación lateral cable"
    ],
    "E022": [
        "Posterior máquina",
        "Peck deck posterior"
    ],
    "E024": [
        "Low row",
        "Remo posterior"
    ],
    "E030": [
        "Pullover",
        "Pullover polea",
        "Pullover cable"
    ],
    "E031": [
        "Row",
        "Remo máquina",
        "Remo discos"
    ],
    "E042": [
        "Katana",
        "Tríceps Katana",
        "Extensión Katana",
        "Extensio Katana",
        "Overhead cable",
        "Tríceps overhead"
    ],
    "E043": [
        "Tríceps cuerda",
        "Pressdown polea",
        "Jalón tríceps"
    ],
    "E044": [
        "Predicador",
        "Banco Scott",
        "Curl Scott",
        "Predicador máquina"
    ],
    "E045": [
        "Bayesiano",
        "Curl cable detrás",
        "Bayesian curl"
    ],
    "E046": [
        "Martillo",
        "Hammer curl",
        "Braquial"
    ],
    "E050": [
        "Gemelo Hack",
        "Gemelo de pie"
    ],
    "E053": [
        "Crunch máquina",
        "Crunch polea"
    ],
    "E054": [
        "Reverse crunch",
        "Elevación de piernas",
        "Elevación piernas"
    ],
    "E056": [
        "Encogimiento en Smith con inclinacion anterior",
        "Encogimientos trapecio en Smith con inclinacion hacia delante",
        "Kelso shrug en Smith",
        "Encogimiento Kelso multipower",
        "Shrug en Smith con inclinacion hacia delante",
        "Encogimientos trapecio en Smith",
        "Kelso shrug"
    ],
    "E057": [
        "Cross pushdown",
        "Dual cable triceps",
        "Cruces triceps"
    ],
    "E058": [
        "Kickback glúteo",
        "Patada glúteo",
        "Patada polea",
        "Glute kickback"
    ],
    "E059": [
        "Cosaca",
        "Sentadilla cosaca",
        "Cossack"
    ],
    "E060": [
        "Shrug Smith",
        "Encogimiento trapecio"
    ],
    "E061": [
        "Banca",
        "Bench press",
        "Press banca",
        "Press plano barra",
        "Pecho plano"
    ],
    "E062": [
        "Press inclinado",
        "Incline bench",
        "Banca inclinada"
    ],
    "E063": [
        "Press declinado",
        "Decline bench"
    ],
    "E064": [
        "Press mancuernas",
        "Dumbbell press",
        "Press mancuerna"
    ],
    "E065": [
        "Dips",
        "Fondos",
        "Fondos paralelas",
        "Paralelas"
    ],
    "E066": [
        "Push ups",
        "Flexiones",
        "Lagartijas",
        "Fondos de suelo"
    ],
    "E067": [
        "Cruces polea baja",
        "Cable crossover low to high"
    ],
    "E068": [
        "Cruces polea alta",
        "Cable flyes",
        "Crossovers"
    ],
    "E069": [
        "Dominadas",
        "Pull ups",
        "Dominada prona",
        "Dominada abierta"
    ],
    "E070": [
        "Chin ups",
        "Dominada supina",
        "Dominadas supinas"
    ],
    "E071": [
        "Jalón dorsal",
        "Lat pulldown",
        "Jalón al pecho"
    ],
    "E072": [
        "Jalón supino",
        "Reverse lat pulldown"
    ],
    "E073": [
        "Barbell row",
        "Remo con barra",
        "Pendlay row",
        "Remo 45"
    ],
    "E074": [
        "Dumbbell row",
        "Remo mancuerna",
        "Remo serrucho"
    ],
    "E075": [
        "T-bar row",
        "Remo barra T",
        "Remo punta"
    ],
    "E076": [
        "Upright row",
        "Remo barbilla"
    ],
    "E077": [
        "Face pull",
        "Facepull",
        "Polea cara"
    ],
    "E078": [
        "OHP",
        "Overhead press",
        "Press militar",
        "Militar barra"
    ],
    "E079": [
        "Press militar mancuernas",
        "Shoulder press"
    ],
    "E080": [
        "Arnold press",
        "Press arnold"
    ],
    "E081": [
        "Laterales mancuernas",
        "Vuelos",
        "Elevaciones laterales"
    ],
    "E082": [
        "Lateral banco",
        "Lateral acostado"
    ],
    "E083": [
        "Pájaros",
        "Rear flyes",
        "Pajaros mancuerna"
    ],
    "E084": [
        "Frontales",
        "Elevación frontal"
    ],
    "E085": [
        "Skull crusher",
        "Rompecráneos",
        "Press francés barra"
    ],
    "E086": [
        "Press francés mancuernas",
        "Extension triceps mancuerna"
    ],
    "E087": [
        "Fondos banco",
        "Bench dips"
    ],
    "E088": [
        "Tríceps unilateral",
        "Extensión tríceps una mano"
    ],
    "E089": [
        "Bicep curl",
        "Curl con barra",
        "Curl barra"
    ],
    "E090": [
        "Curl alterno",
        "Curl mancuerna"
    ],
    "E091": [
        "Incline curl",
        "Curl inclinado"
    ],
    "E092": [
        "Concentration curl",
        "Curl concentración"
    ],
    "E093": [
        "Sentadilla",
        "Squat",
        "Back squat",
        "Sentadilla libre",
        "Sentadilla trasera"
    ],
    "E094": [
        "Front squat",
        "Sentadilla frontal"
    ],
    "E095": [
        "Goblet squat",
        "Sentadilla copa"
    ],
    "E096": [
        "Sissy",
        "Sissy squat"
    ],
    "E097": [
        "Lunges",
        "Zancadas",
        "Estocadas"
    ],
    "E098": [
        "Step up",
        "Subidas a cajón",
        "Subida cajón"
    ],
    "E099": [
        "Prensa una pierna",
        "Single leg press"
    ],
    "E100": [
        "Belt squat",
        "Sentadilla cinturón"
    ],
    "E101": [
        "Deadlift",
        "Peso muerto",
        "Peso muerto convencional"
    ],
    "E102": [
        "Sumo deadlift",
        "Peso muerto sumo"
    ],
    "E103": [
        "RDL barra",
        "Romanian deadlift"
    ],
    "E104": [
        "B-stance RDL",
        "RDL unilateral",
        "Rumano una pierna"
    ],
    "E105": [
        "Puente de glúteo",
        "Hip thrust suelo",
        "Glute bridge"
    ],
    "E106": [
        "Frog pump",
        "Rana"
    ],
    "E107": [
        "Nordic curl",
        "Curl nórdico",
        "Nordic hamstring"
    ],
    "E108": [
        "Good morning",
        "Buenos días"
    ],
    "E109": [
        "Aductor",
        "Aducción máquina",
        "Aductores"
    ],
    "E110": [
        "Rueda",
        "Ab wheel",
        "Rollout"
    ],
    "E111": [
        "Leg raises",
        "Elevaciones de piernas barra",
        "Toes to bar"
    ],
    "E112": [
        "Plancha",
        "Plank",
        "Isometría abdomen"
    ],
    "E113": [
        "Farmer walk",
        "Paseo granjero",
        "Paseo del granjero"
    ],
    "E114": [
        "Gemelo burro",
        "Donkey calf",
        "Donkey"
    ],
    "E115": [
        "Gemelo mancuerna",
        "Gemelo unilateral"
    ]
};
  const catalog = Object.freeze(source.map(([id, name, group, sourceLoadBasis]) => {
    const lower = normalize(name);
    const resistanceMode = sourceLoadBasis === "bodyweight" ? "bodyweight" : "external";
    const variant = lower.includes("smith") ? "Smith" : lower.includes("cable") || lower.includes("polea") ? "Cable / polea" : lower.includes("maquina") || lower.includes("peck-deck") || lower.includes("prensa") ? "Máquina" : lower.includes("barra") ? "Barra" : lower.includes("mancuerna") ? "Mancuernas" : "";
    const loadBasis = sourceLoadBasis === "bodyweight_plus_kg" ? "added_kg" : sourceLoadBasis === "bodyweight" ? "unknown" : sourceLoadBasis;
    return Object.freeze({ id, name, group, sourceLoadBasis, resistanceMode, variant, settings: "", loadBasis, swapGroup: normalize(group).split("/")[0], aliases: ALIASES[id] || [], active: true });
  }));
  const byId = new Map(catalog.map((exercise) => [exercise.id, exercise]));
  function readCustom(storage) { try { const parsed = JSON.parse((storage || root.localStorage).getItem(CUSTOM_KEY) || "[]"); return Array.isArray(parsed) ? parsed.filter((item) => item && item.id && item.name) : []; } catch (_) { return []; } }
  function writeCustom(items, storage) { (storage || root.localStorage).setItem(CUSTOM_KEY, JSON.stringify(items)); }
  function all(storage) { return [...catalog, ...readCustom(storage)]; }
  function find(id, storage) { return all(storage).find((item) => item.id === id) || null; }
  function search(query, group, storage) {
    const wanted = normalize(query);
    return all(storage).filter((item) => {
      const matchGroup = !group || group === "Todos" || item.group === group || item.group.startsWith(group) ||
        (group === "Brazos" && (item.group.includes("Bíceps") || item.group.includes("Tríceps") || item.group.includes("Braquial"))) ||
        (group === "Core" && item.group === "Abdomen");
      const matchQuery = !wanted || [item.name, item.group, item.variant, ...(item.aliases || [])].map(normalize).join(" ").includes(wanted);
      return matchGroup && matchQuery;
    });
  }
  if (!catalog.length || byId.size !== catalog.length) throw new Error("Catálogo de ejercicios inválido o con IDs duplicados.");
  return Object.freeze({ CUSTOM_KEY, GROUPS, CATALOG: catalog, byId, all, find, readCustom, writeCustom, search });
});
