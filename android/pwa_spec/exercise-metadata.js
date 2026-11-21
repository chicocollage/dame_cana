(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TrainingExerciseMetadata = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const text = (value) => String(value == null ? "" : value).trim();
  const normalized = (value) => text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  function resistanceMode(source) {
    const value = normalized(source);
    if (/\btrx\b/.test(value)) return "trx";
    if (/\b(?:maquina|smith|polea|cable|mancuernas?|barra|technogym|hammer strength|life fitness|panatta|matrix)\b/.test(value)) return "external";
    if (/\b(?:autocarga|peso corporal|bodyweight|dominadas?|flexiones?|fondos? en paralelas|burpees?|planchas?|muscle[ -]?ups?|sentadilla pistol)\b/.test(value)) return "bodyweight";
    return "external";
  }

  function variantFrom(source) {
    const value = normalized(source);
    if (/\btrx\b/.test(value)) return "TRX";
    if (/\bsmith\b/.test(value)) return "Smith";
    const brands = [
      ["technogym", "Technogym"],
      ["hammer strength", "Hammer Strength"],
      ["life fitness", "Life Fitness"],
      ["panatta", "Panatta"],
      ["matrix", "Matrix"]
    ];
    const brand = brands.find(([key]) => value.includes(key));
    if (brand) return `Máquina ${brand[1]}`;
    if (/\b(?:polea|cable)\b/.test(value)) return "Cable / polea";
    if (/\bmancuernas?\b/.test(value)) return "Mancuernas";
    if (/\bbarra\b/.test(value)) return "Barra";
    if (/\bmaquina\b/.test(value)) return "Máquina";
    if (resistanceMode(value) === "bodyweight") return "Autocarga";
    return "";
  }

  function settingsFrom(source) {
    const value = text(source);
    const matches = value.match(/\b(?:asiento|respaldo|tope|posición|posicion|altura|correas?|marca de pies|pies en marca)\s*(?:en|:|=)?\s*[a-z0-9+.-]+/gi) || [];
    return [...new Set(matches.map((item) => item.replace(/\s+/g, " ").trim()))].join(" · ");
  }

  function loadBasisFrom(source) {
    const value = normalized(source);
    if (/\b(?:marcador|pila|stack)\b/.test(value)) return "machine_stack_kg";
    if (/\b(?:lastre|peso anadido|carga anadida)\b/.test(value)) return "added_kg";
    if (/(?:\d+(?:[.,]\d+)?\s*(?:kg|kilos?)|discos?|placas?)\s*(?:por|cada)\s+lado\b/.test(value)) return "per_side_kg";
    if (/\b(?:carga total|\d+(?:[.,]\d+)?\s*(?:kg|kilos?)\s+totales?)\b/.test(value)) return "total_kg";
    return "unknown";
  }

  function infer(exercise) {
    const name = text(exercise && exercise.name);
    const context = [name, exercise && exercise.cue, exercise && exercise.identityText].map(text).filter(Boolean).join(" · ");
    return {
      resistanceMode: resistanceMode(context),
      variant: variantFrom(context),
      settings: settingsFrom(context),
      loadBasis: loadBasisFrom(context),
      detected: true
    };
  }

  function hasUsefulIdentity(identity) {
    if (!identity) return false;
    return Boolean(text(identity.variant) || text(identity.settings) || (text(identity.loadBasis) && identity.loadBasis !== "unknown") || (text(identity.resistanceMode) && identity.resistanceMode !== "external"));
  }

  function combine(inferred, inherited) {
    if (!hasUsefulIdentity(inherited)) return { ...inferred };
    if (hasUsefulIdentity(inferred) && text(inherited.resistanceMode) && inherited.resistanceMode !== inferred.resistanceMode) return { ...inferred };
    return {
      resistanceMode: text(inherited.resistanceMode) || inferred.resistanceMode || "external",
      variant: text(inherited.variant) || inferred.variant,
      settings: text(inherited.settings) || inferred.settings,
      loadBasis: text(inherited.loadBasis) && inherited.loadBasis !== "unknown" ? inherited.loadBasis : inferred.loadBasis,
      detected: false
    };
  }

  return { combine, hasUsefulIdentity, infer, loadBasisFrom, resistanceMode, settingsFrom, variantFrom };
});
