(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TrainingParser = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const clean = (value) => String(value || "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();

  const stripLead = (value) => clean(value)
    .replace(/^#{1,6}\s*/, "")
    .replace(/^[-*•]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .trim();

  function numberRange(value) {
    const match = String(value || "").match(/(\d+)(?:\s*[-–—a]\s*(\d+))?/i);
    return match ? { min: Number(match[1]), max: Number(match[2] || match[1]) } : null;
  }

  function parseSpec(text) {
    const normalized = clean(text).replace(/\bpor\s+lado\b/gi, "por lado");
    const compact = normalized.match(/(?:^|\s)(\d+)\s*(?:x|×)\s*(\d+)(?:\s*[-–—a]\s*(\d+))?/i);
    if (!compact) return null;

    const sets = Number(compact[1]);
    if (sets < 1 || sets > 20) return null;
    const rirMatch = normalized.match(/\bRIR\s*[:=@]?\s*(\d+(?:\s*[-–—a]\s*\d+)?)/i);
    const restMatch = normalized.match(/\b(?:descanso|descansa|rest)\s*[:=]?\s*([\d.,]+(?:\s*[-–—a]\s*[\d.,]+)?\s*(?:s|seg(?:undos?)?|min(?:utos?)?))/i);
    const side = /\b(?:por\s+lado|cada\s+lado|por\s+pierna|cada\s+pierna|por\s+brazo)\b/i.test(normalized);

    return {
      sets,
      repsMin: Number(compact[2]),
      repsMax: Number(compact[3] || compact[2]),
      targetRir: rirMatch ? rirMatch[1].replace(/a/gi, "–") : "",
      rest: restMatch ? restMatch[1].replace(/a/gi, "–") : "",
      perSide: side,
      specStart: compact.index + (compact[0].startsWith(" ") ? 1 : 0),
      specEnd: compact.index + compact[0].length
    };
  }

  function titleFromNote(lines) {
    const heading = lines.find((line) => /^#{1,3}\s+\S/.test(line.trim()));
    if (heading) return stripLead(heading);
    const labelled = lines.find((line) => /^(?:sesión|sesion|entrenamiento|día|dia)\s*:/i.test(line.trim()));
    if (labelled) return clean(labelled).replace(/^(?:sesión|sesion|entrenamiento|día|dia)\s*:\s*/i, "");
    return "Entrenamiento de hoy";
  }

  function exerciseNameFromLine(line, spec) {
    let prefix = stripLead(line.slice(0, spec.specStart));
    if (prefix.includes("|")) {
      const cells = prefix.split("|").map(clean).filter(Boolean);
      prefix = cells.find((cell) => !/^\d+$/.test(cell)) || cells[0] || "";
    }
    return prefix
      .replace(/\b(?:series?|sets?)\s*[:=]?\s*$/i, "")
      .replace(/[·:—–\-|]+\s*$/, "")
      .trim();
  }

  function cueFromLine(line, spec) {
    const after = clean(line.slice(spec.specEnd))
      .replace(/^[\s·:—–\-|,]+/, "")
      .replace(/\bRIR\s*[:=@]?\s*\d+(?:\s*[-–—a]\s*\d+)?/ig, "")
      .replace(/\b(?:descanso|descansa|rest)\s*[:=]?\s*[\d.,]+(?:\s*[-–—a]\s*[\d.,]+)?\s*(?:s|seg(?:undos?)?|min(?:utos?)?)/ig, "")
      .replace(/\b(?:por\s+lado|cada\s+lado|por\s+pierna|cada\s+pierna|por\s+brazo)\b/ig, "")
      .replace(/^[\s·:—–\-|,]+|[\s·:—–\-|,]+$/g, "");
    return clean(after);
  }

  function parseInlineExercises(lines) {
    const exercises = [];
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const rawLine = lines[lineIndex];
      if (/^\s*\|?\s*:?-{3,}/.test(rawLine)) continue;
      const spec = parseSpec(rawLine);
      if (!spec) continue;
      const name = exerciseNameFromLine(rawLine, spec);
      if (!name || /^(?:series?|reps?|repeticiones?|objetivo)$/i.test(name)) continue;
      const identityMatch = stripLead(lines[lineIndex + 1] || "").match(/^identidad\s*:\s*(.+)$/i);
      exercises.push({
        name,
        sets: spec.sets,
        repsMin: spec.repsMin,
        repsMax: spec.repsMax,
        targetRir: spec.targetRir,
        rest: spec.rest,
        perSide: spec.perSide,
        cue: cueFromLine(rawLine, spec),
        identityText: identityMatch ? clean(identityMatch[1]) : ""
      });
    }
    return exercises;
  }

  function parseBlockExercises(lines) {
    const exercises = [];
    let current = null;
    const flush = () => {
      if (current && current.name && current.sets && current.repsMin != null) exercises.push(current);
      current = null;
    };

    for (const rawLine of lines) {
      const line = stripLead(rawLine);
      const exerciseMatch = line.match(/^(?:ejercicio|movimiento)\s*:\s*(.+)$/i);
      if (exerciseMatch) {
        flush();
        current = { name: clean(exerciseMatch[1]), sets: 0, repsMin: null, repsMax: null, targetRir: "", rest: "", perSide: false, cue: "", identityText: "" };
        continue;
      }
      if (!current) continue;
      const sets = line.match(/^series?\s*:\s*(\d+)/i);
      const reps = line.match(/^(?:reps?|repeticiones?)\s*:\s*(.+)$/i);
      const rir = line.match(/^RIR\s*:\s*(.+)$/i);
      const rest = line.match(/^(?:descanso|rest)\s*:\s*(.+)$/i);
      const cue = line.match(/^(?:indicación|indicacion|técnica|tecnica|nota)\s*:\s*(.+)$/i);
      const identity = line.match(/^identidad\s*:\s*(.+)$/i);
      if (sets) current.sets = Number(sets[1]);
      else if (reps) {
        const range = numberRange(reps[1]);
        if (range) { current.repsMin = range.min; current.repsMax = range.max; }
        current.perSide = /lado|pierna|brazo/i.test(reps[1]);
      } else if (rir) current.targetRir = clean(rir[1]);
      else if (rest) current.rest = clean(rest[1]);
      else if (identity) current.identityText = clean(identity[1]);
      else if (cue) current.cue = clean(cue[1]);
    }
    flush();
    return exercises;
  }

  function keyOf(exercise) {
    return exercise.name.toLowerCase().replace(/[^a-záéíóúüñ0-9]/gi, "");
  }

  function parseWorkout(note) {
    const source = String(note || "").replace(/\r/g, "").trim();
    if (!source) return { title: "", exercises: [], error: "Pega primero la nota del entrenador." };
    const lines = source.split("\n").map((line) => line.trim()).filter(Boolean);
    const combined = [...parseInlineExercises(lines), ...parseBlockExercises(lines)];
    const seen = new Set();
    const exercises = combined.filter((exercise) => {
      const key = keyOf(exercise);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return {
      title: titleFromNote(lines),
      exercises,
      error: exercises.length ? "" : "No pude reconocer ejercicios. Usa, por ejemplo: Hip thrust — 3 × 8–10 · RIR 2."
    };
  }

  function normalizeForParsing(value) {
    return String(value == null ? "" : value)
      .replace(/\r/g, "")
      .replace(/[×xX]/g, "x")
      .replace(/[–—]/g, "-")
      .replace(/(\d)\s*kg\b/gi, "$1 kg")
      .replace(/[ \t]+/g, " ")
      .trim();
  }

  function normalizedName(value) {
    return clean(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim() || null;
  }

  function validIsoDate(value) {
    const match = normalizeForParsing(value).match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  function dateReference(value) {
    const source = String(value == null ? "" : value);
    const full = validIsoDate(source);
    if (full) return { rawDate: full, dateIso: full };
    const fullEuropean = source.match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/);
    if (fullEuropean) {
      const [day, month, year] = fullEuropean[1].split("/").map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      const valid = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
      return { rawDate: fullEuropean[1], dateIso: valid ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : null };
    }
    const short = source.match(/\b(\d{1,2}\/\d{1,2})(?!\/\d)\b/);
    return { rawDate: short ? short[1] : null, dateIso: null };
  }

  function parseRirRange(value) {
    const match = normalizeForParsing(value).match(/\brir\s*[:=@]?\s*(\d+)(?:\s*-\s*(\d+))?\b/i);
    if (!match) return null;
    return { min: Number(match[1]), max: Number(match[2] || match[1]) };
  }

  function parseRestSeconds(value) {
    const match = normalizeForParsing(value).match(/\b(?:descanso|descansa|rest)\s*[:=]?\s*(\d+(?:[.,]\d+)?)(?:\s*-\s*(\d+(?:[.,]\d+)?))?\s*(s|seg(?:undos?)?|min(?:utos?)?)\b/i);
    if (!match) return null;
    const multiplier = /^min/i.test(match[3]) ? 60 : 1;
    return {
      min: Number(match[1].replace(",", ".")) * multiplier,
      max: Number((match[2] || match[1]).replace(",", ".")) * multiplier
    };
  }

  function emptyPrescription() {
    return {
      sets: null,
      repsMin: null,
      repsMax: null,
      targetRirMin: null,
      targetRirMax: null,
      restSecondsMin: null,
      restSecondsMax: null,
      perSide: false
    };
  }

  function fragment(line, rawText, status, category, reason) {
    return { lineStart: line, lineEnd: line, rawText, status, category, reason: reason || null };
  }

  function parseHistoricalSets(value) {
    const expression = /(\d+(?:[.,]\d+)?)\s*kg\s*[x×]\s*(\d+)\s*(?:@\s*|rir\s*)(\d+(?:[.,]\d+)?)/gi;
    const sets = [];
    let match;
    while ((match = expression.exec(String(value || "")))) {
      sets.push({
        load: Number(match[1].replace(",", ".")),
        loadUnit: "kg",
        reps: Number(match[2]),
        rir: Number(match[3].replace(",", ".")),
        rawText: match[0].trim(),
        status: "parsed"
      });
    }
    return sets;
  }

  function parseComparableRecord(rawText) {
    const source = String(rawText || "");
    const normalized = normalizeForParsing(source).toLowerCase();
    if (/\b(?:ninguno comparable|ningun registro comparable|ninguno|no tengo)\b/.test(normalized)) return null;
    const date = dateReference(source);
    const sets = parseHistoricalSets(source);
    return { rawText: source, rawDate: date.rawDate, dateIso: date.dateIso, sets, status: sets.length ? "parsed" : "partial" };
  }

  function instructionType(value) {
    const match = String(value || "").match(/^\s*(hoy|objetivo|profundidad|registra)\s*:\s*(.*)$/i);
    if (!match) return null;
    const types = { hoy: "today", objetivo: "target", profundidad: "depth", registra: "record" };
    return { type: types[match[1].toLowerCase()], text: match[2].trim() };
  }

  function historicalMention(rawText) {
    const match = String(rawText || "").match(/(\d+(?:[.,]\d+)?)\s*kg\b/i);
    const date = dateReference(rawText);
    return {
      rawText,
      comparable: false,
      rawDate: date.rawDate,
      dateIso: date.dateIso,
      explicitLoad: match ? { value: Number(match[1].replace(",", ".")), unit: "kg" } : null
    };
  }

  function parseWorkoutNoteV1(rawText) {
    const source = String(rawText == null ? "" : rawText).replace(/\r/g, "");
    const lines = source.split("\n").map((rawLine, index) => ({ rawText: rawLine, line: index + 1 }));
    const headerIndexes = [];

    lines.forEach((item, index) => {
      const spec = parseSpec(normalizeForParsing(item.rawText));
      const name = spec ? exerciseNameFromLine(item.rawText, spec) : "";
      if (spec && name) headerIndexes.push(index);
    });

    const firstExerciseIndex = headerIndexes.length ? headerIndexes[0] : lines.length;
    const sessionLine = lines.slice(0, firstExerciseIndex).find((item) => item.rawText.trim());
    const sessionParts = sessionLine ? stripLead(sessionLine.rawText).split(/\s+[—–-]\s+/, 2) : [];
    const draft = {
      schema: "workout_note_draft.v1",
      session: {
        label: sessionParts[0] ? sessionParts[0].trim() : null,
        focusText: sessionParts[1] ? sessionParts[1].trim() : null,
        rawHeader: sessionLine ? sessionLine.rawText : null
      },
      exercises: [],
      fragments: [],
      rawText: source
    };

    const ownerByLine = new Map();
    headerIndexes.forEach((start, position) => {
      const end = position + 1 < headerIndexes.length ? headerIndexes[position + 1] : lines.length;
      const header = lines[start];
      const spec = parseSpec(normalizeForParsing(header.rawText));
      const name = exerciseNameFromLine(header.rawText, spec);
      const exercise = {
        name,
        normalizedName: normalizedName(name),
        prescription: { ...emptyPrescription(), sets: spec.sets, repsMin: spec.repsMin, repsMax: spec.repsMax, perSide: spec.perSide },
        comparableRecord: null,
        historicalMentions: [],
        instructions: [],
        fragments: [],
        rawText: lines.slice(start, end).map((item) => item.rawText).join("\n")
      };
      for (let index = start; index < end; index += 1) ownerByLine.set(index, exercise);
      draft.exercises.push(exercise);
    });

    lines.forEach((item, index) => {
      const exercise = ownerByLine.get(index);
      const raw = item.rawText;
      const normalized = normalizeForParsing(raw);
      let value;
      let current;

      if (!raw.trim()) current = fragment(item.line, raw, "parsed", "unknown");
      else if (headerIndexes.includes(index)) current = fragment(item.line, raw, "parsed", "exercise-header");
      else if (!exercise && item === sessionLine) current = fragment(item.line, raw, "parsed", "session-header");
      else if (!exercise) current = fragment(item.line, raw, "unresolved", "unknown", "unknown-format");
      else if ((value = raw.match(/^\s*(?:ultimo registro|último registro|registro previo|registro comparable)\s*:\s*(.*)$/i))) {
        const record = parseComparableRecord(value[1]);
        exercise.comparableRecord = record;
        current = fragment(item.line, raw, record && record.status === "partial" ? "partial" : "parsed", "comparable-record", record && record.status === "partial" ? "incomplete-record" : null);
      } else if ((value = instructionType(raw))) {
        exercise.instructions.push({ type: value.type, text: value.text, rawText: raw });
        current = fragment(item.line, raw, "parsed", "instruction");
      } else {
        const rir = parseRirRange(normalized);
        const rest = parseRestSeconds(normalized);
        if (rir || rest) {
          if (rir) {
            exercise.prescription.targetRirMin = rir.min;
            exercise.prescription.targetRirMax = rir.max;
          }
          if (rest) {
            exercise.prescription.restSecondsMin = rest.min;
            exercise.prescription.restSecondsMax = rest.max;
          }
          current = fragment(item.line, raw, "parsed", "prescription");
        } else if (/\b\d+(?:[.,]\d+)?\s*kg\b/i.test(raw)
          && /\b(?:no\s+traslad[a-záéíóúüñ]*|otra geometr[ií]a\s+.*no\s+comparable|otra\s+m[aá]quina\s+.*no\s+comparable|no\s+(?:es\s+)?comparable)\b/i.test(normalized)) {
          exercise.historicalMentions.push(historicalMention(raw));
          current = fragment(item.line, raw, "parsed", "historical-mention");
        } else {
          exercise.instructions.push({ type: "other", text: raw.trim(), rawText: raw });
          current = fragment(item.line, raw, "parsed", "instruction");
        }
      }

      draft.fragments.push(current);
      if (exercise) exercise.fragments.push(current);
    });

    return draft;
  }

  return { parseWorkout, parseWorkoutNoteV1, parseSpec, numberRange };
});
