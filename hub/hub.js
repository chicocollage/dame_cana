/**
 * DC Studio - Controlador principal.
 * Estado, navegación y vistas. Todo en lenguaje llano; sin IDs ni hashes visibles.
 */
(function () {
  const SESSIONS_STORAGE_KEY = "dc_studio_imported_sessions_v1";
  const M = () => window.DCStudioMetrics;
  const esc = (t) => M().esc(t);

  let state = { sesiones: [], series: [], maquinas: [], programa: null, seguimiento: null, activeTab: "home" };

  function sortSessions() {
    state.sesiones.sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")));
  }

  function init() {
    const seed = window.DAME_CANA_INITIAL_DATA || {};
    state.sesiones = [...(seed.sesiones || [])];
    state.series = [...(seed.series || [])];
    state.maquinas = [...(seed.maquinas || [])];
    state.programa = seed.programa || null;
    state.seguimiento = seed.seguimiento || null;

    try {
      const extra = JSON.parse(localStorage.getItem(SESSIONS_STORAGE_KEY) || "[]");
      extra.forEach((s) => {
        if (state.sesiones.find((e) => e.session_id === s.session_id)) return;
        state.sesiones.push(s);
        (s.exercises || []).forEach((ex, i) =>
          (ex.entries || []).forEach((en, j) => state.series.push(seriesFromEntry(s, ex, en, i, j)))
        );
      });
    } catch {}
    sortSessions();
    bindNavigation();
    renderHeaderStatus();
    renderActiveTab();
  }

  function seriesFromEntry(session, ex, entry, i, j) {
    return {
      set_id: `${session.session_id}-${i}-${j}`,
      session_id: session.session_id,
      fecha: session.fecha,
      dia: session.dia,
      exercise_name: ex.name,
      load_kg: entry.load ? Number(entry.load) : null,
      reps: entry.reps ? Number(entry.reps) : null,
      rir: entry.rir !== undefined && entry.rir !== "" && entry.rir !== null ? Number(entry.rir) : null
    };
  }

  function lastLettered() {
    return state.sesiones.find((s) => /^[A-E]$/i.test(s.dia || ""));
  }

  function nextDayLetter() {
    const cycle = ["A", "B", "C", "D", "E"];
    const l = lastLettered();
    const idx = l ? cycle.indexOf(l.dia.toUpperCase()) : -1;
    return cycle[(idx + 1) % cycle.length];
  }

  function relDays(fecha) {
    const d = M().parseDate(fecha);
    if (!d) return "";
    const n = new Date();
    const diff = Math.round((new Date(n.getFullYear(), n.getMonth(), n.getDate()) - d) / 86400000);
    return diff <= 0 ? "hoy" : diff === 1 ? "ayer" : `hace ${diff} días`;
  }

  function renderHeaderStatus() {
    const last = state.sesiones[0];
    const set = (id, txt) => {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    };
    set("headerNextDay", `Día ${nextDayLetter()}`);
    set("headerLastDate", last ? relDays(last.fecha) : "sin datos");
    set("headerTotalSeries", `${state.sesiones.length} sesiones`);
  }

  function bindNavigation() {
    const tabs = document.querySelectorAll(".nav-tab");
    tabs.forEach((tab) =>
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        state.activeTab = tab.dataset.tab;
        renderActiveTab();
        window.scrollTo({ top: 0 });
      })
    );
  }

  function renderActiveTab() {
    document.querySelectorAll(".view-section").forEach((s) => s.classList.remove("active"));
    const sec = document.getElementById(`view-${state.activeTab}`);
    if (!sec) return;
    sec.classList.add("active");
    const fn = { home: renderHome, progress: renderProgress, history: renderHistory, machines: renderMachines, importer: renderImporter, program: renderProgram, checkin: renderCheckin }[state.activeTab];
    if (fn) fn(sec);
  }

  /* ---------- Inicio ---------- */
  function renderHome(c) {
    const letter = nextDayLetter();
    const slots = (state.programa?.slots || []).filter((s) => (s.dia || "").toUpperCase() === letter).sort((a, b) => a.orden - b.orden);
    const list = slots.map((s) => `<li>${esc(s.ejercicio_selector)} <small>${s.series_base}×${esc(s.repeticiones)}</small></li>`).join("");
    const last = state.sesiones[0];
    c.innerHTML = `
      <section class="hero">
        <div>
          <span class="eyebrow">Te toca</span>
          <h2>Día ${letter}</h2>
          <p>${last ? `Tu última sesión fue ${relDays(last.fecha)} (${M().fmtDate(M().parseDate(last.fecha))}).` : "Aún no hay sesiones."}</p>
        </div>
        <ul class="hero-list">${list || "<li>Sin ejercicios asignados</li>"}</ul>
      </section>
      ${M().renderKpis(state.sesiones, state.series)}
      <div class="grid">
        ${M().renderGaps(state.sesiones)}
        ${M().renderConsistency(state.sesiones)}
        ${M().renderEffort(state.series)}
        ${M().renderProgressCard(state.series)}
        ${M().renderVolume(state.series)}
      </div>`;
  }

  /* ---------- Progreso ---------- */
  function renderProgress(c) {
    c.innerHTML = `
      <article class="card">
        <h3>Progreso por ejercicio</h3>
        <p class="card-sub">Para cada ejercicio: tu mejor serie (más kilos) la primera vez frente a la última. Verde = sube, rojo = baja. Ojo: si cambiaste de máquina o ajuste, la comparación no es exacta; contrástalo con el entrenador.</p>
        ${M().renderProgressList(state.series, 0)}
      </article>`;
  }

  /* ---------- Máquinas ---------- */
  function renderMachines(c) {
    c.innerHTML = `
      <input type="search" id="machineSearchInput" class="search-input" placeholder="Buscar máquina por nombre o zona…" />
      <div id="machinesGridContainer">${window.DCStudioMachines.render(state.maquinas)}</div>`;
    const grid = c.querySelector("#machinesGridContainer");
    const input = c.querySelector("#machineSearchInput");
    window.DCStudioMachines.bindEvents(grid, () => (grid.innerHTML = window.DCStudioMachines.render(state.maquinas, input.value)));
    input.addEventListener("input", (e) => (grid.innerHTML = window.DCStudioMachines.render(state.maquinas, e.target.value)));
  }

  /* ---------- Importar ---------- */
  function renderImporter(c) {
    c.innerHTML = window.DCStudioImporter.renderDropzone();
    window.DCStudioImporter.bindEvents(c, (imp) => {
      const s = {
        session_id: `studio-${Date.now()}`,
        fecha: /^\d{4}-\d{2}-\d{2}/.test(imp.date) ? imp.date.slice(0, 10) : null,
        dia: String(imp.day || "").replace(/^D[ií]a\s*/i, "").slice(0, 1).toUpperCase() || null,
        titulo: imp.day,
        finished: true,
        record_quality: "hub_import",
        exercises: imp.exercises
      };
      state.sesiones.push(s);
      (s.exercises || []).forEach((ex, i) => (ex.entries || []).forEach((en, j) => state.series.push(seriesFromEntry(s, ex, en, i, j))));
      sortSessions();
      try {
        const extra = JSON.parse(localStorage.getItem(SESSIONS_STORAGE_KEY) || "[]");
        extra.push(s);
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(extra));
      } catch {}
      renderHeaderStatus();
    });
  }

  /* ---------- Historial ---------- */
  function renderHistory(c) {
    if (!state.sesiones.length) {
      c.innerHTML = `<p class="empty-state">No hay sesiones en el registro.</p>`;
      return;
    }
    const cards = state.sesiones
      .map((s, i) => {
        const prev = state.sesiones[i + 1];
        const d = M().parseDate(s.fecha);
        const pd = prev && M().parseDate(prev.fecha);
        const gap = d && pd ? Math.round((d - pd) / 86400000) : null;
        const sets = state.series.filter((x) => x.session_id === s.session_id);
        const byEx = {};
        sets.forEach((x) => {
          (byEx[x.exercise_name] = byEx[x.exercise_name] || []).push(
            x.reps ? `${x.load_kg ?? "—"} kg × ${x.reps}${x.rir !== null && x.rir !== undefined ? ` · RIR ${x.rir}` : ""}` : null
          );
        });
        const exHtml = Object.entries(byEx)
          .map(([n, v]) => `<div class="ex-row"><strong>${esc(n)}</strong><span class="tabular">${v.filter(Boolean).join("  ·  ") || "sin repeticiones registradas"}</span></div>`)
          .join("");
        const gapChip = gap === null ? "" : `<span class="chip ${gap <= 2 ? "up" : gap <= 4 ? "flat" : "down"}">${gap === 0 ? "mismo día" : `${gap} d tras la anterior`}</span>`;
        return `<article class="card hist">
          <header>
            <div><span class="day-tag">${/^[A-E]$/i.test(s.dia || "") ? `Día ${s.dia.toUpperCase()}` : "Sesión"}</span>
            <strong class="hist-date">${d ? M().fmtDate(d) : "Fecha no registrada"}</strong></div>
            ${gapChip}
          </header>
          ${exHtml || `<p class="card-sub">${s.recorded_set_count || 0} series registradas.</p>`}
        </article>`;
      })
      .join("");
    c.innerHTML = `<div class="hist-list">${cards}</div>`;
  }

  /* ---------- Programa ---------- */
  function renderProgram(c) {
    const slots = state.programa?.slots || [];
    const next = nextDayLetter();
    const html = ["A", "B", "C", "D", "E"]
      .map((d) => {
        const items = slots
          .filter((s) => (s.dia || "").toUpperCase() === d)
          .sort((a, b) => a.orden - b.orden)
          .map((s) => `<li><strong>${esc(s.ejercicio_selector)}</strong><small>${s.series_base} series · ${esc(s.repeticiones)} reps · RIR ${esc(s.rir_operativo)} · descanso ${esc(s.descanso)}</small></li>`)
          .join("");
        return `<article class="card ${d === next ? "next" : ""}">
          <h3>Día ${d} ${d === next ? '<span class="chip up">siguiente</span>' : ""}</h3>
          <ul class="slot-list">${items || "<li>Sin ejercicios</li>"}</ul>
        </article>`;
      })
      .join("");
    c.innerHTML = `<p class="card-sub" style="margin-bottom:12px">Las sesiones rotan A → B → C → D → E. Si te saltas un día, no se acumula nada: sigues con el que toca.</p><div class="grid">${html}</div>`;
  }

  /* ---------- Check-in ---------- */
  function renderCheckin(c) {
    const rows = (state.seguimiento?.checkins || [])
      .filter((x) => x.fecha)
      .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
      .slice(0, 10)
      .map((x) => {
        const v = (n, u = "") => (n === null || n === undefined ? "—" : `${n}${u}`);
        return `<tr>
          <td>${M().fmtShort(M().parseDate(x.fecha))}</td>
          <td>${v(x.sesiones_realizadas)}</td>
          <td>${v(x.peso_medio_matutino_kg, " kg")}</td>
          <td>${v(x.sueno_medio_h, " h")}</td>
          <td>${v(x.fatiga_1_5, "/5")}</td>
        </tr>`;
      })
      .join("");
    c.innerHTML = `<article class="card">
      <h3>Revisión semanal</h3>
      <p class="card-sub">Un guion (—) significa «no se midió», no cero.</p>
      <div class="table-wrap"><table class="tbl"><thead><tr><th>Semana</th><th>Sesiones</th><th>Peso</th><th>Sueño</th><th>Fatiga</th></tr></thead><tbody>${rows || '<tr><td colspan="5">Sin check-ins.</td></tr>'}</tbody></table></div>
    </article>`;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
