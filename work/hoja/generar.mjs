import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outputDir = path.join(root, "outputs", "01a0ee94-3218-7bc2-860f-bda74883553e");
const outputPath = path.join(outputDir, "DAME_CANA_REGISTRO_LOCAL.xlsx");
const registro = JSON.parse(await fs.readFile(path.join(root, "data", "registro.json"), "utf8"));
if (registro.schema !== "dame_cana_registro.v1" || !Array.isArray(registro.sesiones) || !Array.isArray(registro.series)) {
  throw new Error("El registro local no tiene el esquema esperado");
}

function fecha(value) {
  if (!value) return null;
  const short = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(short) ? new Date(`${short}T12:00:00Z`) : null;
}
function plano(value) {
  if (value === undefined || value === null || value === "") return null;
  return typeof value === "object" ? JSON.stringify(value) : value;
}
function calidad(value) {
  const labels = {
    partial_but_real: "Real parcial",
    real_but_no_exercise_breakdown: "Real sin desglose",
    real_exercises_known_sets_unrecorded: "Series sin detalle",
    detailed_real: "Real detallada",
    detailed_with_pending_details: "Detalles pendientes",
  };
  return labels[value] || (value ? String(value) : "Sin clasificar");
}
function base(sheet, lastCol, lastRow, widths) {
  sheet.showGridLines = false;
  sheet.getRange(`A5:${lastCol}${lastRow}`).format.font = { name: "Arial", size: 10, color: "#17232C" };
  widths.forEach((width, i) => {
    sheet.getRangeByIndexes(0, i, lastRow, 1).format.columnWidth = width;
  });
  sheet.getRange(`A4:${lastCol}4`).format = {
    fill: "#173D50",
    font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" },
    verticalAlignment: "center",
  };
  sheet.getRange(`A4:${lastCol}4`).format.rowHeight = 27;
  sheet.freezePanes.freezeRows(4);
}

const workbook = Workbook.create();
const resumen = workbook.worksheets.add("Resumen");
const sesiones = workbook.worksheets.add("Sesiones");
const series = workbook.worksheets.add("Series");

const reales = registro.series.filter((row) => typeof row.reps === "number" && row.reps > 0);
const testSessions = registro.sesiones.filter((row) => String(row.session_id).startsWith("TEST-"));
const latest = [...registro.sesiones].filter((row) => row.finished && row.dia && !String(row.session_id).startsWith("TEST-"))
  .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha))).at(-1);
resumen.showGridLines = false;
resumen.getRange("A1").values = [["DAME CAÑA · registro local"]];
resumen.getRange("A1").format.font = { name: "Arial", size: 16, bold: true, color: "#173D50" };
resumen.getRange("A2").values = [["Vista de consulta regenerada desde el registro JSON local"]];
resumen.getRange("A2").format.font = { name: "Arial", size: 10, italic: true, color: "#526474" };
resumen.getRange("A4:B8").values = [
  ["Sesiones importadas", registro.sesiones.length],
  ["Filas de series", registro.series.length],
  ["Series con repeticiones", reales.length],
  ["Sesiones de prueba", testSessions.length],
  ["Última sesión real", latest ? String(latest.fecha).slice(0, 10) + " · " + latest.dia : "Sin dato"],
];
resumen.getRange("A4:A8").format.font = { name: "Arial", size: 10, bold: true, color: "#173D50" };
resumen.getRange("A10").values = [["Una fila sin repeticiones no prueba una serie realizada."]];
resumen.getRange("A11").values = [["Las cargas solo son comparables tras confirmar máquina, variante, ajustes y base de carga."]];
resumen.getRange("A12").values = [["Las fuentes originales y los conflictos se conservan en el proyecto local."]];
resumen.getRange("A1:A12").format.columnWidth = 86;
resumen.getRange("B4:B8").format.columnWidth = 20;

