(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TrainingDayTemplates = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const slot = (slotId, catalogId, sets, repsMin, repsMax, rest, cue, perSide, recommendedAlternativeIds) => ({ slotId, catalogId, sets, repsMin, repsMax, targetRir: "1–2", rest, cue, perSide: Boolean(perSide), recommendedAlternativeIds: recommendedAlternativeIds || [] });
  const templates = Object.freeze({
    A: Object.freeze({ id: "dame-cana-day-a", title: "Día A — Cadena Anterior & Empuje / Glúteo", revision: 1, exercises: Object.freeze([
      slot("A01","E001",3,8,12,"2–4 min","Máxima extensión de cadera, pausa 1s arriba.",false,["E002","E003"]), slot("A02","E007",3,8,12,"2–3 min","Recorrido profundo controlado, pies a media altura.",false,["E004","E005","E006"]), slot("A03","E026",3,8,12,"2–3 min","Llevar a esternón sin balanceo lumbar.",false,["E028"]), slot("A04","E036",3,8,12,"2–3 min","Banco a 20°–30°, trayectoria fija hacia clavícula.",false,["E035","E037"]), slot("A05","E020",3,12,20,"90–150 s","Cable a la altura de la muñeca, plano escapular.",false,["E019","E021"]), slot("A06","E042",2,10,15,"90–150 s","Codos cómodos, estiramiento completo en flexión.",false,["E043"]), slot("A07","E053",2,8,15,"90–150 s","Flexión espinal controlada, cadera fija.",false,["E054"])
    ]) }),
    B: Object.freeze({ id: "dame-cana-day-b", title: "Día B — Cadena Posterior & Tracción / Isquios", revision: 1, exercises: Object.freeze([
      slot("B01","E011",3,6,10,"2–4 min","Bisagra de cadera pura, rodillas semiflexionadas.",false,["E012"]), slot("B02","E048",3,8,15,"90–150 s","Almohadilla apretada al muslo, pelvis estable.",false,["E049"]), slot("B03","E031",3,8,12,"2–3 min","Pecho en cojín, tracción escapular sin lumbar.",false,["E032","E033"]), slot("B04","E022",3,12,20,"90–150 s","Asiento regulado, brazos casi rectos.",false,["E023","E024"]), slot("B05","E044",2,8,15,"90–150 s","Apoyo a 45°, no despegar codos.",false,["E045","E046"]), slot("B06","E047",2,10,15,"90–150 s","Eje alineado con rodilla, pausa arriba.",false,[]), slot("B07","E050",2,8,15,"90–150 s","Pausa abajo en estiramiento completo.",false,["E051"])
    ]) }),
    C: Object.freeze({ id: "dame-cana-day-c", title: "Día C — Unilateral & Densidad / Glúteo", revision: 1, exercises: Object.freeze([
      slot("C01","E008",3,8,12,"2–4 min","Tronco levemente inclinado, empezar pierna débil.",true,["E009","E010"]), slot("C02","E015",3,12,25,"90–150 s","Pelvis pegada al respaldo, pausa en apertura.",false,["E016"]), slot("C03","E038",3,8,12,"2–3 min","Recorrido completo y tolerado.",false,["E039"]), slot("C04","E030",2,10,15,"90–150 s","Codos ligeramente flexionados, costillas abajo.",false,["E029"]), slot("C05","E020",3,12,20,"90–150 s","Recalibrar carga para llegar al rango sin fallo técnico.",false,["E019","E021"]), slot("C06","E024",2,10,15,"90–150 s","Codos abiertos a 60°, tracción amplia.",false,["E022","E023"]), slot("C07","E051",2,8,15,"90–150 s","En prensa o de pie, ritmo controlado.",false,["E050"])
    ]) })
  });
  function validate(template, catalog) { return Boolean(template && Array.isArray(template.exercises) && template.exercises.length === 7 && template.exercises.every((item) => catalog && catalog.has(item.catalogId) && Number.isInteger(item.sets) && item.sets > 0)); }
  return Object.freeze({ TEMPLATES: templates, validate });
});
