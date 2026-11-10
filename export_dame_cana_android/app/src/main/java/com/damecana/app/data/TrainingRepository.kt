package com.damecana.app.data

import android.content.Context
import com.damecana.app.domain.ActiveSession
import com.damecana.app.domain.ActiveSessionExercise
import com.damecana.app.domain.CatalogExercise
import com.damecana.app.domain.CatalogRoot
import com.damecana.app.domain.DayTemplate
import com.damecana.app.domain.ExerciseIdentity
import com.damecana.app.domain.HistoricalParser
import com.damecana.app.domain.JsonExporter
import com.damecana.app.domain.SetEntry
import com.damecana.app.domain.TechnicalDataRoot
import com.damecana.app.domain.TechnicalRecord
import com.damecana.app.domain.TechnicalTools
import com.damecana.app.domain.TrainingHistoryRecordV1
import com.damecana.app.domain.TrainingLogRecordV1
import com.damecana.app.domain.ProgressionEngine
import com.damecana.app.domain.TrainingParser
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

@Serializable
data class AppSettingsV1(
    val alarmSoundMode: String = "BEEP_BRAUN", // BEEP_BRAUN, NOTIFICATION, SYSTEM_ALARM, CUSTOM_URI, VIBRATE_ONLY
    val customRingtoneUri: String = "",
    val customRingtoneTitle: String = "Tono personalizado",
    val alarmDurationSeconds: Int = 4, // 0 = bucle infinito, 3/4/8 = se apaga solo tras X seg
    val vibrationEnabled: Boolean = true,
    val autoStartRestOnRir: Boolean = true, // Auto-iniciar descanso al tocar RIR
    val defaultRestSeconds: Int = 90,
    val plateBridgeJumpPct: Int = 15 // Umbral % de salto de placa para activar puente 16-18
)

@Serializable
data class ActivePrescriptionAsset(
    val schema: String = "active_prescription.v1",
    @SerialName("updated_at") val updatedAt: String = "",
    val dia: String = "B",
    val titulo: String = "",
    @SerialName("note_v1") val noteV1: String = "",
    val warmup: String = "",
    @SerialName("all_warmups") val allWarmups: Map<String, String> = emptyMap()
)

@Serializable
data class SyncQueueItem(
    val eventId: String,
    val createdAt: String,
    val sessionId: String,
    val sessionTitle: String,
    val payloadJson: String,
    val status: String = "PENDING", // PENDING, SYNCED, ERROR
    val lastError: String = ""
)

@Serializable
data class CheckinEntryV1(
    val id: String,
    val date: String,
    val sleepQuality: Int = 7,
    val energyLevel: Int = 7,
    val tendonComfort: Int = 8,
    val pumpQuality: Int = 8,
    val waistCm: String = "",
    val hipCm: String = "",
    val notes: String = ""
)

