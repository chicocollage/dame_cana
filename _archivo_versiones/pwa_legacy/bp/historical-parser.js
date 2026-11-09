(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TrainingHistoricalParser = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const text = (value) => String(value == null ? "" : value).trim();
  const normalized = (value) => text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");

  function lineMessage(line, message) {
    return `Línea ${line}: ${message}`;
  }

  function calendarDate(value) {
    const match = text(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return "";
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return "";
    return `${match[1]}-${match[2]}-${match[3]}T12:00:00`;
  }

  function parseMode(value) {
    const key = normalized(value);
    if (["external", "carga", "carga externa", "externa"].includes(key)) return "external";
    if (key === "trx") return "trx";
    if (["bodyweight", "autocarga", "peso corporal"].includes(key)) return "bodyweight";
    return "";
  }

  function parseLoadBasis(value) {
    const key = normalized(value).replace(/_/g, " ");
    if (["", "unknown", "desconocida", "desconocido"].includes(key)) return "unknown";
    if (["total", "carga total", "total kg"].includes(key)) return "total_kg";
    if (["por lado", "carga por lado", "per side kg"].includes(key)) return "per_side_kg";
    if (["marcador", "marcador de maquina", "pila", "stack", "machine stack kg"].includes(key)) return "machine_stack_kg";
    if (["lastre", "lastre anadido", "carga anadida", "added kg"].includes(key)) return "added_kg";
    return "";
  }

  function parseObjective(value) {
    const match = text(value).match(/^(\d+)\s*(?:x|×)\s*(\d+)(?:\s*[-–—a]\s*(\d+))?\s*(?:reps?|repeticiones?)?\s*(por\s+lado)?$/i);
    if (!match) return null;
    const sets = Number(match[1]);
    const repsMin = Number(match[2]);
    const repsMax = Number(match[3] || match[2]);
    if (sets < 1 || sets > 20 || repsMin < 1 || repsMax < repsMin) return null;
    return { sets, repsMin, repsMax, perSide: Boolean(match[4]) };
  }

  function parseRir(value) {
    const match = text(value).match(/^(\d+(?:[.,]\d+)?)(?:\s*[-–—a]\s*(\d+(?:[.,]\d+)?))?$/i);
    if (!match) return "";
    const first = match[1].replace(",", ".");
    const second = match[2] ? match[2].replace(",", ".") : "";
    return second ? `${first}–${second}` : first;
  }

  function parseNumber(value, integerOnly) {
    const source = text(value).replace(/\s*kg$/i, "");
    const expression = integerOnly ? /^\d+$/ : /^\d+(?:[.,]\d+)?$/;
    if (!expression.test(source)) return "";
    return source.replace(",", ".");
  }

  function emptyExercise(name, line) {
    return {
      name,
      sets: 0,
      repsMin: null,
      repsMax: null,
      perSide: false,
      targetRir: "",
      rest: "",
      cue: "",
      identity: {
        resistanceMode: "",
        variant: "",
        settings: "",
        loadBasis: "unknown",
        detected: false
      },
      note: "",
      entries: [],
      _line: line,
      _modeLine: 0,
      _basisLine: 0,
      _objectiveSets: 0,
      _series: new Map(),
      _seen: new Set()
    };
  }

  function cleanExercise(exercise) {
    return {
      name: exercise.name,
      sets: exercise.sets,
      repsMin: exercise.repsMin,
      repsMax: exercise.repsMax,
      perSide: exercise.perSide,
      targetRir: exercise.targetRir,
      rest: exercise.rest,
      cue: exercise.cue,
      identity: exercise.identity,
      note: exercise.note,
      entries: exercise.entries
    };
  }

  function parseHistoricalWorkout(source) {
    const input = String(source == null ? "" : source).replace(/\r/g, "");
    const warnings = [];
    const errors = [];
    const draft = {
      title: "",
      date: "",
      finished: true,
      exercises: []
    };
    let current = null;
    let seenDate = false;
    let seenTitle = false;
    let seenFinished = false;

    function finalizeExercise() {
      if (!current) return;
      if (!current._series.size) errors.push(lineMessage(current._line, `el ejercicio «${current.name}» no contiene ninguna serie.`));

      const seriesNumbers = Array.from(current._series.keys());
      const highestSeries = seriesNumbers.length ? Math.max(...seriesNumbers) : 0;
      const totalSets = Math.max(current._objectiveSets, highestSeries);
      current.sets = totalSets;
      current.entries = Array.from({ length: totalSets }, (_, index) => {
        const record = current._series.get(index + 1);
        if (record) return record.entry;
        return { load: "", difficulty: "", reps: "", rir: "" };
      });

      if (current._objectiveSets && seriesNumbers.length < current._objectiveSets) {
        warnings.push(lineMessage(current._line, `registro parcial: hay ${seriesNumbers.length} de ${current._objectiveSets} series indicadas.`));
      }
      if (current._objectiveSets && highestSeries > current._objectiveSets) {
        warnings.push(lineMessage(current._line, `hay series por encima de las ${current._objectiveSets} previstas; se conservan todas.`));
      }
      for (let index = 1; index <= highestSeries; index += 1) {
        if (!current._series.has(index)) warnings.push(lineMessage(current._line, `falta la Serie ${index}; se conserva vacía.`));
      }

      const hasLoad = Array.from(current._series.values()).some((record) => record.entry.load);
      const hasDifficulty = Array.from(current._series.values()).some((record) => record.entry.difficulty);
      if (!current.identity.resistanceMode) {
        if (hasDifficulty) {
          errors.push(lineMessage(current._line, `el ejercicio «${current.name}» usa dificultad pero no indica si el modo es TRX o autocarga.`));
        } else if (hasLoad) {
          current.identity.resistanceMode = "external";
          warnings.push(lineMessage(current._line, `Modo ausente en «${current.name}»; la carga explícita permite proponer carga externa para revisión.`));
        } else {
          errors.push(lineMessage(current._line, `Modo ausente en «${current.name}»; indica carga externa, TRX o autocarga.`));
        }
      }
      if (current.identity.resistanceMode === "external" && hasDifficulty) {
        const record = Array.from(current._series.values()).find((item) => item.entry.difficulty);
        errors.push(lineMessage(record.line, "dificultad no es compatible con el modo carga externa."));
      }
      if (["trx", "bodyweight"].includes(current.identity.resistanceMode) && hasLoad) {
        const record = Array.from(current._series.values()).find((item) => item.entry.load);
        errors.push(lineMessage(record.line, `carga no es compatible con el modo ${current.identity.resistanceMode === "trx" ? "TRX" : "autocarga"}; usa dificultad.`));
      }
      if (current.identity.resistanceMode !== "external" && current.identity.loadBasis !== "unknown") {
        errors.push(lineMessage(current._basisLine || current._line, "Base de carga solo es compatible con carga externa."));
      }

      draft.exercises.push(cleanExercise(current));
      current = null;
    }

    function setExerciseField(field, value, line) {
      if (current._seen.has(field)) {
        errors.push(lineMessage(line, `el campo ${field} está repetido en este ejercicio.`));
        return;
      }
      current._seen.add(field);
      if (!text(value)) {
        errors.push(lineMessage(line, `el campo ${field} está vacío.`));
        return;
      }

      if (field === "Modo") {
        const mode = parseMode(value);
        if (!mode) errors.push(lineMessage(line, `Modo no reconocido: «${text(value)}». Usa carga externa, TRX o autocarga.`));
        current.identity.resistanceMode = mode;
        current._modeLine = line;
      } else if (field === "Variante") current.identity.variant = text(value);
      else if (field === "Ajustes") current.identity.settings = text(value);
      else if (field === "Base de carga") {
        const basis = parseLoadBasis(value);
        if (!basis) errors.push(lineMessage(line, `Base de carga no reconocida: «${text(value)}».`));
        else current.identity.loadBasis = basis;
        current._basisLine = line;
      } else if (field === "Objetivo") {
        const objective = parseObjective(value);
        if (!objective) errors.push(lineMessage(line, "Objetivo no válido. Usa, por ejemplo, 3 x 8-10."));
        else {
          current._objectiveSets = objective.sets;
          current.repsMin = objective.repsMin;
          current.repsMax = objective.repsMax;
          current.perSide = objective.perSide;
        }
      } else if (field === "RIR objetivo") {
        const rir = parseRir(value);
        if (!rir) errors.push(lineMessage(line, "RIR objetivo no válido."));
        else current.targetRir = rir;
      } else if (field === "Descanso") current.rest = text(value);
      else if (field === "Notas") current.note = text(value);
    }

    function parseSeries(number, body, line) {
      if (number < 1 || number > 100) {
        errors.push(lineMessage(line, "el número de serie debe estar entre 1 y 100."));
        return;
      }
      if (current._series.has(number)) {
        errors.push(lineMessage(line, `la Serie ${number} está repetida.`));
        return;
      }
      const entry = { load: "", difficulty: "", reps: "", rir: "" };
      const seen = new Set();
      const parts = text(body).split(";").map(text).filter(Boolean);
      if (!parts.length) {
        errors.push(lineMessage(line, `la Serie ${number} está vacía.`));
        return;
      }
      parts.forEach((part) => {
        const match = part.match(/^([^=]+)=(.*)$/);
        if (!match) {
          errors.push(lineMessage(line, `dato de serie no válido: «${part}»; usa campo=valor.`));
          return;
        }
        const key = normalized(match[1]);
        const value = text(match[2]);
        if (!value) {
          errors.push(lineMessage(line, `el valor de ${text(match[1])} está vacío.`));
          return;
        }
        if (!['carga', 'dificultad', 'reps', 'rir'].includes(key)) {
          errors.push(lineMessage(line, `campo de serie no reconocido: «${text(match[1])}».`));
          return;
        }
        if (seen.has(key)) {
          errors.push(lineMessage(line, `el campo ${key} está repetido en la Serie ${number}.`));
          return;
        }
        seen.add(key);
        if (key === "carga") {
          const load = parseNumber(value, false);
          if (!load) errors.push(lineMessage(line, `carga no válida en la Serie ${number}.`));
          else entry.load = load;
        } else if (key === "dificultad") entry.difficulty = value;
        else if (key === "reps") {
          const reps = parseNumber(value, true);
          if (!reps) errors.push(lineMessage(line, `reps no válidas en la Serie ${number}.`));
          else entry.reps = reps;
        } else if (key === "rir") {
          const rir = parseNumber(value, false);
          if (!rir) errors.push(lineMessage(line, `RIR no válido en la Serie ${number}.`));
          else entry.rir = rir;
        }
      });
      current._series.set(number, { entry, line });
    }

    const lines = input.split("\n");
    lines.forEach((rawLine, index) => {
      const line = index + 1;
      const content = text(rawLine);
      if (!content) return;

      const exerciseMatch = content.match(/^Ejercicio\s*:\s*(.*)$/i);
      if (exerciseMatch) {
        finalizeExercise();
        const name = text(exerciseMatch[1]);
        if (!name) errors.push(lineMessage(line, "Ejercicio está vacío."));
        current = emptyExercise(name || "Ejercicio sin nombre", line);
        return;
      }

      const seriesMatch = content.match(/^Serie\s+(\d+)\s*:\s*(.*)$/i);
      if (seriesMatch) {
        if (!current) errors.push(lineMessage(line, "Serie aparece antes del primer Ejercicio."));
        else parseSeries(Number(seriesMatch[1]), seriesMatch[2], line);
        return;
      }

      const fieldMatch = content.match(/^([^:]+)\s*:\s*(.*)$/);
      if (!fieldMatch) {
        errors.push(lineMessage(line, "formato no reconocido; usa una etiqueta seguida de dos puntos."));
        return;
      }
      const label = normalized(fieldMatch[1]);
      const value = fieldMatch[2];

      if (label === "fecha" || label === "entrenamiento" || label === "finalizado") {
        if (current) {
          errors.push(lineMessage(line, `${text(fieldMatch[1])} debe aparecer antes del primer Ejercicio.`));
          return;
        }
        if (label === "fecha") {
          if (seenDate) errors.push(lineMessage(line, "Fecha está repetida."));
          seenDate = true;
          const date = calendarDate(value);
          if (!date) errors.push(lineMessage(line, "Fecha no válida; usa AAAA-MM-DD."));
          else draft.date = date;
        } else if (label === "entrenamiento") {
          if (seenTitle) errors.push(lineMessage(line, "Entrenamiento está repetido."));
          seenTitle = true;
          if (!text(value)) errors.push(lineMessage(line, "Entrenamiento está vacío."));
          else draft.title = text(value);
        } else {
          if (seenFinished) errors.push(lineMessage(line, "Finalizado está repetido."));
          seenFinished = true;
          const answer = normalized(value);
          if (["si", "sí", "true", "1"].includes(answer)) draft.finished = true;
          else if (["no", "false", "0"].includes(answer)) draft.finished = false;
          else errors.push(lineMessage(line, "Finalizado no válido; usa sí o no."));
        }
        return;
      }

      if (!current) {
        errors.push(lineMessage(line, `campo «${text(fieldMatch[1])}» fuera de un bloque Ejercicio.`));
        return;
      }

      const exerciseLabels = {
        modo: "Modo",
        variante: "Variante",
        ajustes: "Ajustes",
        base: "Base de carga",
        "base de carga": "Base de carga",
        objetivo: "Objetivo",
        "rir objetivo": "RIR objetivo",
        descanso: "Descanso",
        notas: "Notas",
        "notas de movimiento": "Notas"
      };
      const field = exerciseLabels[label];
      if (!field) errors.push(lineMessage(line, `campo no reconocido: «${text(fieldMatch[1])}».`));
      else setExerciseField(field, value, line);
    });

    finalizeExercise();
    if (!input.trim()) errors.push("El texto histórico está vacío.");
    if (!seenDate) errors.push("Falta el campo Fecha en la cabecera.");
    if (!seenTitle) errors.push("Falta el campo Entrenamiento en la cabecera.");
    if (!draft.exercises.length) errors.push("Falta al menos un bloque Ejercicio.");

    return {
      draft: draft.exercises.length || draft.title || draft.date ? draft : null,
      warnings,
      error: errors.join("\n")
    };
  }

  return { parseHistoricalWorkout };
});