const sesHeaders = ["Fecha", "Día", "Sesión", "ID de sesión", "Finalizada", "Ejercicios", "Series previstas", "Series con repeticiones", "Calidad", "Fuente"];
sesiones.getRange("A1").values = [["Sesiones"]];
sesiones.getRange("A1").format.font = { name: "Arial", size: 15, bold: true, color: "#173D50" };
sesiones.getRange("A2").values = [["Una línea por sesión; las series están en la pestaña Series"]];
sesiones.getRange("A4:J4").values = [sesHeaders];
const sesRows = registro.sesiones.map((row) => [
  fecha(row.fecha), plano(row.dia), plano(row.titulo), row.session_id, Boolean(row.finished),
  plano(row.exercise_count), plano(row.planned_set_count), plano(row.recorded_set_count),
  calidad(row.record_quality), plano(row.source_file),
]);
sesiones.getRange(`A5:J${sesRows.length + 4}`).values = sesRows;
base(sesiones, "J", sesRows.length + 4, [16, 9, 43, 36, 14, 13, 17, 24, 23, 38]);
sesiones.getRange(`A5:A${sesRows.length + 4}`).setNumberFormat("yyyy-mm-dd");
sesiones.tables.add(`A4:J${sesRows.length + 4}`, true, "SesionesLocal");

const serHeaders = ["Fecha", "Día", "ID de sesión", "Orden", "Ejercicio", "Nº serie", "Carga kg", "Repeticiones", "RIR", "Base de carga", "Variante", "Ajustes", "ID máquina", "Grupo comparable", "Fuente"];
series.getRange("A1").values = [["Series"]];
series.getRange("A1").format.font = { name: "Arial", size: 15, bold: true, color: "#173D50" };
series.getRange("A2").values = [["Incluye filas previstas o vacías; filtra Repeticiones para analizar trabajo registrado"]];
series.getRange("A4:O4").values = [serHeaders];
const serRows = registro.series.map((row) => [
  fecha(row.fecha), plano(row.dia), row.session_id, plano(row.exercise_order), plano(row.exercise_name),
  plano(row.set_index), plano(row.load_kg), plano(row.reps), plano(row.rir), plano(row.load_basis),
  plano(row.variant), plano(row.machine_settings), plano(row.machine_id),
  plano(row.comparability_group), plano(row.source_file),
]);
series.getRange(`A5:O${serRows.length + 4}`).values = serRows;
base(series, "O", serRows.length + 4, [16, 9, 36, 9, 42, 10, 12, 16, 10, 20, 27, 34, 24, 27, 38]);
series.getRange(`A5:A${serRows.length + 4}`).setNumberFormat("yyyy-mm-dd");
series.getRange(`G5:G${serRows.length + 4}`).setNumberFormat("0.0");
series.tables.add(`A4:O${serRows.length + 4}`, true, "SeriesLocal");

for (const [sheetName, range] of [["Resumen", "A1:B12"], ["Sesiones", "A1:J10"], ["Series", "A1:J10"]]) {
  const check = await workbook.inspect({ kind: "table", range: `${sheetName}!${range}`, include: "values", tableMaxRows: 12, tableMaxCols: 10, maxChars: 2200 });
  console.log(`INSPECCION ${sheetName} ${check.ndjson.slice(0, 1000)}`);
  const preview = await workbook.render({ sheetName, range, scale: 1.3, format: "png" });
  const previewPath = path.join(root, "work", "hoja", `vista_${sheetName.toLowerCase()}.png`);
  await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));
}
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 50 }, summary: "error scan" });
console.log(`ERRORES ${errors.ndjson.slice(0, 700)}`);
await fs.mkdir(outputDir, { recursive: true });
const tempPath = path.join(root, "work", "hoja", "registro.tmp.xlsx");
const file = await SpreadsheetFile.exportXlsx(workbook);
await file.save(tempPath);
await fs.rename(tempPath, outputPath);
console.log(JSON.stringify({ archivo: outputPath, sesiones: registro.sesiones.length, series: registro.series.length }));
