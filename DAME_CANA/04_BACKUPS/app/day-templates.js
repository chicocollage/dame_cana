(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TrainingDayTemplates = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const slot = (slotId, catalogId, sets, repsMin, repsMax, rest, cue, perSide, recommendedAlternativeIds) => ({ slotId, catalogId, sets, repsMin, repsMax, targetRir: "1–2", rest, cue, perSide: Boolean(perSide), recommendedAlternativeIds: recommendedAlternativeIds || [] });
  const templates = Object.freeze({
    A: Object.freeze({ id: "dame-cana-day-a", title: "Día A — Nuclear 1 · Glúteo y Cuádriceps", revision: 3, exercises: Object.freeze([
      slot("A01","E001",3,6,10,"2–4 min","Pelvis estable; bloqueo con extensión de cadera, no lumbar.",false,["E002","E003"]),
      slot("A02","E004",3,8,12,"2–4 min","Máxima profundidad útil y reproducible sin perder apoyo pélvico.",false,["E005","E006","E007"]),
      slot("A03","E015",3,15,20,"90–150 s","Pelvis pegada al respaldo, pausa de 1 s en apertura.",false,["E016"]),
      slot("A04","E050",3,10,15,"90–150 s","En Hack o de pie, pausa estricta de 2 s abajo.",false,["E051"]),
      slot("A05","E053",2,10,15,"90–150 s","Flexión espinal activa; cadera fija.",false,["E054"])
    ]) }),
    B: Object.freeze({ id: "dame-cana-day-b", title: "Día B — Satélite 1 · Brazos y Deltoides Lateral", revision: 3, exercises: Object.freeze([
      slot("B01","E042",3,10,15,"90–150 s","Codos cómodos, estiramiento completo en flexión (1 o 2 manos).",false,["E043"]),
      slot("B02","E045",3,10,12,"90–150 s","Hombro en hiperextensión ligera detrás del torso; flexión sin balanceo.",false,["E044"]),
      slot("B03","E020",3,12,20,"90–150 s","Polea a altura de rodilla; cuerpo inclinado; plano escapular.",false,["E019","E021"]),
      slot("B04","E054",2,15,20,"90 s","Retroversión pélvica activa arriba; bajada lenta.",false,["E056"])
    ]) }),
    C: Object.freeze({ id: "dame-cana-day-c", title: "Día C — Nuclear 2 · Torso Pesado", revision: 3, exercises: Object.freeze([
      slot("C01","E035",3,6,10,"2–3 min","Banco a 20°–30°, trayectoria fija hacia clavícula.",false,["E036","E037"]),
      slot("C02","E026",3,8,12,"2–3 min","Llevar a esternón sin balanceo lumbar.",false,["E028"]),
      slot("C03","E038",3,8,12,"2–3 min","Asiento a esternón medio; empuje convergente controlado.",false,["E039"]),
      slot("C04","E031",3,8,12,"2–3 min","Pecho en cojín, tracción escapular sin lumbar.",false,["E032","E033"]),
      slot("C05","E030",2,10,15,"90–150 s","Codos ligeramente flexionados, costillas abajo.",false,["E029"])
    ]) }),
    D: Object.freeze({ id: "dame-cana-day-d", title: "Día D — Nuclear 3 · Glúteo y Cadena Posterior", revision: 3, exercises: Object.freeze([
      slot("D01","E008",3,8,12,"2–4 min","Tronco levemente inclinado, empezar pierna débil.",true,["E009","E010"]),
      slot("D02","E011",3,6,10,"2–4 min","Bisagra de cadera pura, rodillas semiflexionadas.",false,["E012"]),
      slot("D03","E048",3,8,12,"90–150 s","Almohadilla apretada al muslo, pelvis estable.",false,["E049"]),
      slot("D04","E047",2,12,15,"90–150 s","Eje alineado con rodilla, pausa arriba.",false,[]),
      slot("D05","E016",2,15,20,"60–90 s","Polea baja con tobillera, trayectoria a 30°.",false,["E015"])
    ]) }),
    E: Object.freeze({ id: "dame-cana-day-e", title: "Día E — Satélite 2 · Brazos, Deltoides Posterior y Detalle", revision: 3, exercises: Object.freeze([
      slot("E01","E044",3,8,12,"90–150 s","Apoyo a 45°, no despegar codos del tapizado.",false,["E045","E046"]),
      slot("E02","E043",3,10,15,"90–150 s","Codos pegados al costado; abrir cuerda abajo.",false,["E042"]),
      slot("E03","E022",3,12,15,"90–150 s","Asiento regulado, brazos casi rectos.",false,["E023","E024"]),
      slot("E04","E021",3,15,20,"90–150 s","Tronco inclinado 10°; plano escapular; sin inercia.",false,["E019","E020"]),
      slot("E05","E015",1,25,30,"Fin","Bombeo metabólico sin daño excéntrico.",false,["E016"])
    ]) })
  });
  function validate(template, catalog) { return Boolean(template && Array.isArray(template.exercises) && template.exercises.length >= 3 && template.exercises.every((item) => catalog && catalog.has(item.catalogId) && Number.isInteger(item.sets) && item.sets > 0)); }
  return Object.freeze({ TEMPLATES: templates, validate });
});