object TrainingRepository {

    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
        prettyPrint = true
    }

    private const val DEFAULT_SYNC_ENDPOINT =
        "https://script.google.com/macros/s/AKfycbwQIItMuOszCh2RmjtnoymELZky0GifsZD_0KsREs7rlBETHIzi8lDDfDFknB3XAgnt/exec"
    private const val REMOTE_BASE_URL = "https://dame-cana-pwa.web.app"
    private const val REMOTE_PRESCRIPTION_URL = "$REMOTE_BASE_URL/sesion_activa.json"
    private const val REMOTE_TEMPLATES_URL = "$REMOTE_BASE_URL/plantillas_dia.json"
    private const val REMOTE_TECH_URL = "$REMOTE_BASE_URL/tecnica.json"

    var technicalData: TechnicalDataRoot? = null
        private set
    var catalog: List<CatalogExercise> = emptyList()
        private set
    var dayTemplates: Map<String, DayTemplate> = emptyMap()
        private set

    private val _activePrescription = MutableStateFlow<ActivePrescriptionAsset?>(null)
    val activePrescriptionFlow: StateFlow<ActivePrescriptionAsset?> = _activePrescription.asStateFlow()
    var activePrescription: ActivePrescriptionAsset?
        get() = _activePrescription.value
        private set(value) {
            _activePrescription.value = value
        }

    private val _activeSession = MutableStateFlow<ActiveSession?>(null)
    val activeSession: StateFlow<ActiveSession?> = _activeSession.asStateFlow()

    private val _history = MutableStateFlow<List<ActiveSession>>(emptyList())
    val history: StateFlow<List<ActiveSession>> = _history.asStateFlow()

    private val _syncQueue = MutableStateFlow<List<SyncQueueItem>>(emptyList())
    val syncQueue: StateFlow<List<SyncQueueItem>> = _syncQueue.asStateFlow()

    private val _settings = MutableStateFlow(AppSettingsV1())
    val settings: StateFlow<AppSettingsV1> = _settings.asStateFlow()

    private fun settingsFile(context: Context) = File(context.filesDir, "app_settings_v1.json")

    fun updateSettings(context: Context, updated: AppSettingsV1) {
        _settings.value = updated
        try {
            settingsFile(context).writeText(json.encodeToString(updated))
        } catch (_: Exception) {}
        recalculateActiveSessionProgression(context)
    }

    private val _checkins = MutableStateFlow<List<CheckinEntryV1>>(emptyList())
    val checkins: StateFlow<List<CheckinEntryV1>> = _checkins.asStateFlow()

    private var initialized = false

    fun init(context: Context) {
        if (initialized) return
        val appContext = context.applicationContext
        try {
            val tecnicaStr = appContext.assets.open("tecnica.json").bufferedReader().use { it.readText() }
            technicalData = json.decodeFromString<TechnicalDataRoot>(tecnicaStr)
        } catch (_: Exception) {
        }
        try {
            val catalogoStr = appContext.assets.open("catalogo.json").bufferedReader().use { it.readText() }
            catalog = json.decodeFromString<CatalogRoot>(catalogoStr).exercises
        } catch (_: Exception) {
        }
        try {
            val templatesStr = appContext.assets.open("plantillas_dia.json").bufferedReader().use { it.readText() }
            dayTemplates = json.decodeFromString<Map<String, DayTemplate>>(templatesStr)
        } catch (_: Exception) {
        }
        try {
            val sesionStr = appContext.assets.open("sesion_activa.json").bufferedReader().use { it.readText() }
            activePrescription = json.decodeFromString<ActivePrescriptionAsset>(sesionStr)
        } catch (_: Exception) {
        }

        // Sobrescribir con caché remoto más reciente si existe en disco
        try {
            val fTech = remoteTechFile(appContext)
            if (fTech.exists()) {
                technicalData = json.decodeFromString<TechnicalDataRoot>(fTech.readText())
            }
        } catch (_: Exception) {}
        try {
            val fTpl = remoteTemplatesFile(appContext)
            if (fTpl.exists()) {
                dayTemplates = json.decodeFromString<Map<String, DayTemplate>>(fTpl.readText())
            }
        } catch (_: Exception) {}
        try {
            val fPresc = remotePrescriptionFile(appContext)
            if (fPresc.exists()) {
                val cached = json.decodeFromString<ActivePrescriptionAsset>(fPresc.readText())
                val currentUpd = activePrescription?.updatedAt.orEmpty()
                if (cached.updatedAt >= currentUpd && cached.noteV1.isNotBlank()) {
                    activePrescription = cached
                }
            }
        } catch (_: Exception) {}

        loadDiskState(appContext)
        loadAndMergeHistorialSemilla(appContext)
        if (_activeSession.value == null) {
            injectTodayPrescription(appContext)
        } else {
            recalculateActiveSessionProgression(appContext)
        }
        initialized = true
    }

    private fun activeSessionFile(context: Context) = File(context.filesDir, "active_session_v1.json")
    private fun historyFile(context: Context) = File(context.filesDir, "training_history_v1.json")
    private fun syncQueueFile(context: Context) = File(context.filesDir, "sync_queue_v1.json")
    private fun checkinsFile(context: Context) = File(context.filesDir, "checkins_v1.json")
    private fun remotePrescriptionFile(context: Context) = File(context.filesDir, "remote_prescription_v1.json")
    private fun remoteTemplatesFile(context: Context) = File(context.filesDir, "remote_templates_v1.json")
    private fun remoteTechFile(context: Context) = File(context.filesDir, "remote_tecnica_v1.json")

    private fun loadAndMergeHistorialSemilla(context: Context) {
        val seedSessions = try {
            val str = context.assets.open("historial_semilla.json").bufferedReader().use { it.readText() }
            json.decodeFromString<List<ActiveSession>>(str)
        } catch (_: Exception) {
            emptyList()
        }
        val currentDiskHistory = _history.value.filterNot { it.id == "seed-comparable-v1" }
        val merged = (currentDiskHistory + seedSessions)
            .filterNot { it.id == "seed-comparable-v1" }
            .distinctBy { it.id }
            .sortedByDescending { it.date }

        _history.value = merged
        try {
            historyFile(context).writeText(json.encodeToString(merged))
        } catch (_: Exception) {}
    }

    private fun seedHistoryFromComparableRecordIfEmpty(context: Context) {
        if (_history.value.isNotEmpty()) return
        val rawNote = activePrescription?.noteV1 ?: return
        if (rawNote.isBlank()) return
        try {
            val parsed = TrainingParser.parseWorkoutNoteV1(rawNote)
            val seedExercises = parsed.exercises.mapNotNull { ex ->
                val comp = ex.comparableRecord ?: return@mapNotNull null
                if (comp.sets.isEmpty()) return@mapNotNull null
                val setsCount = comp.sets.size.coerceAtLeast(1)
                val entries = comp.sets.map { s ->
                    val sLoad = if (s.load % 1.0 == 0.0) s.load.toInt().toString() else s.load.toString()
                    SetEntry(load = sLoad, reps = s.reps.toString(), rir = "1")
                }
                ActiveSessionExercise(
                    name = ex.name,
                    sets = setsCount,
                    repsMin = ex.prescription.repsMin,
                    repsMax = ex.prescription.repsMax,
                    perSide = ex.prescription.perSide,
                    entries = entries
                )
            }
            if (seedExercises.isNotEmpty()) {
                val seedSession = ActiveSession(
                    id = "seed-comparable-v1",
                    title = "Última referencia base",
                    date = Instant.now().toString(),
                    updatedAt = Instant.now().toString(),
                    finished = true,
                    sourceNote = "Seed inicial desde comparableRecord",
                    exercises = seedExercises
                )
                _history.value = listOf(seedSession)
                try {
                    historyFile(context).writeText(json.encodeToString(_history.value))
                } catch (_: Exception) {}
            }
        } catch (_: Exception) {}
    }

    private fun loadDiskState(context: Context) {
        try {
            val f = activeSessionFile(context)
            if (f.exists()) _activeSession.value = json.decodeFromString<ActiveSession>(f.readText())
        } catch (_: Exception) {
        }
        try {
            val f = historyFile(context)
            if (f.exists()) _history.value = json.decodeFromString<List<ActiveSession>>(f.readText())
        } catch (_: Exception) {
        }
        try {
            val f = syncQueueFile(context)
            if (f.exists()) _syncQueue.value = json.decodeFromString<List<SyncQueueItem>>(f.readText())
        } catch (_: Exception) {
        }
        try {
            val f = checkinsFile(context)
            if (f.exists()) _checkins.value = json.decodeFromString<List<CheckinEntryV1>>(f.readText())
        } catch (_: Exception) {
        }
        try {
            val f = settingsFile(context)
            if (f.exists()) _settings.value = json.decodeFromString<AppSettingsV1>(f.readText())
        } catch (_: Exception) {
        }
    }

    fun saveActiveSession(context: Context, session: ActiveSession?) {
        val updated = session?.copy(updatedAt = Instant.now().toString())
        _activeSession.value = updated
        val f = activeSessionFile(context)
        if (updated == null) f.delete() else f.writeText(json.encodeToString(updated))
    }

    fun injectTodayPrescription(context: Context): ActiveSession? {
        val presc = activePrescription ?: return null
        return importFromNoteV1(context, presc.noteV1)
    }

    private fun httpGetString(urlStr: String, timeoutMs: Int = 5500): String? {
        return try {
            val sep = if ("?" in urlStr) "&" else "?"
            val conn = (URL("${urlStr}${sep}t=${System.currentTimeMillis()}").openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = timeoutMs
                readTimeout = timeoutMs
                useCaches = false
                setRequestProperty("Cache-Control", "no-cache, no-store, must-revalidate")
                setRequestProperty("Pragma", "no-cache")
            }
            if (conn.responseCode in 200..299) {
                conn.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }
            } else {
                null
            }
        } catch (_: Exception) {
            null
        }
    }

    suspend fun syncRemotePrescription(context: Context, forceInject: Boolean = false): Pair<Boolean, String> =
        withContext(Dispatchers.IO) {
            val appContext = context.applicationContext

            // 1. Actualizar plantillas y fichas técnicas en segundo plano si están disponibles
            httpGetString(REMOTE_TEMPLATES_URL, timeoutMs = 4000)?.let { rawTpl ->
                try {
                    val parsedTpl = json.decodeFromString<Map<String, DayTemplate>>(rawTpl)
                    if (parsedTpl.isNotEmpty()) {
                        dayTemplates = parsedTpl
                        remoteTemplatesFile(appContext).writeText(rawTpl)
                    }
                } catch (_: Exception) {}
            }
            httpGetString(REMOTE_TECH_URL, timeoutMs = 4000)?.let { rawTech ->
                try {
                    val parsedTech = json.decodeFromString<TechnicalDataRoot>(rawTech)
                    if (parsedTech.ejercicios.isNotEmpty()) {
                        technicalData = parsedTech
                        remoteTechFile(appContext).writeText(rawTech)
                    }
                } catch (_: Exception) {}
            }

            // 2. Descargar prescripción activa (sesion_activa.json)
            val rawPresc = httpGetString(REMOTE_PRESCRIPTION_URL, timeoutMs = 6000)
            if (rawPresc != null) {
                try {
                    val remote = json.decodeFromString<ActivePrescriptionAsset>(rawPresc)
                    if (remote.noteV1.isNotBlank()) {
                        val prevUpdatedAt = activePrescription?.updatedAt.orEmpty()
                        val prevNote = activePrescription?.noteV1.orEmpty()
                        val isNewer = (remote.updatedAt.isNotBlank() && remote.updatedAt != prevUpdatedAt) || remote.noteV1 != prevNote

                        activePrescription = remote
                        remotePrescriptionFile(appContext).writeText(rawPresc)

                        val currentSession = _activeSession.value
                        val hasStartedSets = currentSession?.exercises?.any { ex ->
                            ex.entries.any { it.reps.isNotBlank() }
                        } == true
                        val sameSourceAlreadyLoaded = currentSession?.sourceNote == remote.noteV1

                        if (forceInject || (isNewer && !hasStartedSets && !sameSourceAlreadyLoaded) || currentSession == null) {
                            withContext(Dispatchers.Main) {
                                importFromNoteV1(appContext, remote.noteV1)
                            }
                            val stamp = remote.updatedAt.take(16).replace('T', ' ')
                            return@withContext true to "☁️ Sesión Día ${remote.dia} inyectada ($stamp)"
                        } else if (isNewer && hasStartedSets) {
                            return@withContext false to "☁️ Nueva sesión Día ${remote.dia} lista en botón ⚡ HOY (sesión en curso respetada)"
                        } else {
                            return@withContext false to "☁️ Día ${remote.dia} al día con el Agente"
                        }
                    }
                } catch (_: Exception) {}
            }

            // Fallback offline si el usuario pulsó explícitamente ⚡ HOY sin cobertura
            if (forceInject) {
                val injected = withContext(Dispatchers.Main) {
                    injectTodayPrescription(appContext)
                }
                if (injected != null) {
                    return@withContext true to "⚡ Sesión Día ${activePrescription?.dia ?: "B"} inyectada (caché local)"
                }
            }
            false to "Sin conexión con servidor remoto (usando datos locales)"
        }

    fun loadDayTemplate(context: Context, dayKey: String): ActiveSession? {
        val tpl = dayTemplates[dayKey] ?: return null
        val catalogById = catalog.associateBy { it.id }
        val exercises = tpl.exercises.map { slot ->
            val catItem = catalogById[slot.catalogId]
            ActiveSessionExercise(
                name = catItem?.name ?: slot.catalogId,
                catalogId = slot.catalogId,
                slotId = slot.slotId,
                sets = slot.sets,
                repsMin = slot.repsMin,
                repsMax = slot.repsMax,
                perSide = slot.perSide,
                targetRir = slot.targetRir,
                rest = slot.rest,
                cue = slot.cue,
                identity = ExerciseIdentity(
                    resistanceMode = catItem?.resistanceMode ?: "external",
                    variant = catItem?.variant ?: "",
                    settings = catItem?.settings ?: "",
                    loadBasis = catItem?.loadBasis ?: "total_kg"
                ),
                note = "",
                entries = List(slot.sets) { SetEntry() }
            )
        }
        val sleepQ = _checkins.value.firstOrNull()?.sleepQuality
        val tendonC = _checkins.value.firstOrNull()?.tendonComfort
        val exercisesWithProgression = exercises.map { ex ->
            ProgressionEngine.applyPrescriptionToExercise(ex, _history.value, sleepQ, tendonC, _settings.value.plateBridgeJumpPct)
        }
        val session = ActiveSession(
            id = "session-${System.currentTimeMillis()}",
            title = tpl.title,
            date = Instant.now().toString(),
            updatedAt = Instant.now().toString(),
            finished = false,
            sourceNote = "Plantilla Día $dayKey",
            exercises = exercisesWithProgression
        )
        saveActiveSession(context, session)
        return session
    }

    fun importFromNoteV1(context: Context, noteText: String): ActiveSession? {
        val draftV1 = TrainingParser.parseWorkoutNoteV1(noteText)
        val fallback = TrainingParser.parseWorkout(noteText)
        if (draftV1.exercises.isEmpty() && fallback.exercises.isEmpty()) return null

        val exercises = if (draftV1.exercises.isNotEmpty()) {
            draftV1.exercises.map { ex ->
                val setsCount = (ex.prescription.sets ?: 3).coerceIn(1, 20)
                val rirText = when {
                    ex.prescription.targetRirMin != null && ex.prescription.targetRirMax != null &&
                        ex.prescription.targetRirMin != ex.prescription.targetRirMax ->
                        "${ex.prescription.targetRirMin}–${ex.prescription.targetRirMax}"
                    ex.prescription.targetRirMin != null -> "${ex.prescription.targetRirMin}"
                    else -> "1–2"
                }
                val restText = when {
                    ex.prescription.restSecondsMin != null && ex.prescription.restSecondsMax != null &&
                        ex.prescription.restSecondsMin != ex.prescription.restSecondsMax ->
                        "${ex.prescription.restSecondsMin!!.toInt()}–${ex.prescription.restSecondsMax!!.toInt()} s"
                    ex.prescription.restSecondsMin != null -> "${ex.prescription.restSecondsMin!!.toInt()} s"
                    else -> "90–150 s"
                }
                val setupText = ex.instructions.firstOrNull { it.type == "setup" || it.type == "variant" }?.text ?: ""
                val todayCue = ex.instructions.filter { it.type == "today" || it.type == "target" }
                    .joinToString(" · ") { it.text }
                val prevRecordText = ex.comparableRecord?.rawText ?: ""
                val combinedCue = listOf(todayCue, if (prevRecordText.isNotEmpty()) "Último: $prevRecordText" else "")
                    .filter { it.isNotEmpty() }
                    .joinToString("\n")

                val defaultLoad = ex.comparableRecord?.sets?.firstOrNull()?.load?.let {
                    if (it % 1.0 == 0.0) it.toInt().toString() else it.toString()
                } ?: ""

                ActiveSessionExercise(
                    name = ex.name,
                    sets = setsCount,
                    repsMin = ex.prescription.repsMin,
                    repsMax = ex.prescription.repsMax,
                    perSide = ex.prescription.perSide,
                    targetRir = rirText,
                    rest = restText,
                    cue = combinedCue,
                    identity = ExerciseIdentity(
                        resistanceMode = "external",
                        variant = setupText,
                        settings = "",
                        loadBasis = if (ex.prescription.perSide) "per_side_kg" else "total_kg"
                    ),
                    note = "",
                    entries = List(setsCount) { SetEntry(load = defaultLoad) }
                )
            }
        } else {
            fallback.exercises.map { ex ->
                ActiveSessionExercise(
                    name = ex.name,
                    sets = ex.sets,
                    repsMin = ex.repsMin,
                    repsMax = ex.repsMax,
                    perSide = ex.perSide,
                    targetRir = ex.targetRir,
                    rest = ex.rest,
                    cue = ex.cue,
                    identity = ExerciseIdentity(variant = ex.identityText),
                    entries = List(ex.sets) { SetEntry() }
                )
            }
        }

        val sessionTitle = listOfNotNull(draftV1.session.label, draftV1.session.focusText)
            .joinToString(" — ")
            .ifEmpty { fallback.title.ifEmpty { "Entrenamiento de hoy" } }

        val sleepQ = _checkins.value.firstOrNull()?.sleepQuality
        val tendonC = _checkins.value.firstOrNull()?.tendonComfort
        val exercisesWithProgression = exercises.map { ex ->
            ProgressionEngine.applyPrescriptionToExercise(ex, _history.value, sleepQ, tendonC, _settings.value.plateBridgeJumpPct)
        }
        val session = ActiveSession(
            id = "session-${System.currentTimeMillis()}",
            title = sessionTitle,
            date = Instant.now().toString(),
            updatedAt = Instant.now().toString(),
            finished = false,
            sourceNote = noteText,
            exercises = exercisesWithProgression
        )
        saveActiveSession(context, session)
        return session
    }

    fun updateSetEntry(context: Context, exerciseIndex: Int, setIndex: Int, updatedEntry: SetEntry) {
        val current = _activeSession.value ?: return
        val exercises = current.exercises.toMutableList()
        val ex = exercises.getOrNull(exerciseIndex) ?: return
        val entries = ex.entries.toMutableList()
        if (setIndex !in entries.indices) return
        entries[setIndex] = updatedEntry
        exercises[exerciseIndex] = ex.copy(entries = entries)
        saveActiveSession(context, current.copy(exercises = exercises))
    }

    fun addSetToExercise(context: Context, exerciseIndex: Int) {
        val current = _activeSession.value ?: return
        val exercises = current.exercises.toMutableList()
        val ex = exercises.getOrNull(exerciseIndex) ?: return
        val lastLoad = ex.entries.lastOrNull()?.load ?: ""
        val entries = ex.entries + SetEntry(load = lastLoad)
        exercises[exerciseIndex] = ex.copy(sets = entries.size, entries = entries)
        saveActiveSession(context, current.copy(exercises = exercises))
    }

    fun updateExerciseDetails(
        context: Context,
        exerciseIndex: Int,
        note: String,
        variant: String,
        settings: String
    ) {
        val current = _activeSession.value ?: return
        val exercises = current.exercises.toMutableList()
        val ex = exercises.getOrNull(exerciseIndex) ?: return
        exercises[exerciseIndex] = ex.copy(
            note = note,
            identity = ex.identity.copy(variant = variant, settings = settings)
        )
        saveActiveSession(context, current.copy(exercises = exercises))
    }

    fun recalculateActiveSessionProgression(context: Context): String {
        val current = _activeSession.value ?: return "Sin sesión activa"
        val latestCheckin = _checkins.value.firstOrNull()
        val updated = current.exercises.map { ex ->
            ProgressionEngine.applyPrescriptionToExercise(
                ex,
                _history.value,
                latestCheckin?.sleepQuality,
                latestCheckin?.tendonComfort,
                _settings.value.plateBridgeJumpPct
            )
        }
        saveActiveSession(context, current.copy(exercises = updated))
        return "Progresión S1 recalculada sobre ${updated.size} ejercicios"
    }

    fun substituteExercise(context: Context, exerciseIndex: Int, newCatalogExercise: CatalogExercise) {
        val current = _activeSession.value ?: return
        val exercises = current.exercises.toMutableList()
        val ex = exercises.getOrNull(exerciseIndex) ?: return
        val substituted = ex.copy(
            name = newCatalogExercise.name,
            catalogId = newCatalogExercise.id,
            identity = ExerciseIdentity(
                resistanceMode = newCatalogExercise.resistanceMode,
                variant = newCatalogExercise.variant,
                settings = "",
                loadBasis = newCatalogExercise.loadBasis
            )
        )
        val sleepQ = _checkins.value.firstOrNull()?.sleepQuality
        val tendonC = _checkins.value.firstOrNull()?.tendonComfort
        exercises[exerciseIndex] = ProgressionEngine.applyPrescriptionToExercise(
            substituted,
            _history.value,
            sleepQ,
            tendonC,
            _settings.value.plateBridgeJumpPct
        )
        saveActiveSession(context, current.copy(exercises = exercises))
    }

    fun finishAndArchiveCurrentSession(context: Context): ActiveSession? {
        val current = _activeSession.value ?: return null
        val finishedSession = current.copy(
            finished = true,
            updatedAt = Instant.now().toString()
        )
        val nextHistory = listOf(finishedSession) + _history.value.filterNot { it.id == finishedSession.id }
        _history.value = nextHistory
        historyFile(context).writeText(json.encodeToString(nextHistory))
        enqueueSessionForSync(context, finishedSession)
        saveActiveSession(context, finishedSession)
        return finishedSession
    }

    fun importHistoricalText(context: Context, rawText: String): Pair<Boolean, String> {
        val res = HistoricalParser.parseHistoricalWorkout(rawText)
        if (res.error.isNotEmpty() || res.draft == null) {
            return false to res.error.ifEmpty { "No se pudo interpretar el texto histórico." }
        }
        val d = res.draft
        val imported = ActiveSession(
            id = "hist-${System.currentTimeMillis()}",
            title = d.title,
            date = d.date,
            updatedAt = Instant.now().toString(),
            finished = d.finished,
            sourceNote = rawText,
            exercises = d.exercises.map { ex ->
                ActiveSessionExercise(
                    name = ex.name,
                    sets = ex.sets,
                    repsMin = ex.repsMin,
                    repsMax = ex.repsMax,
                    perSide = ex.perSide,
                    targetRir = ex.targetRir,
                    rest = ex.rest,
                    cue = ex.cue,
                    identity = ex.identity,
                    note = ex.note,
                    entries = ex.entries
                )
            }
        )
        val nextHistory = (listOf(imported) + _history.value).sortedByDescending { it.date }
        _history.value = nextHistory
        historyFile(context).writeText(json.encodeToString(nextHistory))
        return true to "Sesión «${imported.title}» (${imported.date.take(10)}) importada al historial."
    }

    fun importJsonBackup(context: Context, rawJson: String): Pair<Boolean, String> {
        return try {
            if (rawJson.contains("\"training_history.v1\"")) {
                val hist = JsonExporter.prettyJson.decodeFromString<TrainingHistoryRecordV1>(rawJson)
                val importedSessions = hist.sessions.map { JsonExporter.toActiveSession(it) }
                val merged = (importedSessions + _history.value).distinctBy { it.id }.sortedByDescending { it.date }
                _history.value = merged
                historyFile(context).writeText(json.encodeToString(merged))
                true to "Historial importado (${importedSessions.size} sesiones)."
            } else {
                val rec = JsonExporter.prettyJson.decodeFromString<TrainingLogRecordV1>(rawJson)
                val sess = JsonExporter.toActiveSession(rec)
                val merged = (listOf(sess) + _history.value).distinctBy { it.id }.sortedByDescending { it.date }
                _history.value = merged
                historyFile(context).writeText(json.encodeToString(merged))
                true to "Sesión «${sess.title}» importada."
            }
        } catch (e: Exception) {
            false to "JSON inválido: ${e.localizedMessage ?: "Error de formato"}"
        }
    }

    fun findTechnicalCard(exercise: ActiveSessionExercise): TechnicalRecord? {
        return TechnicalTools.find(
            exerciseName = exercise.name,
            catalogId = exercise.catalogId,
            slotId = exercise.slotId,
            data = technicalData,
            catalog = catalog
        )
    }

    fun warmupForDay(dayKey: String?): String {
        val presc = activePrescription ?: return "Realiza 2 series de aproximación progresiva (50% y 75%) sin llegar cerca del fallo."
        if (!dayKey.isNullOrEmpty() && presc.allWarmups.containsKey(dayKey)) {
            return presc.allWarmups.getValue(dayKey)
        }
        return presc.warmup.ifEmpty { presc.allWarmups["B"] ?: "" }
    }

    private fun enqueueSessionForSync(context: Context, session: ActiveSession) {
        val eventId = "EVENT-${System.currentTimeMillis()}"
        val payload = JsonExporter.makeJson(session)
        val item = SyncQueueItem(
            eventId = eventId,
            createdAt = Instant.now().toString(),
            sessionId = session.id,
            sessionTitle = session.title,
            payloadJson = payload,
            status = "PENDING"
        )
        val next = listOf(item) + _syncQueue.value
        _syncQueue.value = next
        syncQueueFile(context).writeText(json.encodeToString(next))
    }

    suspend fun flushSyncQueue(context: Context): String = withContext(Dispatchers.IO) {
        val current = _syncQueue.value.toMutableList()
        var syncedCount = 0
        var errorCount = 0
        for (i in current.indices) {
            val item = current[i]
            if (item.status == "SYNCED") continue
            try {
                val url = URL(DEFAULT_SYNC_ENDPOINT)
                val conn = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    connectTimeout = 8000
                    readTimeout = 8000
                    doOutput = true
                    setRequestProperty("Content-Type", "text/plain;charset=utf-8")
                }
                conn.outputStream.use { os ->
                    os.write(item.payloadJson.toByteArray(Charsets.UTF_8))
                }
                val code = conn.responseCode
                if (code in 200..299) {
                    current[i] = item.copy(status = "SYNCED", lastError = "")
                    syncedCount++
                } else {
                    current[i] = item.copy(status = "ERROR", lastError = "HTTP $code")
                    errorCount++
                }
            } catch (e: Exception) {
                current[i] = item.copy(status = "ERROR", lastError = e.localizedMessage ?: "Red no disponible")
                errorCount++
            }
        }
        _syncQueue.value = current
        syncQueueFile(context).writeText(json.encodeToString(current))
        "Sincronizadas: $syncedCount · Pendientes/Error: $errorCount"
    }

    fun saveCheckin(context: Context, entry: CheckinEntryV1) {
        val next = (listOf(entry) + _checkins.value.filterNot { it.id == entry.id }).sortedByDescending { it.date }
        _checkins.value = next
        try {
            checkinsFile(context).writeText(json.encodeToString(next))
        } catch (_: Exception) {}
        recalculateActiveSessionProgression(context)
    }

    fun deleteCheckin(context: Context, id: String) {
        val next = _checkins.value.filterNot { it.id == id }
        _checkins.value = next
        try {
            checkinsFile(context).writeText(json.encodeToString(next))
        } catch (_: Exception) {}
        recalculateActiveSessionProgression(context)
    }
}
