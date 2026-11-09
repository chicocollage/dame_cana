/**
 * DC Studio - Métricas en lenguaje llano.
 * Constancia, separación entre sesiones, mejoras por ejercicio, esfuerzo y volumen.
 * SVG/CSS nativo, sin dependencias.
 */
window.DCStudioMetrics = (function () {
  const DAY = 86400000;
  const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function parseDate(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || "");
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function today() {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }
  function diffDays(a, b) {
    return Math.round((b - a) / DAY);
  }
  function fmtDate(d) {
    return d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
  }
  function fmtShort(d) {
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  }
  function mondayOf(d) {
    const x = new Date(d);
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  }

  /** Fechas únicas de entrenamiento, ordenadas de antigua a reciente. */
  function trainingDates(sesiones) {
    const set = new Map();
    (sesiones || []).forEach((s) => {
      const d = parseDate(s.fecha);
      if (d) set.set(d.getTime(), d);
    });
    return [...set.values()].sort((a, b) => a - b);
  }

  function gaps(dates) {
    const out = [];
    for (let i = 1; i < dates.length; i++) out.push({ from: dates[i - 1], to: dates[i], days: diffDays(dates[i - 1], dates[i]) });
    return out;
  }

  function classifyMuscle(name) {
    const n = (name || "").toLowerCase();
    if (/hip thrust|abducci|glúte|glute|búlgar|bulgar/.test(n)) return "Glúteo y cadera";
    if (/sentadilla|hack|prensa|cuádricep|extensión de rodilla|extension de rodilla/.test(n)) return "Cuádriceps";
    if (/rdl|peso muerto|femoral/.test(n)) return "Femoral y espalda baja";
    if (/remo|jalón|jalon|pullover|dorsal/.test(n)) return "Espalda";
    if (/press|pecho|pectoral|aperturas/.test(n)) return "Pecho";
    if (/katana|tríceps|triceps/.test(n)) return "Tríceps";
    if (/curl|bayesiano|predicador|bíceps|biceps/.test(n)) return "Bíceps";
    if (/elevaci|lateral|deltoid/.test(n)) return "Hombro";
    return "Otros";
  }

  /* ---------- Constancia ---------- */
  function weeklyCounts(dates, weeks) {
    const start = mondayOf(today());
    const out = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const ws = new Date(start);
      ws.setDate(ws.getDate() - i * 7);
      const we = new Date(ws);
      we.setDate(we.getDate() + 7);
      const n = dates.filter((d) => d >= ws && d < we).length;
      out.push({ start: ws, n, current: i === 0 });
    }
    return out;
  }

  function renderConsistency(sesiones) {
    const dates = trainingDates(sesiones);
    const weeks = weeklyCounts(dates, 8);
    const max = Math.max(5, ...weeks.map((w) => w.n));
    const bars = weeks
      .map((w) => {
        const h = Math.round((w.n / max) * 100);
        return `<div class="col">
          <span class="col-val">${w.n}</span>
          <div class="col-track"><div class="col-fill ${w.current ? "now" : ""}" style="height:${Math.max(h, w.n ? 6 : 2)}%"></div></div>
          <span class="col-label">${w.current ? "Esta" : fmtShort(w.start)}</span>
        </div>`;
      })
      .join("");
    const done = weeks.slice(0, -1);
    const avg = done.length ? done.reduce((a, w) => a + w.n, 0) / done.length : 0;
    return `<article class="card">
      <h3>Días entrenados por semana</h3>
      <p class="card-sub">Últimas 8 semanas (lunes a domingo). Media de semanas completas: <strong>${avg.toFixed(1)}</strong> días.</p>
      <div class="cols">${bars}</div>
    </article>`;
  }

  /* ---------- Separación entre sesiones ---------- */
  function gapClass(d) {
    if (d <= 2) return "ok";
    if (d <= 4) return "mid";
    return "long";
  }

  function renderGaps(sesiones) {
    const dates = trainingDates(sesiones);
    const g = gaps(dates).slice(-14);
    if (!g.length) return `<article class="card"><h3>Separación entre sesiones</h3><p class="empty-state">Hacen falta al menos dos sesiones.</p></article>`;
    const max = Math.max(7, ...g.map((x) => x.days));
    const bars = g
      .map(
        (x) => `<div class="col">
        <span class="col-val">${x.days}</span>
        <div class="col-track"><div class="col-fill gap-${gapClass(x.days)}" style="height:${Math.round((x.days / max) * 100)}%"></div></div>
        <span class="col-label">${fmtShort(x.to)}</span>
      </div>`
      )
      .join("");
    const last8 = g.slice(-8);
    const avg = last8.reduce((a, x) => a + x.days, 0) / last8.length;
    const longest = Math.max(...last8.map((x) => x.days));
    const verdict =
      avg <= 2.2
        ? "Ritmo muy regular: recuperas y vuelves a tiempo."
        : avg <= 3.2
        ? "Buen ritmo, con algún hueco normal."
        : "Ritmo irregular: los huecos largos frenan la progresión.";
    return `<article class="card wide">
      <h3>Separación entre sesiones</h3>
      <p class="card-sub">Días de descanso entre un entrenamiento y el siguiente (cada barra es el hueco previo a esa fecha).</p>
      <div class="cols">${bars}</div>
      <div class="legend"><span><i class="dot gap-ok"></i>1–2 días: ideal</span><span><i class="dot gap-mid"></i>3–4 días: aceptable</span><span><i class="dot gap-long"></i>5+ días: largo</span></div>
      <p class="verdict"><strong>${verdict}</strong> Media últimas ${last8.length}: ${avg.toFixed(1)} días · hueco más largo: ${longest} días.</p>
    </article>`;
  }

  /* ---------- Resumen superior ---------- */
  function renderKpis(sesiones, series) {
    const dates = trainingDates(sesiones);
    const t = today();
    const last = dates[dates.length - 1];
    const since = last ? diffDays(last, t) : null;
    const from28 = new Date(t.getTime() - 27 * DAY);
    const days28 = dates.filter((d) => d >= from28).length;
    const g = gaps(dates).slice(-8);
    const avg = g.length ? (g.reduce((a, x) => a + x.days, 0) / g.length).toFixed(1) : "—";
    const sets28 = (series || []).filter((s) => {
      const d = parseDate(s.fecha);
      return d && d >= from28 && s.reps > 0;
    }).length;
    const sinceTxt = since === null ? "—" : since === 0 ? "Hoy" : since === 1 ? "1 día" : `${since} días`;
    const sinceCls = since === null ? "" : since <= 2 ? "ok" : since <= 4 ? "mid" : "long";
    return `<div class="kpis">
      <div class="kpi"><span class="kpi-label">Desde tu último entreno</span><strong class="kpi-num gap-text-${sinceCls}">${sinceTxt}</strong><small>${last ? fmtDate(last) : ""}</small></div>
      <div class="kpi"><span class="kpi-label">Días entrenados (28 días)</span><strong class="kpi-num">${days28}</strong><small>de 28</small></div>
      <div class="kpi"><span class="kpi-label">Descanso medio entre sesiones</span><strong class="kpi-num">${avg}</strong><small>días (últimas 8)</small></div>
      <div class="kpi"><span class="kpi-label">Series hechas (28 días)</span><strong class="kpi-num">${sets28}</strong><small>con repeticiones</small></div>
    </div>`;
  }

  /* ---------- Esfuerzo ---------- */
  function renderEffort(series) {
    const v = (series || []).filter((s) => s.reps > 0 && s.rir !== null && s.rir !== undefined && !isNaN(s.rir));
    if (!v.length) return "";
    const zones = [
      { k: "Al límite (0)", f: (r) => r <= 0, c: "z-hard" },
      { k: "Zona ideal (1–2)", f: (r) => r >= 1 && r <= 2, c: "z-ideal" },
      { k: "Sobrado (3+)", f: (r) => r >= 3, c: "z-easy" }
    ];
    const rows = zones.map((z) => ({ ...z, n: v.filter((s) => z.f(s.rir)).length }));
    const ideal = Math.round((rows[1].n / v.length) * 100);
    const strip = rows.map((z) => `<div class="seg ${z.c}" style="flex:${z.n || 0.001}" title="${z.k}"></div>`).join("");
    const list = rows
      .map((z) => `<li><i class="dot ${z.c}"></i>${z.k}<span>${Math.round((z.n / v.length) * 100)}%</span></li>`)
      .join("");
    return `<article class="card">
      <h3>¿Cuánto te acercas al fallo?</h3>
      <p class="card-sub">RIR = repeticiones que te sobraban al terminar la serie. ${v.length} series con dato.</p>
      <div class="strip">${strip}</div>
      <ul class="zone-list">${list}</ul>
      <p class="verdict"><strong>${ideal}%</strong> de tus series cae en la zona ideal para crecer.</p>
    </article>`;
  }

  /* ---------- Volumen ---------- */
  function renderVolume(series) {
    const from = new Date(today().getTime() - 27 * DAY);
    const v = (series || []).filter((s) => {
      const d = parseDate(s.fecha);
      return d && d >= from && s.reps > 0;
    });
    if (!v.length) return "";
    const counts = {};
    v.forEach((s) => {
      const g = classifyMuscle(s.exercise_name);
      counts[g] = (counts[g] || 0) + 1;
    });
    const rows = Object.entries(counts)
      .map(([g, n]) => [g, n / 4])
      .sort((a, b) => b[1] - a[1]);
    const max = rows[0][1];
    const html = rows
      .map(([g, n]) => {
        const hi = g === "Glúteo y cadera";
        return `<div class="hbar"><span class="hbar-name">${g}</span><div class="hbar-track"><div class="hbar-fill ${hi ? "hi" : ""}" style="width:${Math.round((n / max) * 100)}%"></div></div><span class="hbar-val">${n.toFixed(1)}</span></div>`;
      })
      .join("");
    return `<article class="card">
      <h3>Series por semana y músculo</h3>
      <p class="card-sub">Media de las últimas 4 semanas. El glúteo se resalta por ser tu prioridad.</p>
      ${html}
    </article>`;
  }

  /* ---------- Progreso por ejercicio ---------- */
  function bestSet(sets) {
    return sets.reduce((b, s) => (!b || s.load_kg > b.load_kg || (s.load_kg === b.load_kg && s.reps > b.reps) ? s : b), null);
  }

  function exerciseProgress(series) {
    const by = {};
    (series || []).forEach((s) => {
      if (!(s.load_kg > 0) || !(s.reps > 0) || !parseDate(s.fecha)) return;
      const k = s.exercise_name;
      by[k] = by[k] || {};
      by[k][s.fecha] = by[k][s.fecha] || [];
      by[k][s.fecha].push(s);
    });
    const out = [];
    Object.entries(by).forEach(([name, days]) => {
      const dates = Object.keys(days).sort();
      if (dates.length < 2) return;
      const points = dates.map((d) => ({ fecha: d, best: bestSet(days[d]) }));
      out.push({ name, points });
    });
    return out.sort((a, b) => b.points.length - a.points.length);
  }

  function sparkline(points) {
    const vals = points.map((p) => p.best.load_kg);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const w = 120;
    const h = 36;
    const span = max - min || 1;
    const pts = vals.map((v, i) => `${(i / Math.max(vals.length - 1, 1)) * (w - 8) + 4},${h - 4 - ((v - min) / span) * (h - 8)}`);
    const last = pts[pts.length - 1].split(",");
    return `<svg viewBox="0 0 ${w} ${h}" class="spark" aria-hidden="true"><polyline points="${pts.join(" ")}" fill="none" stroke="var(--green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${last[0]}" cy="${last[1]}" r="3.5" fill="var(--green)"/></svg>`;
  }

  function trendOf(points) {
    const a = points[0].best;
    const b = points[points.length - 1].best;
    const dKg = +(b.load_kg - a.load_kg).toFixed(1);
    if (dKg > 0) return { cls: "up", txt: `+${dKg} kg`, note: "sube" };
    if (dKg < 0) return { cls: "down", txt: `${dKg} kg`, note: "baja" };
    const dRep = b.reps - a.reps;
    if (dRep > 0) return { cls: "up", txt: `+${dRep} reps`, note: "más repeticiones" };
    if (dRep < 0) return { cls: "down", txt: `${dRep} reps`, note: "menos repeticiones" };
    return { cls: "flat", txt: "Igual", note: "estable" };
  }

  function renderProgressList(series, limit) {
    const items = exerciseProgress(series);
    if (!items.length) return `<p class="empty-state">Aún no hay ejercicios con 2 sesiones comparables.</p>`;
    const rows = (limit ? items.slice(0, limit) : items)
      .map((it) => {
        const first = it.points[0];
        const last = it.points[it.points.length - 1];
        const t = trendOf(it.points);
        const f = first.best;
        const l = last.best;
        return `<div class="prog-row">
          <div class="prog-main">
            <strong>${esc(it.name)}</strong>
            <small>${it.points.length} sesiones · de ${fmtShort(parseDate(first.fecha))} a ${fmtShort(parseDate(last.fecha))}</small>
          </div>
          ${sparkline(it.points)}
          <div class="prog-nums">
            <span class="prog-from">${f.load_kg} kg × ${f.reps}</span>
            <span class="prog-arrow">→</span>
            <span class="prog-to">${l.load_kg} kg × ${l.reps}</span>
          </div>
          <span class="chip ${t.cls}">${t.txt}</span>
        </div>`;
      })
      .join("");
    return `<div class="prog-list">${rows}</div>`;
  }

  function renderProgressCard(series) {
    return `<article class="card wide">
      <h3>Lo que va mejorando</h3>
      <p class="card-sub">Compara tu mejor serie (más kilos) de la primera sesión con la de la última de cada ejercicio. La línea muestra la evolución sesión a sesión.</p>
      ${renderProgressList(series, 6)}
    </article>`;
  }

  return { renderKpis, renderConsistency, renderGaps, renderEffort, renderVolume, renderProgressCard, renderProgressList, trainingDates, gaps, parseDate, fmtDate, fmtShort, esc, classifyMuscle };
})();
