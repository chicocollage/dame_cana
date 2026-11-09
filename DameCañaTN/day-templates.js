(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TrainingDayTemplates = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const slot = (slotId, catalogId, sets, repsMin, repsMax, rest, cue, perSide, recommendedAlternativeIds) => ({ slotId, catalogId, sets, repsMin, repsMax, targetRir: "1–2", rest, cue, perSide: Boolean(perSide), recommendedAlternativeIds: recommendedAlternativeIds || [] });
  const templates = Object.freeze({
    A: Object.freeze({ id: "dame-cana-day-a", title: "Día A — Nuclear 1 · Glúteo y Cuádriceps", revision: 3, exercises: Object.freeze([
      slot("A02","E004",3,8,12,"2–4 min","Variante G04-V1 (pies en tercio medio-alto, pausa 0.5–1 s abajo sin retroversión pélvica; discos añadidos) → Busca: máxima flexión de cadera en elongación para hipertrofiar fibras inferiores del glúteo mayor y rellenar/elevar el polo inferior sobre el pliegue glúteo",false,["E005", "E006", "E007"]),
      slot("A01","E001",3,6,10,"2–4 min","Pelvis estable; bloqueo con extensión de cadera, no lumbar; recorrido reproducible",false,["E002", "E003"]),
      slot("A03","E015",3,15,20,"90–150 s","Pelvis fija contra el respaldo; pausa de 1 s en máxima abducción",false,["E016"]),
      slot("A04","E050",3,10,15,"90–150 s","Rodilla bloqueada en extensión; pausa de 2 s abajo en estiramiento completo",false,["E051"]),
      slot("A05","E053",2,10,15,"90–150 s","Flexión espinal activa; cadera inmóvil",false,["E054"])
    ]) }),
    B: Object.freeze({ id: "dame-cana-day-b", title: "Día B — Satélite 1 · Brazos y Deltoides Lateral", revision: 3, exercises: Object.freeze([
      slot("B01","E042",3,10,15,"90–150 s","Codo estable; flexión profunda buscando estiramiento de cabeza larga",false,["E043"]),
      slot("B02","E045",3,10,12,"90–150 s","Hombro en hiperextensión ligera detrás del torso; flexión sin balanceo",false,["E044"]),
      slot("B03","E020",3,12,20,"90–150 s","Polea a altura de rodilla; cuerpo ligeramente inclinado; plano escapular",true,["E019", "E021"]),
      slot("B04","E054",2,15,20,"90 s","Variante T02-V3 (despegue sacro obligatorio hacia esternón + espiración forzada 1 s arriba + micro-orientación oblicua 10°–15° en últimas 4–5 reps; descenso vértebra a vértebra) → Busca: hipertrofiar fibras inferomediales del oblicuo interno/externo y transverso sobre el ligamento inguinal para marcar el escalón del Cinturón de Adonis sin ensanchar cintura",false,["E056"])
    ]) }),
    C: Object.freeze({ id: "dame-cana-day-c", title: "Día C — Nuclear 2 · Torso Pesado", revision: 3, exercises: Object.freeze([
      slot("C01","E035",3,6,10,"2–3 min","Estación DHZ Chest Press con banco en posición 3 desde abajo (~25°–30°); trayectoria hacia clavícula; retracción escapular firme",false,["E036", "E037"]),
      slot("C02","E026",3,8,12,"2–3 min","Torso ligeramente inclinado; codos hacia las caderas sin impulso lumbar",false,["E028"]),
      slot("C03","E038",3,8,12,"2–3 min","Asiento alineado con esternón medio; empuje convergente controlado",false,["E039"]),
      slot("C04","E031",3,8,12,"2–3 min","Pecho firme en apoyo; tracción con separación de codos a ~60°",false,["E032", "E033"]),
      slot("C05","E030",2,10,15,"90–150 s","Codos ligeramente desbloqueados fijos; arco amplio; caja torácica contenida",false,["E029"])
    ]) }),
    D: Object.freeze({ id: "dame-cana-day-d", title: "Día D — Nuclear 3 · Glúteo y Cadena Posterior", revision: 3, exercises: Object.freeze([
      slot("D01","E008",3,8,12,"2–4 min","Variante G08-V1 (tibia delantera casi vertical, tronco 15°–25° al frente, pausa 1 s abajo; iniciar lado menos competente) → Busca: sobrecargar en elongación máxima las fibras inferiores del glúteo mayor para dar soporte interno y elevar el pliegue subglúteo",true,["E009", "E010"]),
      slot("D02","E011",3,6,10,"2–4 min","Bisagra pura (rodilla fija 15°–20°), proyectando isquiones atrás/arriba con pausa 1 s en máximo estiramiento → Busca: hipertrofiar el origen isquiático e inserción glútea inferior para rellenar el escalón justo debajo del pliegue",false,["E012"]),
      slot("D03","E048",3,8,12,"90–150 s","Variante L02-V1 (torso inclinado 10°–15° al frente desde cadera, muslo bien fijado, pausa 1 s en acortamiento) → Busca: hiperelongar los isquiosurales biarticulares en su origen proximal (isquion) para engrosar la transición alta glúteo-femoral",false,["E049"]),
      slot("D04","E047",2,12,15,"90–150 s","Eje de giro alineado con la rodilla; pausa de 1 s arriba; bajada en 2 s",false,[]),
      slot("D05","E016",2,15,20,"60–90 s","Polea baja con tobillera; trayectoria diagonal a 30° detrás del plano frontal",true,["E015"])
    ]) }),
    E: Object.freeze({ id: "dame-cana-day-e", title: "Día E — Satélite 2 · Brazos, Deltoides Posterior y Detalle", revision: 3, exercises: Object.freeze([
      slot("E01","E044",3,8,12,"90–150 s","Apoyo a 45°; codos fijos sin despegarlos del tapizado",false,["E045", "E046"]),
      slot("E02","E043",3,10,15,"90–150 s","Codos pegados al costado; abrir la cuerda abajo separando muñecas",false,["E042"]),
      slot("E03","E022",3,12,15,"90–150 s","Brazos casi extendidos a la altura de los hombros; apertura en plano horizontal",false,["E023", "E024"]),
      slot("E04","E021",3,15,20,"90–150 s","Asiento regulado de modo que el eje del hombro coincida con el eje de rotación de las levas; almohadillas en codos",false,["E019", "E020"]),
      slot("E05","E015",1,25,30,"Fin de sesión","Bombeo metabólico sin daño excéntrico; cadencia fluida hasta congestión total",false,["E016"])
    ]) })
  });
  function validate(template, catalog) { return Boolean(template && Array.isArray(template.exercises) && template.exercises.length >= 3 && template.exercises.every((item) => catalog && catalog.has(item.catalogId) && Number.isInteger(item.sets) && item.sets > 0)); }
  return Object.freeze({ TEMPLATES: templates, validate });
});
