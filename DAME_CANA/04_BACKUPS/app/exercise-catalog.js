(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TrainingExerciseCatalog = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const CUSTOM_KEY = "exercise_catalog_custom.v1";
  const GROUPS = ["Glúteo", "Cuádriceps", "Isquios", "Espalda", "Pecho", "Hombro", "Brazos", "Core", "Gemelo", "Abdomen"];
  const source = [
    ["E001","Hip thrust en máquina","Glúteo","total_kg"],["E002","Hip thrust en Smith","Glúteo","total_kg"],["E003","Hip thrust con barra","Glúteo","total_kg"],["E004","Hack squat profunda","Cuádriceps","total_kg"],["E005","Sentadilla pendular profunda","Cuádriceps","total_kg"],["E006","Sentadilla profunda en Smith","Cuádriceps","total_kg"],["E007","Prensa profunda","Cuádriceps","total_kg"],["E008","Bulgarian split squat en Smith","Glúteo/Cuádriceps","per_side_kg"],["E009","Bulgarian con mancuernas","Glúteo/Cuádriceps","per_side_kg"],["E010","Zancada inversa en Smith","Glúteo/Cuádriceps","per_side_kg"],["E011","Peso muerto rumano en Smith","Isquios/Glúteo","total_kg"],["E012","Peso muerto rumano con mancuernas","Isquios/Glúteo","total_kg"],["E013","Hiperextensión a 45° sesgada a glúteo","Glúteo","bodyweight_plus_kg"],["E014","Extensión de cadera en cable","Glúteo","per_side_kg"],["E015","Abducción de cadera en máquina","Glúteo medio","total_kg"],["E016","Abducción unilateral en cable","Glúteo medio","per_side_kg"],["E017","Power Squat / Leverage Power Squat","Cuádriceps","total_kg"],["E018","V-Squat / Lever V-Squat","Cuádriceps","total_kg"],["E019","Elevación lateral en máquina","Hombro lateral","total_kg"],["E020","Elevación lateral unilateral en cable","Hombro lateral","per_side_kg"],["E021","Elevación lateral con mancuernas","Hombro lateral","total_kg"],["E022","Peck-deck inverso","Hombro posterior","total_kg"],["E023","Apertura inversa en cable","Hombro posterior","total_kg"],["E024","Remo posterior con pecho apoyado","Hombro posterior","total_kg"],["E025","Press de hombro en máquina","Hombro","total_kg"],["E026","Jalón medio/neutro","Espalda/Dorsal","total_kg"],["E027","Dominada neutra asistida","Espalda/Dorsal","bodyweight_plus_kg"],["E028","Jalón unilateral en cable","Espalda/Dorsal","per_side_kg"],["E029","Pullover en máquina","Espalda/Dorsal","total_kg"],["E030","Jalón con brazos rectos (Pullover cable)","Espalda/Dorsal","total_kg"],["E031","Remo convergente con pecho apoyado","Espalda media","total_kg"],["E032","Remo T-bar con pecho apoyado","Espalda media","total_kg"],["E033","Remo sentado en cable (Gironda)","Espalda media","total_kg"],["E034","Remo unilateral en cable con apoyo","Espalda media","per_side_kg"],["E035","Press convergente inclinado moderado","Pecho","total_kg"],["E036","Press inclinado en Smith 15-30°","Pecho","total_kg"],["E037","Press inclinado con mancuernas","Pecho","total_kg"],["E038","Press convergente horizontal","Pecho","total_kg"],["E039","Press plano en Smith o con mancuernas","Pecho","total_kg"],["E040","Peck-deck (Aperturas)","Pecho","total_kg"],["E041","Apertura en cable","Pecho","total_kg"],["E042","Extensión de tríceps overhead en cable","Tríceps","total_kg"],["E043","Pressdown en cable","Tríceps","total_kg"],["E044","Curl predicador en cable o máquina","Bíceps","total_kg"],["E045","Curl bayesiano en cable","Bíceps","per_side_kg"],["E046","Curl martillo en cable o mancuernas","Bíceps/Braquial","total_kg"],["E047","Extensión de rodilla","Cuádriceps","total_kg"],["E048","Curl femoral sentado","Isquios","total_kg"],["E049","Curl femoral tumbado","Isquios","total_kg"],["E050","Elevación de talones de pie en máquina","Gemelo","total_kg"],["E051","Gemelo en prensa con rodilla extendida","Gemelo","total_kg"],["E052","Elevación de talones sentada","Gemelo/Sóleo","total_kg"],["E053","Crunch en cable o máquina","Abdomen","total_kg"],["E054","Reverse crunch controlado","Abdomen","bodyweight"],["E055","Pallof press","Core","total_kg"],["E056","Forward-Lean Shrug en Smith","Espalda/Trapecio","total_kg"]
  ];
  const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const ALIASES = {
    E008: ["Sentadilla búlgara", "Búlgara Smith", "Búlgara", "Bulgarian"],
    E011: ["RDL", "RDL Smith", "Peso muerto rumano"],
    E015: ["Abductor", "Abducción sentada", "Abductor máquina"],
    E020: ["Lateral polea", "Elevación lateral cable"],
    E022: ["Posterior máquina", "Peck deck posterior"],
    E024: ["Low row", "Remo posterior"],
    E030: ["Pullover", "Pullover polea", "Pullover cable"],
    E031: ["Row", "Remo máquina", "Remo discos"],
    E042: ["Katana", "Tríceps Katana", "Extensión Katana", "Extensio Katana", "Overhead cable", "Tríceps overhead"],
    E043: ["Tríceps cuerda", "Pressdown polea"],
    E044: ["Predicador", "Banco Scott", "Curl Scott", "Predicador máquina"],
    E045: ["Bayesiano", "Curl cable detrás"],
    E050: ["Gemelo Hack", "Gemelo de pie"],
    E053: ["Crunch máquina", "Crunch polea"],
    E054: ["Reverse crunch", "Elevación de piernas", "Elevación piernas"],
    E056: ["Encogimiento en Smith con inclinacion anterior", "Encogimientos trapecio en Smith con inclinacion hacia delante", "Kelso shrug en Smith", "Encogimiento Kelso multipower", "Shrug en Smith con inclinacion hacia delante", "Encogimientos trapecio en Smith"]
  };
  const catalog = Object.freeze(source.map(([id, name, group, sourceLoadBasis]) => {
    const lower = normalize(name);
    const resistanceMode = sourceLoadBasis === "bodyweight" ? "bodyweight" : "external";
    const variant = lower.includes("smith") ? "Smith" : lower.includes("cable") ? "Cable / polea" : lower.includes("maquina") || lower.includes("peck-deck") || lower.includes("prensa") ? "Máquina" : "";
    const loadBasis = sourceLoadBasis === "bodyweight_plus_kg" ? "added_kg" : sourceLoadBasis === "bodyweight" ? "unknown" : sourceLoadBasis;
    return Object.freeze({ id, name, group, sourceLoadBasis, resistanceMode, variant, settings: "", loadBasis, swapGroup: normalize(group).split("/")[0], aliases: ALIASES[id] || [], active: true });
  }));
  const byId = new Map(catalog.map((exercise) => [exercise.id, exercise]));
  function readCustom(storage) { try { const parsed = JSON.parse((storage || root.localStorage).getItem(CUSTOM_KEY) || "[]"); return Array.isArray(parsed) ? parsed.filter((item) => item && item.id && item.name) : []; } catch (_) { return []; } }
  function writeCustom(items, storage) { (storage || root.localStorage).setItem(CUSTOM_KEY, JSON.stringify(items)); }
  function all(storage) { return [...catalog, ...readCustom(storage)]; }
  function find(id, storage) { return all(storage).find((item) => item.id === id) || null; }
  function search(query, group, storage) { const wanted = normalize(query); return all(storage).filter((item) => (!group || group === "Todos" || item.group === group || item.group.startsWith(group)) && (!wanted || [item.name, item.group, item.variant, ...(item.aliases || [])].map(normalize).join(" ").includes(wanted))); }
  if (catalog.length !== 56 || byId.size !== 56) throw new Error("Catálogo de ejercicios inválido.");
  return Object.freeze({ CUSTOM_KEY, GROUPS, CATALOG: catalog, byId, all, find, readCustom, writeCustom, search });
});
