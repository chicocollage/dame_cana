package com.damecana.app.ui

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.border
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.horizontalScroll
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.PagerDefaults
import androidx.compose.foundation.pager.PagerState
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import android.app.Activity
import android.os.Build
import android.media.RingtoneManager
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import com.damecana.app.data.AppSettingsV1
import com.damecana.app.data.CheckinEntryV1
import com.damecana.app.data.SyncQueueItem
import com.damecana.app.data.TrainingRepository
import com.damecana.app.domain.ProgressionEngine
import com.damecana.app.domain.ActiveSession
import com.damecana.app.domain.ActiveSessionExercise
import com.damecana.app.domain.JsonExporter
import com.damecana.app.domain.RestTimerTools
import com.damecana.app.domain.SetEntry
import com.damecana.app.domain.TechnicalTools
import com.damecana.app.domain.TimerSnapshot
import com.damecana.app.system.RestTimerService
import com.damecana.app.system.RestTimerStore
import java.time.Instant
import java.util.Locale
import kotlin.math.ceil
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private val RIR_OPTIONS = listOf("0", "0.5", "1", "1.5", "2", "3", "F")

// ───────────────────────── Raíz ─────────────────────────

@Composable
fun DameCanaMainApp(
    lastNfcEventText: String,
    readerModeActive: Boolean,
    onToggleReaderMode: () -> Unit
) {
    val context = LocalContext.current
    val activeSession by TrainingRepository.activeSession.collectAsState()
    val history by TrainingRepository.history.collectAsState()
    val syncQueue by TrainingRepository.syncQueue.collectAsState()
    val checkins by TrainingRepository.checkins.collectAsState()

    var tab by remember { mutableIntStateOf(0) }
    var showWarmup by remember { mutableStateOf(false) }
    var showNote by remember { mutableStateOf(false) }
    var showSwap by remember { mutableStateOf(false) }
    var restExpanded by remember { mutableStateOf(false) }

    val exercises = activeSession?.exercises.orEmpty()
    val pagerState = rememberPagerState(pageCount = { exercises.size })
    LaunchedEffect(activeSession?.id) {
        if (exercises.isNotEmpty()) pagerState.scrollToPage(0)
    }
    LaunchedEffect(Unit) {
        val (injected, msg) = TrainingRepository.syncRemotePrescription(context, forceInject = false)
        if (injected || msg.contains("Nueva sesión")) {
            Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
        }
    }

    val totalSets = exercises.sumOf { it.entries.size }
    val doneSets = exercises.sumOf { ex -> ex.entries.count { it.reps.isNotBlank() } }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(listOf(AuraColors.Stone, AuraColors.StoneDeep)))
    ) {
        Scaffold(
            modifier = Modifier.fillMaxSize(),
            containerColor = Color.Transparent,
            bottomBar = {
                RestDock(
                    lastNfcEventText = lastNfcEventText,
                    readerModeActive = readerModeActive,
                    onToggleReaderMode = onToggleReaderMode,
                    onExpand = { restExpanded = true }
                )
            }
        ) { innerPadding ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                TopBar(
                    tab = tab,
                    historyCount = history.size,
                    doneSets = doneSets,
                    totalSets = totalSets,
                    onTab = { tab = it }
                )
                when (tab) {
                    0 -> SessionTab(
                        session = activeSession,
                        pagerState = pagerState,
                        onOpenWarmup = { showWarmup = true },
                        onOpenNote = { showNote = true },
                        onOpenSwap = { showSwap = true }
                    )
                    1 -> HistoryTab(history = history, syncQueue = syncQueue)
                    2 -> CheckinTab(checkins = checkins)
                    else -> SettingsTab()
                }
            }
        }

        AnimatedVisibility(
            visible = restExpanded,
            enter = fadeIn(tween(240)) + scaleIn(initialScale = 0.94f, animationSpec = spring(dampingRatio = 0.8f)),
            exit = fadeOut(tween(180))
        ) {
            RestEnvironment(
                lastNfcEventText = lastNfcEventText,
                readerModeActive = readerModeActive,
                onToggleReaderMode = onToggleReaderMode,
                onClose = { restExpanded = false }
            )
        }
    }

    if (showWarmup) {
        val dayGuess = activeSession?.title?.let {
            Regex("Día\\s+([A-E])", RegexOption.IGNORE_CASE).find(it)?.groupValues?.get(1)?.uppercase()
        }
        AlertDialog(
            onDismissRequest = { showWarmup = false },
            containerColor = AuraColors.Paper,
            shape = PanelShape,
            title = { Text("PROTOCOLO DE CALENTAMIENTO", style = AuraType.heading) },
            text = {
                Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                    Text(TrainingRepository.warmupForDay(dayGuess), style = AuraType.body)
                }
            },
            confirmButton = {
                AuraChip(
                    text = "ENTENDIDO",
                    container = AuraColors.Lime,
                    onClick = { showWarmup = false }
                )
            }
        )
    }

    if (showNote) {
        var noteText by remember { mutableStateOf(TrainingRepository.activePrescription?.noteV1 ?: "") }
        AlertDialog(
            onDismissRequest = { showNote = false },
            containerColor = AuraColors.Paper,
            shape = PanelShape,
            title = { Text("IMPORTAR NOTA v1", style = AuraType.heading) },
            text = {
                FlatField(
                    value = noteText,
                    onValueChange = { noteText = it },
                    label = "Prescripción del entrenador",
                    singleLine = false,
                    minHeight = 220.dp,
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                AuraChip(
                    text = "CARGAR SESIÓN",
                    container = AuraColors.Lime,
                    onClick = {
                        val imported = TrainingRepository.importFromNoteV1(context, noteText)
                        if (imported != null) {
                            showNote = false
                            Toast.makeText(context, "Sesión cargada (${imported.exercises.size} ejercicios)", Toast.LENGTH_SHORT).show()
                        } else {
                            Toast.makeText(context, "No se detectaron ejercicios válidos", Toast.LENGTH_SHORT).show()
                        }
                    }
                )
            },
            dismissButton = {
                TextButton(onClick = { showNote = false }) { Text("Cancelar", color = AuraColors.Ink) }
            }
        )
    }

    if (showSwap && exercises.isNotEmpty()) {
        var query by remember { mutableStateOf("") }
        val filtered = remember(query) {
            TrainingRepository.catalog.filter {
                query.isBlank() || it.name.contains(query, ignoreCase = true) || it.group.contains(query, ignoreCase = true)
            }
        }
        val targetIndex = pagerState.currentPage.coerceIn(0, exercises.lastIndex)
        AlertDialog(
            onDismissRequest = { showSwap = false },
            containerColor = AuraColors.Paper,
            shape = PanelShape,
            title = { Text("SUSTITUIR · ${filtered.size}", style = AuraType.heading) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    FlatField(
                        value = query,
                        onValueChange = { query = it },
                        label = "Nombre o músculo",
                        modifier = Modifier.fillMaxWidth()
                    )
                    Column(
                        modifier = Modifier
                            .height(280.dp)
                            .verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        filtered.forEach { item ->
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .tactile {
                                        TrainingRepository.substituteExercise(context, targetIndex, item)
                                        showSwap = false
                                    }
                                    .clip(ModuleShape)
                                    .background(AuraColors.Input)
                                    .padding(10.dp)
                            ) {
                                Text(item.name, style = AuraType.heading.copy(fontSize = 15.sp))
                                Text("${item.id} · ${item.group} · ${item.loadBasis}", style = AuraType.label)
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showSwap = false }) { Text("Cerrar", color = AuraColors.Ink) }
            }
        )
    }
}

// ───────────────────────── Barra superior ─────────────────────────

@Composable
private fun TopBar(
    tab: Int,
    historyCount: Int,
    doneSets: Int,
    totalSets: Int,
    onTab: (Int) -> Unit
) {
    val labels = listOf("SESIÓN", "HISTORIAL·$historyCount", "BIO", "AJUSTES")
    Column(
        modifier = Modifier.padding(horizontal = 14.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 6.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(AuraColors.Orange)
                        .hardShadow(1.dp, AuraColors.Ink, RoundedCornerShape(2.dp))
                )
                Text("DAME CAÑA", style = AuraType.chip.copy(letterSpacing = 2.sp))
            }
            Text("$doneSets/$totalSets SERIES", style = AuraType.label)
        }
        SegmentRow(
            options = labels,
            selected = labels.getOrElse(tab) { labels[0] },
            onSelect = { onTab(labels.indexOf(it)) },
            modifier = Modifier.fillMaxWidth(),
            expandSelected = true,
            shortLabels = listOf("SES", "HIST·$historyCount", "BIO", "⚙")
        )
    }
}

@Composable
private fun SessionTab(
    session: ActiveSession?,
    pagerState: PagerState,
    onOpenWarmup: () -> Unit,
    onOpenNote: () -> Unit,
    onOpenSwap: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val activePrescription by TrainingRepository.activePrescriptionFlow.collectAsState()
    Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Column(
            modifier = Modifier.padding(horizontal = 14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = session?.title ?: "Sin sesión activa",
                style = AuraType.heading,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                AuraChip(text = "NOTA v1", container = AuraColors.CyanPill, onClick = onOpenNote)
                for (day in listOf("A", "B", "C", "D", "E")) {
                    val isSelected = session?.title?.contains("Día $day", ignoreCase = true) == true ||
                                     session?.sourceNote?.contains("Día $day", ignoreCase = true) == true
                    AuraChip(
                        text = day,
                        selected = isSelected,
                        container = if (isSelected) AuraColors.Ink else AuraColors.Paper,
                        contentColor = if (isSelected) AuraColors.Paper else AuraColors.Ink,
                        onClick = { TrainingRepository.loadDayTemplate(context, day) }
                    )
                }
                AuraChip(text = "CALENT.", container = AuraColors.CyanPill, onClick = onOpenWarmup)
                AuraChip(
                    text = "⚡ HOY·${activePrescription?.dia ?: "B"}",
                    container = AuraColors.Orange,
                    contentColor = AuraColors.Paper,
                    onClick = {
                        scope.launch {
                            val (_, msg) = TrainingRepository.syncRemotePrescription(context, forceInject = true)
                            Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
                        }
                    }
                )
                AuraChip(
                    text = "⚡ AUTO-S1",
                    container = AuraColors.Orange,
                    contentColor = AuraColors.Paper,
                    onClick = {
                        val msg = TrainingRepository.recalculateActiveSessionProgression(context)
                        Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
                    }
                )
            }
        }

        val exercises = session?.exercises.orEmpty()
        if (session == null || exercises.isEmpty()) {
            AuraPanel(modifier = Modifier.padding(horizontal = 14.dp)) {
                Text(
                    text = "Elige un día (A–E) o pulsa ⚡ HOY para cargar la sesión.",
                    style = AuraType.body,
                    modifier = Modifier.padding(16.dp)
                )
            }
            return@Column
        }

        // Segmentos de progreso: lima = completado, tinta = actual
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            exercises.forEachIndexed { index, ex ->
                val complete = ex.entries.isNotEmpty() && ex.entries.all { it.reps.isNotBlank() }
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(6.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(
                            when {
                                complete -> AuraColors.DoneSolar
                                index == pagerState.currentPage -> AuraColors.Ink
                                else -> AuraColors.Ink.copy(alpha = 0.15f)
                            }
                        )
                        .then(
                            if (complete) Modifier.border(1.dp, AuraColors.Ink, RoundedCornerShape(2.dp))
                            else Modifier
                        )
                )
            }
        }

        HorizontalPager(
            state = pagerState,
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
            contentPadding = PaddingValues(horizontal = 14.dp),
            pageSpacing = 12.dp,
            beyondViewportPageCount = 1,
            flingBehavior = PagerDefaults.flingBehavior(
                state = pagerState,
                snapAnimationSpec = spring(dampingRatio = 0.78f, stiffness = Spring.StiffnessMediumLow)
            )
        ) { page ->
            val exercise = exercises.getOrNull(page)
            if (exercise != null) {
                ExercisePage(
                    session = session,
                    exercise = exercise,
                    exerciseIndex = page,
                    total = exercises.size,
                    onOpenSwap = onOpenSwap
                )
            }
        }
    }
}

@Composable
private fun ExercisePage(
    session: ActiveSession,
    exercise: ActiveSessionExercise,
    exerciseIndex: Int,
    total: Int,
    onOpenSwap: () -> Unit
) {
    val context = LocalContext.current
    val allSets = session.exercises.sumOf { it.entries.size }
    val doneSets = session.exercises.sumOf { ex -> ex.entries.count { it.reps.isNotBlank() } }
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(top = 2.dp, end = 4.dp, bottom = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        ExerciseFlipCard(
            exercise = exercise,
            exerciseIndex = exerciseIndex,
            total = total,
            onOpenSwap = onOpenSwap
        )
        AuraChip(
            text = if (session.finished) "✓ ARCHIVADA · ACTUALIZAR ($doneSets/$allSets)"
            else "FINALIZAR Y ARCHIVAR ($doneSets/$allSets)",
            container = if (session.finished) AuraColors.CyanPill else AuraColors.Lime,
            minHeight = 52.dp,
            modifier = Modifier.fillMaxWidth(),
            onClick = {
                if (TrainingRepository.finishAndArchiveCurrentSession(context) != null) {
                    Toast.makeText(context, "Sesión archivada ($doneSets/$allSets series)", Toast.LENGTH_LONG).show()
                }
            }
        )
    }
}

private fun effortWeight(rir: String, done: Boolean): Int {
    if (!done) return 400
    return when (rir) {
        "F", "0" -> 900
        "0.5", "1" -> 800
        "1.5", "2" -> 650
        "3" -> 500
        else -> 600
    }
}

private fun fmtNum(value: Double): String {
    val rounded = kotlin.math.round(value * 100.0) / 100.0
    if (rounded % 1.0 == 0.0) return rounded.toInt().toString()
    val oneDec = String.format(Locale.US, "%.1f", rounded)
    return if (rounded * 10.0 % 1.0 == 0.0) oneDec else String.format(Locale.US, "%.2f", rounded).trimEnd('0').trimEnd('.')
}

private enum class LoadStepMode { PLACAS, DISCOS_25, FINO_1 }

// Escala real de torre de placas: 10, 20, 30, 40, 50 lb (+10 lb) y 65..230 lb (+15 lb) expresada en kg
private val STACK_PLATES_KG_LB: List<Pair<Double, Int>> = listOf(
    0.0 to 0,
    4.5 to 10,
    9.0 to 20,
    14.0 to 30,
    18.0 to 40,
    23.0 to 50,
    30.0 to 65,
    36.0 to 80,
    43.0 to 95,
    50.0 to 110,
    57.0 to 125,
    64.0 to 140,
    70.0 to 155,
    77.0 to 170,
    84.0 to 185,
    91.0 to 200,
    98.0 to 215,
    104.0 to 230
)

private fun defaultLoadModeFor(exercise: ActiveSessionExercise): LoadStepMode {
    val text = "${exercise.name} ${exercise.identity.variant} ${exercise.identity.settings} ${exercise.cue}".lowercase()
    val isPlateLoadedOrBarbell = listOf(
        "hack", "pendular", "prensa", "smith", "multipower", "barra", "discos",
        "hip thrust", "rumano", "rdl", "peso muerto", "búlgara", "bulgara", "t-bar", "convergente"
    ).any { text.contains(it) }
    if (isPlateLoadedOrBarbell) return LoadStepMode.DISCOS_25

    val isCableOrStack = listOf(
        "cable", "polea", "katana", "bayesiano", "jalón", "jalon", "peck", "extensión", "extension",
        "curl femoral", "abducción", "abduccion", "aducc", "máquina", "maquina", "cuerda", "maneral"
    ).any { text.contains(it) }
    if (isCableOrStack) return LoadStepMode.PLACAS

    return if ( text.contains("mancuerna") ) LoadStepMode.FINO_1 else LoadStepMode.DISCOS_25
}

private fun stepStackPlate(currentKg: Double, deltaPlates: Int): Double {
    if (deltaPlates == 0) return currentKg
    val plates = STACK_PLATES_KG_LB.map { it.first }
    val nearestIdx = plates.indices.minByOrNull { kotlin.math.abs(plates[it] - currentKg) } ?: 0
    val targetIdx = (nearestIdx + deltaPlates).coerceIn(0, plates.lastIndex)
    return plates[targetIdx]
}

private fun stepDiscs25(currentKg: Double, steps: Int): Double {
    val snapped = kotlin.math.round(currentKg / 2.5) * 2.5
    return (snapped + steps * 2.5).coerceAtLeast(0.0)
}

private fun plateLabelFor(kg: Double?, mode: LoadStepMode): String = when (mode) {
    LoadStepMode.PLACAS -> {
        val match = kg?.let { v -> STACK_PLATES_KG_LB.firstOrNull { kotlin.math.abs(it.first - v) < 0.6 } }
        if (match != null && match.second > 0) "KG · ${match.second}LB" else "KG · PLACA"
    }
    LoadStepMode.DISCOS_25 -> "KG · ±2.5"
    LoadStepMode.FINO_1 -> "KG · ±1.0"
}

@Composable
private fun ExerciseFlipCard(
    exercise: ActiveSessionExercise,
    exerciseIndex: Int,
    total: Int,
    onOpenSwap: () -> Unit
) {
    val context = LocalContext.current
    var flipped by remember(exerciseIndex, exercise.name) { mutableStateOf(false) }
    val rotation by animateFloatAsState(
        targetValue = if (flipped) 180f else 0f,
        animationSpec = spring(dampingRatio = 0.72f, stiffness = Spring.StiffnessLow),
        label = "flip3d"
    )
    val density = LocalDensity.current.density
    val hologram = remember(exercise.name) { TechnicalTools.resolveHologram(exercise.name) }
    val bitmap = remember(hologram.fileName) { loadAssetBitmap(context, "mano3/${hologram.fileName}") }
    val tech = remember(exercise.name, exercise.catalogId, exercise.slotId) {
        TrainingRepository.findTechnicalCard(exercise)
    }

    AuraPanel(
        modifier = Modifier
            .fillMaxWidth()
            .graphicsLayer {
                rotationY = rotation
                cameraDistance = 16f * density
            }
    ) {
        if (rotation <= 90f) {
            FrontFace(
                exercise = exercise,
                exerciseIndex = exerciseIndex,
                total = total,
                hologram = hologram,
                bitmap = bitmap,
                onFlip = { flipped = true },
                onOpenSwap = onOpenSwap
            )
        } else {
            BackFace(
                exercise = exercise,
                techId = tech?.id ?: hologram.code,
                tech = tech,
                hologram = hologram,
                bitmap = bitmap,
                onBack = { flipped = false }
            )
        }
    }
}

@Composable
private fun FrontFace(
    exercise: ActiveSessionExercise,
    exerciseIndex: Int,
    total: Int,
    hologram: TechnicalTools.MuscleHologram,
    bitmap: ImageBitmap?,
    onFlip: () -> Unit,
    onOpenSwap: () -> Unit
) {
    val context = LocalContext.current
    val history by TrainingRepository.history.collectAsState()
    val checkins by TrainingRepository.checkins.collectAsState()
    val prog = remember(exercise, history, checkins) {
        ProgressionEngine.evaluate(
            exercise,
            history,
            checkins.firstOrNull()?.sleepQuality,
            checkins.firstOrNull()?.tendonComfort
        )
    }
    Column(
        modifier = Modifier.padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(end = 12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(
                        modifier = Modifier
                            .clip(ModuleShape)
                            .background(AuraColors.Orange)
                            .border(1.dp, AuraColors.Ink, ModuleShape)
                            .padding(horizontal = 7.dp, vertical = 3.dp)
                    ) {
                        Text(
                            text = String.format(Locale.US, "%02d/%02d", exerciseIndex + 1, total),
                            style = AuraType.chip,
                            color = AuraColors.Paper
                        )
                    }
                    Text(hologram.label, style = AuraType.label, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
                Text(exercise.name, style = AuraType.title)
                val reps = if (exercise.repsMin != null && exercise.repsMax != null && exercise.repsMin != exercise.repsMax)
                    "${exercise.repsMin}–${exercise.repsMax}" else "${exercise.repsMin ?: 10}"
                Text(
                    text = "${exercise.sets} × $reps${if (exercise.perSide) " /LADO" else ""} · RIR ${exercise.targetRir} · ${exercise.rest}",
                    style = AuraType.label.copy(color = AuraColors.Ink)
                )
                Box(
                    modifier = Modifier
                        .clip(ModuleShape)
                        .background(
                            when (prog.decision) {
                                ProgressionEngine.DecisionType.INCREASE_LOAD,
                                ProgressionEngine.DecisionType.PLATE_BRIDGE_16_18 -> AuraColors.Orange
                                ProgressionEngine.DecisionType.CONSOLIDATE_RIR,
                                ProgressionEngine.DecisionType.DELOAD_BIO -> AuraColors.Forest
                                else -> AuraColors.Ink
                            }
                        )
                        .border(1.dp, AuraColors.Ink, ModuleShape)
                        .padding(horizontal = 8.dp, vertical = 3.dp)
                ) {
                    Text(
                        text = prog.badgeText,
                        style = AuraType.chip.copy(fontSize = 10.sp, color = AuraColors.Paper)
                    )
                }
                if (prog.rationale.isNotBlank()) {
                    Text(
                        text = prog.rationale,
                        style = AuraType.label.copy(fontSize = 10.sp, color = AuraColors.InkSoft)
                    )
                }
            }
            MedallionBay(bitmap = bitmap, hologram = hologram, onClick = onFlip)
        }

        if (exercise.cue.isNotBlank()) {
            var cueExpanded by remember(exercise.name) { mutableStateOf(false) }
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .tactile { cueExpanded = !cueExpanded }
                    .clip(ModuleShape)
                    .background(AuraColors.Ink)
                    .border(1.dp, AuraColors.Ink, ModuleShape)
                    .padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    if (cueExpanded) "BRIEFING  ▴" else "BRIEFING  ▾",
                    style = AuraType.label.copy(color = AuraColors.Orange)
                )
                Text(
                    text = exercise.cue,
                    style = AuraType.body.copy(fontSize = 13.sp, lineHeight = 18.sp),
                    color = AuraColors.Paper,
                    maxLines = if (cueExpanded) Int.MAX_VALUE else 3,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }

        exercise.entries.forEachIndexed { setIndex, entry ->
            SetModule(
                exercise = exercise,
                exerciseIndex = exerciseIndex,
                setIndex = setIndex,
                entry = entry,
                previous = exercise.entries.getOrNull(setIndex - 1),
                targetRepsGhost = prog.targetRepsPerSet.getOrNull(setIndex)
            )
        }

        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
            AuraChip(
                text = "+ SERIE",
                modifier = Modifier.weight(1f),
                onClick = { TrainingRepository.addSetToExercise(context, exerciseIndex) }
            )
            AuraChip(text = "⇄ CAMBIAR", modifier = Modifier.weight(1f), onClick = onOpenSwap)
            AuraChip(
                text = "↻ TÉCNICA",
                modifier = Modifier.weight(1f),
                container = AuraColors.CyanPill,
                onClick = onFlip
            )
        }

        FlatField(
            value = exercise.identity.variant,
            onValueChange = {
                TrainingRepository.updateExerciseDetails(
                    context, exerciseIndex, exercise.note, it, exercise.identity.settings
                )
            },
            label = "Variante · agarre · polea",
            modifier = Modifier.fillMaxWidth()
        )
        FlatField(
            value = exercise.note,
            onValueChange = {
                TrainingRepository.updateExerciseDetails(
                    context, exerciseIndex, it, exercise.identity.variant, exercise.identity.settings
                )
            },
            label = "Sensaciones de hoy",
            singleLine = false,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Composable
private fun MedallionBay(
    bitmap: ImageBitmap?,
    hologram: TechnicalTools.MuscleHologram,
    onClick: () -> Unit
) {
    val paperColor = Color(0xFFF4F0E6)
    val vermilion = Color(0xFFE03C1F)
    val inkColor = Color(0xFF16181C)

    val transition = rememberInfiniteTransition(label = "medallionPulse")
    val pulse by transition.animateFloat(
        initialValue = 0.85f,
        targetValue = 1.35f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse"
    )

    Box(
        modifier = Modifier
            .size(AuraDimens.MedallionSize)
            .tactile(onClick = onClick)
            .hardShadow(3.dp, inkColor, ModuleShape)
            .clip(ModuleShape)
            .background(paperColor),
        contentAlignment = Alignment.Center
    ) {
        if (bitmap != null) {
            Image(
                bitmap = bitmap,
                contentDescription = hologram.label,
                contentScale = ContentScale.Fit,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(6.dp)
            )
        }
        Canvas(modifier = Modifier.fillMaxSize()) {
            val len = 10.dp.toPx()
            val w = 1.5.dp.toPx()
            val m = 4.dp.toPx()
            val c = inkColor
            // esquinas tipo visor
            drawLine(c, Offset(m, m), Offset(m + len, m), w)
            drawLine(c, Offset(m, m), Offset(m, m + len), w)
            drawLine(c, Offset(size.width - m, m), Offset(size.width - m - len, m), w)
            drawLine(c, Offset(size.width - m, m), Offset(size.width - m, m + len), w)
            drawLine(c, Offset(m, size.height - m), Offset(m + len, size.height - m), w)
            drawLine(c, Offset(m, size.height - m), Offset(m, size.height - m - len), w)
            drawLine(c, Offset(size.width - m, size.height - m), Offset(size.width - m - len, size.height - m), w)
            drawLine(c, Offset(size.width - m, size.height - m), Offset(size.width - m, size.height - m - len), w)

            // Vector de tracción en bermellón #E03C1F
            val pOrig = Offset(size.width * hologram.originAnchorX, size.height * hologram.originAnchorY)
            val pIns = Offset(size.width * hologram.insertionAnchorX, size.height * hologram.insertionAnchorY)
            val pBelly = Offset(size.width * hologram.bellyAnchorX, size.height * hologram.bellyAnchorY)

            drawLine(
                color = vermilion.copy(alpha = 0.75f),
                start = pOrig,
                end = pIns,
                strokeWidth = 1.5.dp.toPx(),
                cap = StrokeCap.Round
            )
            drawCircle(c, radius = 2.dp.toPx(), center = pOrig)
            drawCircle(c, radius = 2.dp.toPx(), center = pIns)

            // Nodo pulsante sobre el vientre diana
            drawCircle(
                color = vermilion.copy(alpha = 0.35f),
                radius = 5.dp.toPx() * pulse,
                center = pBelly,
                style = Stroke(width = 1.5.dp.toPx())
            )
            drawCircle(
                color = vermilion,
                radius = 2.5.dp.toPx(),
                center = pBelly
            )

            // Micro-línea de cota quebrada hacia la esquina superior
            val cotaElbow = Offset(pBelly.x + 8.dp.toPx(), pBelly.y - 8.dp.toPx())
            val cotaEnd = Offset(cotaElbow.x + 10.dp.toPx(), cotaElbow.y)
            drawLine(inkColor, pBelly, cotaElbow, 1.dp.toPx())
            drawLine(inkColor, cotaElbow, cotaEnd, 1.dp.toPx())
        }
        Text(
            text = "↻ ${hologram.code}",
            style = AuraType.label.copy(fontSize = 8.sp, color = inkColor),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 6.dp)
        )
    }
}

@Composable
private fun SetModule(
    exercise: ActiveSessionExercise,
    exerciseIndex: Int,
    setIndex: Int,
    entry: SetEntry,
    previous: SetEntry?,
    targetRepsGhost: Int? = null
) {
    val context = LocalContext.current
    val settings by TrainingRepository.settings.collectAsState()
    val done = entry.reps.isNotBlank()
    val weight = effortWeight(entry.rir, done)
    val restSeconds = parseDefaultRestSeconds(exercise.rest)

    val kgValue = entry.load.toDoubleOrNull()
    val kgGhost = previous?.load?.toDoubleOrNull() ?: 0.0
    val repsValue = entry.reps.toIntOrNull()
    val repsGhost = targetRepsGhost ?: previous?.reps?.toIntOrNull() ?: exercise.repsMax ?: 10
    var loadMode by remember(exercise.name, exercise.identity.variant) {
        mutableStateOf(defaultLoadModeFor(exercise))
    }

    fun commit(updated: SetEntry) = TrainingRepository.updateSetEntry(context, exerciseIndex, setIndex, updated)
    fun applyKgDelta(steps: Int) {
        val base = kgValue ?: kgGhost
        val next = when (loadMode) {
            LoadStepMode.PLACAS -> stepStackPlate(base, steps)
            LoadStepMode.DISCOS_25 -> stepDiscs25(base, steps)
            LoadStepMode.FINO_1 -> (base + steps * 1.0).coerceAtLeast(0.0)
        }
        commit(entry.copy(load = fmtNum(next)))
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(ModuleShape)
            .background(if (done) AuraColors.DoneSolar else AuraColors.Input)
            .border(if (done) 1.5.dp else 1.dp, AuraColors.Ink, ModuleShape)
            .padding(8.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (done) {
                Column(
                    modifier = Modifier
                        .width(26.dp)
                        .clip(ModuleShape)
                        .background(AuraColors.Ink)
                        .border(1.dp, AuraColors.Ink, ModuleShape)
                        .padding(vertical = 4.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("S${setIndex + 1}", style = AuraType.label.copy(color = AuraColors.DoneSolar, fontSize = 8.sp))
                    Text("✓", style = AuraType.chip.copy(color = AuraColors.DoneSolar, fontSize = 13.sp))
                }
            } else {
                Column(modifier = Modifier.width(26.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("S", style = AuraType.label)
                    Text("${setIndex + 1}", style = AuraType.number(24.sp, 800))
                }
            }
            DialValue(
                label = plateLabelFor(kgValue ?: kgGhost, loadMode),
                valueText = kgValue?.let { fmtNum(it) },
                ghostText = fmtNum(kgGhost),
                weight = weight,
                onCoarse = { steps -> applyKgDelta(steps) },
                onFine = { dir ->
                    if (loadMode == LoadStepMode.FINO_1) {
                        val base = kgValue ?: kgGhost
                        commit(entry.copy(load = fmtNum((base + dir * 0.5).coerceAtLeast(0.0))))
                    } else {
                        applyKgDelta(dir)
                    }
                },
                onClear = { commit(entry.copy(load = "")) },
                onHeaderTap = {
                    loadMode = when (loadMode) {
                        LoadStepMode.PLACAS -> LoadStepMode.DISCOS_25
                        LoadStepMode.DISCOS_25 -> LoadStepMode.FINO_1
                        LoadStepMode.FINO_1 -> LoadStepMode.PLACAS
                    }
                },
                modifier = Modifier.weight(1f)
            )
            DialValue(
                label = if (targetRepsGhost != null) "REPS (OBJ)" else "REPS",
                valueText = repsValue?.toString(),
                ghostText = repsGhost.toString(),
                weight = weight,
                onCoarse = { steps ->
                    val base = repsValue ?: repsGhost
                    commit(entry.copy(reps = (base + steps).coerceIn(1, 99).toString()))
                },
                onFine = { dir ->
                    val base = repsValue ?: repsGhost
                    commit(entry.copy(reps = (base + dir).coerceIn(1, 99).toString()))
                },
                onClear = { commit(entry.copy(reps = "")) },
                modifier = Modifier.weight(1f)
            )
            Column(
                modifier = Modifier
                    .width(50.dp)
                    .tactile { RestTimerService.startRest(context, restSeconds) }
                    .clip(ModuleShape)
                    .background(AuraColors.Ink)
                    .border(1.dp, AuraColors.Ink, ModuleShape)
                    .heightIn(min = 78.dp)
                    .padding(vertical = 8.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text("⏱", color = if (done) AuraColors.DoneSolar else AuraColors.Paper, fontSize = 18.sp)
                Text("${restSeconds}s", style = AuraType.chip, color = if (done) AuraColors.DoneSolar else AuraColors.Paper)
            }
        }
        SegmentRow(
            options = RIR_OPTIONS,
            selected = entry.rir.ifBlank { null },
            onSelect = { selectedRir ->
                val nextRir = if (entry.rir == selectedRir) "" else selectedRir
                commit(entry.copy(rir = nextRir))
                if (nextRir.isNotBlank() && settings.autoStartRestOnRir && (repsValue != null || entry.reps.isNotBlank())) {
                    val timerState = RestTimerStore.load(context)
                    if (timerState.endsAt <= System.currentTimeMillis()) {
                        RestTimerService.startRest(context, restSeconds)
                    }
                }
            },
            modifier = Modifier.fillMaxWidth(),
            track = Color.White.copy(alpha = 0.45f),
            minHeight = 36.dp
        )
    }
}

@Composable
private fun BackFace(
    exercise: ActiveSessionExercise,
    techId: String,
    tech: com.damecana.app.domain.TechnicalRecord?,
    hologram: TechnicalTools.MuscleHologram,
    bitmap: ImageBitmap?,
    onBack: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .graphicsLayer { rotationY = 180f }
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("FICHA TÉCNICA · $techId", style = AuraType.label)
            AuraChip(text = "↶ VOLVER", container = AuraColors.Lime, onClick = onBack)
        }
        Text(exercise.name, style = AuraType.title)

        // Capa 2 a 120 Hz: Atlas Anatómico de Telemetría (Siempre visible)
        AnatomicalTelemetryAtlas(bitmap = bitmap, hologram = hologram)

        if (tech == null) {
            Text("No hay indicaciones técnicas adicionales vinculadas a este ejercicio.", style = AuraType.body)
            return@Column
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(ModuleShape)
                .background(AuraColors.Input)
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text("ZONA PRINCIPAL", style = AuraType.label.copy(color = AuraColors.Orange))
            Text(tech.regionPrincipal, style = AuraType.body.copy(fontWeight = FontWeight.Bold))
            Text("CONFIGURACIÓN BASE", style = AuraType.label.copy(color = AuraColors.Orange))
            Text(tech.base.configuracion, style = AuraType.body)
            Text("OBJETIVO BIOMECÁNICO", style = AuraType.label.copy(color = AuraColors.Orange))
            Text(tech.base.objetivo, style = AuraType.body)
        }

        if (tech.variantes.isNotEmpty()) {
            Text("VARIANTES Y SENSACIONES", style = AuraType.heading)
            tech.variantes.forEach { v ->
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(ModuleShape)
                        .background(AuraColors.Ink)
                        .padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text("${v.id} · ${v.cambio}", style = AuraType.body.copy(fontWeight = FontWeight.Bold), color = AuraColors.Lime)
                    Text("Sensación: ${v.sensacionBuscada}", style = AuraType.body.copy(fontSize = 13.sp), color = AuraColors.Input)
                    Text("Ajuste: ${v.configuracion}", style = AuraType.body.copy(fontSize = 13.sp), color = AuraColors.CyanPill)
                    Text("Objetivo: ${v.objetivo}", style = AuraType.body.copy(fontSize = 13.sp), color = AuraColors.Input)
                }
            }
        }

        tech.respaldoCientifico?.let { sci ->
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(ModuleShape)
                    .background(AuraColors.CyanPill)
                    .padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text("RESPALDO BIOMECÁNICO", style = AuraType.label.copy(color = AuraColors.Ink))
                Text(sci.justificacionBiomecanica, style = AuraType.body)
                sci.fuentes.forEach { Text("• $it", style = AuraType.label) }
            }
        }
    }
}

private data class CadenceState(
    val norm: Float,
    val badge: String,
    val name: String,
    val color: Color,
    val remTime: Float
)

@Composable
private fun AnatomicalTelemetryAtlas(
    bitmap: ImageBitmap?,
    hologram: TechnicalTools.MuscleHologram
) {
    val paperColor = Color(0xFFF4F0E6)
    val inkColor = Color(0xFF16181C)
    val vermilion = Color(0xFFE03C1F)
    val emerald = Color(0xFF1E4D3B)

    var showCotas by remember { mutableStateOf(true) }
    var showTempo by remember { mutableStateOf(true) }

    // Ciclo cinemático continuo a 120 Hz: 5000 ms (3.0s Excéntrica, 1.0s Pausa, 1.0s Concéntrica)
    val infiniteTransition = rememberInfiniteTransition(label = "cadenceLoop")
    val timeMs by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 5000f,
        animationSpec = infiniteRepeatable(
            animation = tween(5000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "tempoTime"
    )

    val t = (timeMs % 5000f) / 1000f
    val cadence = when {
        t < 3.0f -> {
            val progress = t / 3.0f
            CadenceState(progress, "EXCÉNTRICA", "EXCÉNTRICA CONTROLADA", inkColor, 3.0f - t)
        }
        t < 4.0f -> {
            CadenceState(1.0f, "PAUSA 1S (PICO)", "★ PAUSA EN MÁX. ELONGACIÓN", vermilion, 4.0f - t)
        }
        else -> {
            val progress = 1.0f - (t - 4.0f) / 1.0f
            CadenceState(progress, "CONCÉNTRICA", "CONCÉNTRICA EXPLOSIVA", emerald, 5.0f - t)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(ModuleShape)
            .background(paperColor)
            .border(1.5.dp, inkColor, ModuleShape)
            .padding(10.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // ─── Barra superior con conmutadores ───
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "ATLAS // VÍA B · 120HZ",
                style = AuraType.label.copy(fontSize = 10.sp, color = inkColor)
            )
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Box(
                    modifier = Modifier
                        .tactile { showCotas = !showCotas }
                        .clip(RoundedCornerShape(3.dp))
                        .background(if (showCotas) inkColor else paperColor)
                        .border(1.dp, inkColor, RoundedCornerShape(3.dp))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = if (showCotas) "✓ COTAS" else "○ COTAS",
                        style = AuraType.label.copy(
                            fontSize = 9.sp,
                            color = if (showCotas) paperColor else inkColor
                        )
                    )
                }
                Box(
                    modifier = Modifier
                        .tactile { showTempo = !showTempo }
                        .clip(RoundedCornerShape(3.dp))
                        .background(if (showTempo) inkColor else paperColor)
                        .border(1.dp, inkColor, RoundedCornerShape(3.dp))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = if (showTempo) "✓ TEMPO 3-1-1" else "○ TEMPO 3-1-1",
                        style = AuraType.label.copy(
                            fontSize = 9.sp,
                            color = if (showTempo) paperColor else inkColor
                        )
                    )
                }
            }
        }

        // ─── Visor Anatómico Central con Cotas y Vector 120Hz ───
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(230.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(paperColor)
                .border(1.dp, inkColor.copy(alpha = 0.25f), RoundedCornerShape(4.dp)),
            contentAlignment = Alignment.Center
        ) {
            if (bitmap != null) {
                Image(
                    bitmap = bitmap,
                    contentDescription = hologram.label,
                    contentScale = ContentScale.Fit,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(vertical = 4.dp)
                )
            }

            Canvas(modifier = Modifier.fillMaxSize()) {
                val w = size.width
                val h = size.height

                // Cuadrícula suiza sutil
                val gridStep = 24.dp.toPx()
                var gx = gridStep
                while (gx < w) {
                    drawLine(
                        color = inkColor.copy(alpha = 0.05f),
                        start = Offset(gx, 0f),
                        end = Offset(gx, h),
                        strokeWidth = 0.5.dp.toPx()
                    )
                    gx += gridStep
                }
                var gy = gridStep
                while (gy < h) {
                    drawLine(
                        color = inkColor.copy(alpha = 0.05f),
                        start = Offset(0f, gy),
                        end = Offset(w, gy),
                        strokeWidth = 0.5.dp.toPx()
                    )
                    gy += gridStep
                }

                val pOrig = Offset(w * hologram.originAnchorX, h * hologram.originAnchorY)
                val pBelly = Offset(w * hologram.bellyAnchorX, h * hologram.bellyAnchorY)
                val pIns = Offset(w * hologram.insertionAnchorX, h * hologram.insertionAnchorY)

                // Vector de tracción y punto de tempo
                if (showTempo) {
                    drawLine(
                        color = inkColor.copy(alpha = 0.35f),
                        start = pOrig,
                        end = pIns,
                        strokeWidth = 1.5.dp.toPx(),
                        cap = StrokeCap.Round
                    )
                    drawCircle(inkColor, radius = 3.dp.toPx(), center = pOrig)
                    drawCircle(inkColor, radius = 3.dp.toPx(), center = pIns)

                    // Punto cinemático del tempo
                    val curX = pOrig.x + (pIns.x - pOrig.x) * cadence.norm
                    val curY = pOrig.y + (pIns.y - pOrig.y) * cadence.norm
                    val curPoint = Offset(curX, curY)

                    val isPeak = (t in 3.0f..4.0f)
                    val rDot = if (isPeak) 8.dp.toPx() else 5.5.dp.toPx()

                    drawCircle(paperColor, radius = rDot + 2.dp.toPx(), center = curPoint)
                    drawCircle(cadence.color, radius = rDot, center = curPoint)
                    if (isPeak) {
                        drawCircle(
                            color = vermilion.copy(alpha = 0.4f),
                            radius = rDot + 5.dp.toPx(),
                            center = curPoint,
                            style = Stroke(width = 1.5.dp.toPx())
                        )
                    }
                }

                // Cotas anatómicas (Leader Lines quebradas)
                if (showCotas) {
                    val lineW = 1.dp.toPx()

                    // Cota 1: Origen
                    val cota1Elbow = Offset(
                        pOrig.x + (if (pOrig.x < w * 0.5f) -18.dp.toPx() else 18.dp.toPx()),
                        pOrig.y - 18.dp.toPx()
                    )
                    val cota1End = Offset(
                        if (pOrig.x < w * 0.5f) 8.dp.toPx() else w - 8.dp.toPx(),
                        cota1Elbow.y
                    )
                    drawLine(inkColor, pOrig, cota1Elbow, lineW)
                    drawLine(inkColor, cota1Elbow, cota1End, lineW)
                    drawCircle(paperColor, radius = 3.5.dp.toPx(), center = pOrig)
                    drawCircle(inkColor, radius = 3.5.dp.toPx(), center = pOrig, style = Stroke(lineW))

                    // Cota 2: Vientre diana
                    val cota2End = Offset(w - 8.dp.toPx(), pBelly.y)
                    drawLine(vermilion, pBelly, cota2End, 1.5.dp.toPx())
                    drawCircle(
                        color = vermilion.copy(alpha = 0.35f),
                        radius = 7.dp.toPx(),
                        center = pBelly,
                        style = Stroke(1.5.dp.toPx())
                    )
                    drawCircle(vermilion, radius = 3.5.dp.toPx(), center = pBelly)

                    // Cota 3: Inserción
                    val cota3Elbow = Offset(
                        pIns.x + (if (pIns.x < w * 0.5f) -18.dp.toPx() else 18.dp.toPx()),
                        pIns.y + 18.dp.toPx()
                    )
                    val cota3End = Offset(
                        if (pIns.x < w * 0.5f) 8.dp.toPx() else w - 8.dp.toPx(),
                        cota3Elbow.y
                    )
                    drawLine(inkColor, pIns, cota3Elbow, lineW)
                    drawLine(inkColor, cota3Elbow, cota3End, lineW)
                    drawCircle(paperColor, radius = 3.5.dp.toPx(), center = pIns)
                    drawCircle(inkColor, radius = 3.5.dp.toPx(), center = pIns, style = Stroke(lineW))
                }
            }

            // Etiquetas textuales de cota superpuestas
            if (showCotas) {
                Box(
                    modifier = Modifier
                        .align(if (hologram.originAnchorX < 0.5f) Alignment.TopStart else Alignment.TopEnd)
                        .padding(6.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(inkColor)
                        .padding(horizontal = 4.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = "ORIGEN",
                        style = AuraType.chip.copy(fontSize = 8.sp, color = paperColor)
                    )
                }

                Box(
                    modifier = Modifier
                        .align(Alignment.CenterEnd)
                        .padding(end = 6.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(vermilion)
                        .padding(horizontal = 4.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = hologram.label,
                        style = AuraType.chip.copy(fontSize = 8.sp, color = Color.White)
                    )
                }

                Box(
                    modifier = Modifier
                        .align(if (hologram.insertionAnchorX < 0.5f) Alignment.BottomStart else Alignment.BottomEnd)
                        .padding(6.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(inkColor)
                        .padding(horizontal = 4.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = "INSERCIÓN",
                        style = AuraType.chip.copy(fontSize = 8.sp, color = paperColor)
                    )
                }
            }
        }

        // ─── Metrónomo 3-1-1-0 y Telemetría Intraserie ───
        if (showTempo) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(4.dp))
                    .background(Color(0xFFEDE9DF))
                    .padding(8.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(2.dp))
                                .background(cadence.color)
                                .padding(horizontal = 5.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = cadence.badge,
                                style = AuraType.chip.copy(fontSize = 8.sp, color = Color.White)
                            )
                        }
                        Text(
                            text = cadence.name,
                            style = AuraType.label.copy(fontSize = 10.sp, color = inkColor)
                        )
                    }
                    Text(
                        text = String.format(Locale.US, "%.1fs", cadence.remTime),
                        style = AuraType.chip.copy(fontSize = 11.sp, color = cadence.color, fontWeight = FontWeight.Bold)
                    )
                }

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(4.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(inkColor.copy(alpha = 0.15f))
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(cadence.norm)
                            .height(4.dp)
                            .clip(RoundedCornerShape(2.dp))
                            .background(cadence.color)
                    )
                }
            }
        }

        // ─── Tabla Técnica Estructurada ───
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(4.dp))
                .background(Color(0xFFEDE9DF))
                .padding(8.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("ORIGEN ÓSEO", style = AuraType.chip.copy(fontSize = 8.sp, color = vermilion))
                    Text(hologram.originLabel, style = AuraType.body.copy(fontSize = 11.sp, color = inkColor))
                }
                Spacer(modifier = Modifier.width(8.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text("INSERCIÓN TENDINOSA", style = AuraType.chip.copy(fontSize = 8.sp, color = inkColor))
                    Text(hologram.insertionLabel, style = AuraType.body.copy(fontSize = 11.sp, color = inkColor))
                }
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("ACCIÓN ARTICULAR", style = AuraType.chip.copy(fontSize = 8.sp, color = inkColor))
                    Text(hologram.actionSummary, style = AuraType.body.copy(fontSize = 11.sp, color = inkColor))
                }
                Spacer(modifier = Modifier.width(8.dp))
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(2.dp))
                        .background(if (hologram.torqueProfile.contains("ELONGACIÓN")) vermilion else inkColor)
                        .padding(horizontal = 6.dp, vertical = 3.dp)
                ) {
                    Text(
                        text = hologram.torqueProfile,
                        style = AuraType.chip.copy(fontSize = 8.sp, color = Color.White)
                    )
                }
            }
        }
    }
}


// ───────────────────────── Historial ─────────────────────────

@Composable
private fun HistoryTab(history: List<ActiveSession>, syncQueue: List<SyncQueueItem>) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var syncMsg by remember { mutableStateOf("") }
    var importText by remember { mutableStateOf("") }
    var showImport by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(start = 14.dp, end = 18.dp, bottom = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        AuraPanel {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("EXPORTACIÓN IA · CLOUD", style = AuraType.label)
                val pending = syncQueue.count { it.status != "SYNCED" }
                Text("${history.size} sesiones · $pending pendientes", style = AuraType.title.copy(fontSize = 22.sp))
                if (syncMsg.isNotEmpty()) Text(syncMsg, style = AuraType.label.copy(color = AuraColors.Orange))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                    AuraChip(
                        text = "☁ SINCRONIZAR",
                        modifier = Modifier.weight(1f),
                        container = AuraColors.Lime,
                        minHeight = 48.dp,
                        onClick = {
                            scope.launch {
                                syncMsg = "Sincronizando…"
                                syncMsg = TrainingRepository.flushSyncQueue(context)
                            }
                        }
                    )
                    AuraChip(
                        text = "↗ JSON IA",
                        modifier = Modifier.weight(1f),
                        minHeight = 48.dp,
                        onClick = {
                            copyAndShareJson(context, "historial-entrenamientos-ia.json", JsonExporter.makeHistoryJson(history))
                        }
                    )
                }
                AuraChip(
                    text = "↙ IMPORTAR HISTÓRICO / BACKUP",
                    modifier = Modifier.fillMaxWidth(),
                    container = AuraColors.CyanPill,
                    minHeight = 48.dp,
                    onClick = { showImport = true }
                )
            }
        }

        history.forEach { sess ->
            val recorded = sess.exercises.sumOf { ex -> ex.entries.count { it.reps.isNotBlank() } }
            AuraPanel {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(sess.title, style = AuraType.heading, modifier = Modifier.weight(1f))
                        Text(sess.date.take(10), style = AuraType.label)
                    }
                    Text("${sess.exercises.size} ejercicios · $recorded series", style = AuraType.label)
                    sess.exercises.forEach { ex ->
                        val line = ex.entries.filter { it.reps.isNotBlank() }
                            .joinToString("  ") { "${it.load.ifEmpty { "BW" }}×${it.reps}@${it.rir.ifEmpty { "-" }}" }
                        if (line.isNotEmpty()) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(ModuleShape)
                                    .background(AuraColors.Input)
                                    .padding(8.dp)
                            ) {
                                Text(ex.name, style = AuraType.body.copy(fontWeight = FontWeight.Bold, fontSize = 13.sp))
                                Text(line, style = AuraType.number(15.sp, 600))
                            }
                        }
                    }
                    AuraChip(
                        text = "COPIAR training_log.v1",
                        onClick = {
                            copyAndShareJson(context, "${sess.date.take(10)}-sesion-ia.json", JsonExporter.makeJson(sess))
                        }
                    )
                }
            }
        }
    }

    if (showImport) {
        AlertDialog(
            onDismissRequest = { showImport = false },
            containerColor = AuraColors.Paper,
            shape = PanelShape,
            title = { Text("IMPORTAR HISTÓRICO", style = AuraType.heading) },
            text = {
                FlatField(
                    value = importText,
                    onValueChange = { importText = it },
                    label = "Texto histórico o JSON v1",
                    singleLine = false,
                    minHeight = 220.dp,
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                AuraChip(
                    text = "IMPORTAR",
                    container = AuraColors.Lime,
                    onClick = {
                        val trimmed = importText.trim()
                        val (ok, msg) = if (trimmed.startsWith("{")) {
                            TrainingRepository.importJsonBackup(context, trimmed)
                        } else {
                            TrainingRepository.importHistoricalText(context, trimmed)
                        }
                        Toast.makeText(context, msg, Toast.LENGTH_LONG).show()
                        if (ok) showImport = false
                    }
                )
            },
            dismissButton = {
                TextButton(onClick = { showImport = false }) { Text("Cancelar", color = AuraColors.Ink) }
            }
        )
    }
}

// ───────────────────────── Check-in / Bio ─────────────────────────

@Composable
private fun CheckinTab(checkins: List<CheckinEntryV1>) {
    val context = LocalContext.current
    val latest = checkins.firstOrNull()
    var sleep by remember(latest?.id) { mutableIntStateOf(latest?.sleepQuality ?: 7) }
    var energy by remember(latest?.id) { mutableIntStateOf(latest?.energyLevel ?: 7) }
    var tendons by remember(latest?.id) { mutableIntStateOf(latest?.tendonComfort ?: 8) }
    var pump by remember(latest?.id) { mutableIntStateOf(latest?.pumpQuality ?: 8) }
    var waist by remember(latest?.id) { mutableStateOf(latest?.waistCm?.toDoubleOrNull()) }
    var hip by remember(latest?.id) { mutableStateOf(latest?.hipCm?.toDoubleOrNull()) }
    var notes by remember(latest?.id) { mutableStateOf(latest?.notes ?: "") }
    val scale = (1..10).map { it.toString() }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(start = 14.dp, end = 18.dp, bottom = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        AuraPanel {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("CHECK-IN SEMANAL · checkin.v1 · ${checkins.size} guardados", style = AuraType.label)

                @Composable
                fun ScaleRow(title: String, value: Int, onChange: (Int) -> Unit) {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("$title · $value/10", style = AuraType.label.copy(color = AuraColors.Ink))
                        SegmentRow(
                            options = scale,
                            selected = value.toString(),
                            onSelect = { onChange(it.toInt()) },
                            modifier = Modifier.fillMaxWidth(),
                            minHeight = 38.dp
                        )
                    }
                }
                ScaleRow("SUEÑO REPARADOR", sleep) { sleep = it }
                ScaleRow("ENERGÍA · DRIVE NEURAL", energy) { energy = it }
                ScaleRow("ARTICULAR · TENDINOSA", tendons) { tendons = it }
                ScaleRow("CONGESTIÓN · PUMP", pump) { pump = it }

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    DialValue(
                        label = "CINTURA cm",
                        valueText = waist?.let { fmtNum(it) },
                        ghostText = "80",
                        weight = 600,
                        onCoarse = { waist = ((waist ?: 80.0) + it).coerceIn(40.0, 200.0) },
                        onFine = { waist = ((waist ?: 80.0) + it * 0.5).coerceIn(40.0, 200.0) },
                        onClear = { waist = null },
                        modifier = Modifier.weight(1f)
                    )
                    DialValue(
                        label = "CADERA cm",
                        valueText = hip?.let { fmtNum(it) },
                        ghostText = "95",
                        weight = 600,
                        onCoarse = { hip = ((hip ?: 95.0) + it).coerceIn(40.0, 200.0) },
                        onFine = { hip = ((hip ?: 95.0) + it * 0.5).coerceIn(40.0, 200.0) },
                        onClear = { hip = null },
                        modifier = Modifier.weight(1f)
                    )
                }

                FlatField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = "Recuperación",
                    singleLine = false,
                    modifier = Modifier.fillMaxWidth()
                )

                AuraChip(
                    text = "GUARDAR CHECK-IN",
                    modifier = Modifier.fillMaxWidth(),
                    container = AuraColors.Orange,
                    contentColor = AuraColors.Paper,
                    minHeight = 52.dp,
                    onClick = {
                        val nowFormatted = Instant.now().toString().take(16).replace("T", " ")
                        TrainingRepository.saveCheckin(
                            context,
                            CheckinEntryV1(
                                id = "chk-${System.currentTimeMillis()}",
                                date = nowFormatted,
                                sleepQuality = sleep,
                                energyLevel = energy,
                                tendonComfort = tendons,
                                pumpQuality = pump,
                                waistCm = waist?.let { fmtNum(it) } ?: "",
                                hipCm = hip?.let { fmtNum(it) } ?: "",
                                notes = notes
                            )
                        )
                        Toast.makeText(context, "Check-in guardado con éxito", Toast.LENGTH_SHORT).show()
                    }
                )
            }
        }

        AuraPanel {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("HISTORIAL DE BIO CHECK-INS (${checkins.size})", style = AuraType.label)
                if (checkins.isEmpty()) {
                    Text(
                        text = "Aún no hay registros de check-in guardados en local.",
                        style = AuraType.body.copy(color = AuraColors.InkSoft)
                    )
                } else {
                    checkins.forEach { entry ->
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(ModuleShape)
                                .background(AuraColors.Input)
                                .border(1.dp, AuraColors.Ink, ModuleShape)
                                .padding(10.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(entry.date, style = AuraType.heading.copy(fontSize = 13.sp))
                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    AuraChip(
                                        text = "↺ CARGAR",
                                        container = AuraColors.Paper,
                                        onClick = {
                                            sleep = entry.sleepQuality
                                            energy = entry.energyLevel
                                            tendons = entry.tendonComfort
                                            pump = entry.pumpQuality
                                            waist = entry.waistCm.toDoubleOrNull()
                                            hip = entry.hipCm.toDoubleOrNull()
                                            notes = entry.notes
                                            Toast.makeText(context, "Valores cargados en el formulario", Toast.LENGTH_SHORT).show()
                                        }
                                    )
                                    AuraChip(
                                        text = "✕",
                                        container = AuraColors.Paper,
                                        onClick = {
                                            TrainingRepository.deleteCheckin(context, entry.id)
                                            Toast.makeText(context, "Check-in eliminado", Toast.LENGTH_SHORT).show()
                                        }
                                    )
                                }
                            }

                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                val metrics = listOf(
                                    Triple("SUEÑO", entry.sleepQuality, entry.sleepQuality <= 3),
                                    Triple("ENERGÍA", entry.energyLevel, false),
                                    Triple("TENDÓN", entry.tendonComfort, entry.tendonComfort <= 3),
                                    Triple("PUMP", entry.pumpQuality, false)
                                )
                                metrics.forEach { (lbl, score, isAlert) ->
                                    Column(
                                        modifier = Modifier
                                            .weight(1f)
                                            .clip(ModuleShape)
                                            .background(if (isAlert) AuraColors.Orange else AuraColors.Paper)
                                            .border(1.dp, AuraColors.Ink, ModuleShape)
                                            .padding(vertical = 4.dp),
                                        horizontalAlignment = Alignment.CenterHorizontally
                                    ) {
                                        Text(lbl, style = AuraType.label.copy(fontSize = 8.sp, color = if (isAlert) AuraColors.Paper else AuraColors.InkSoft))
                                        Text("$score/10", style = AuraType.chip.copy(fontSize = 11.sp, color = if (isAlert) AuraColors.Paper else AuraColors.Ink))
                                        if (isAlert) {
                                            Text("⚠️ DESCARGA", style = AuraType.label.copy(fontSize = 6.sp, color = AuraColors.Paper))
                                        }
                                    }
                                }
                            }

                            val wVal = entry.waistCm.toDoubleOrNull()
                            val hVal = entry.hipCm.toDoubleOrNull()
                            if (entry.waistCm.isNotBlank() || entry.hipCm.isNotBlank()) {
                                val iccText = if (wVal != null && hVal != null && hVal > 0.0) {
                                    String.format(Locale.US, " · ICC: %.2f", wVal / hVal)
                                } else ""
                                Text("Cintura: ${entry.waistCm.ifBlank { "—" }} cm · Cadera: ${entry.hipCm.ifBlank { "—" }} cm$iccText", style = AuraType.label.copy(color = AuraColors.Ink))
                            }

                            if (entry.notes.isNotBlank()) {
                                Text(entry.notes, style = AuraType.body.copy(fontSize = 12.sp, color = AuraColors.InkSoft))
                            }
                        }
                    }
                }
            }
        }

        AuraPanel {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("ATLAS DE BIOHACKS · INTRA-SESIÓN", style = AuraType.label)
                val hacks = listOf(
                    Triple("Suspiro fisiológico doble", "Baja la activación simpática entre series pesadas", 30),
                    Triple("Enfriamiento palmar", "Disipa calor central y sostiene el reclutamiento", 60),
                    Triple("Isometría analgésica 70 %", "Irriga y calma el tendón rotuliano / tríceps", 45),
                    Triple("Vacuum post-T02", "Tono basal del transverso y cintura estrecha", 30)
                )
                hacks.forEach { (title, desc, seconds) ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(ModuleShape)
                            .background(AuraColors.Input)
                            .padding(10.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(title, style = AuraType.body.copy(fontWeight = FontWeight.Bold))
                            Text(desc, style = AuraType.label)
                        }
                        AuraChip(
                            text = "${seconds}s",
                            container = AuraColors.Ink,
                            contentColor = AuraColors.Lime,
                            onClick = { RestTimerService.startRest(context, seconds) }
                        )
                    }
                }
            }
        }
    }
}

// ───────────────────────── Descanso: dock + entorno ─────────────────────────

@Composable
private fun rememberRestSnapshot(): TimerSnapshot {
    val state by RestTimerStore.stateFlow.collectAsState()
    var nowMs by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(state.endsAt, state.complete) {
        while (state.endsAt > 0L) {
            nowMs = System.currentTimeMillis()
            delay(100L)
        }
        nowMs = System.currentTimeMillis()
    }
    return RestTimerTools.snapshot(state, nowMs)
}

private fun phaseAccent(snap: TimerSnapshot): Color = when {
    snap.status == "complete" -> AuraColors.Orange
    snap.stage == "ending" -> AuraColors.Orange
    snap.stage == "middle" -> AuraColors.Amber
    else -> AuraColors.Lime
}

private fun clockWeight(snap: TimerSnapshot): Int = when {
    snap.status == "complete" -> 900
    snap.stage == "ending" -> 800
    snap.stage == "middle" -> 550
    else -> 400
}

private fun statusLabel(snap: TimerSnapshot): String = when (snap.status) {
    "running" -> "EN CURSO · ${snap.stage.uppercase()}"
    "paused" -> "PAUSA"
    "complete" -> "¡YA!"
    else -> "LISTO"
}

private fun formatClock(snap: TimerSnapshot): String {
    val sec = ceil(snap.remaining).toInt()
    return String.format(Locale.US, "%02d:%02d", sec / 60, sec % 60)
}

@Composable
private fun PhaseHaptics(snap: TimerSnapshot) {
    val haptic = LocalHapticFeedback.current
    LaunchedEffect(snap.stage, snap.status) {
        if (snap.status == "running" || snap.status == "complete") {
            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
        }
    }
}

@Composable
private fun RestKey(
    text: String,
    container: Color,
    content: Color,
    modifier: Modifier = Modifier,
    width: androidx.compose.ui.unit.Dp = 52.dp,
    height: androidx.compose.ui.unit.Dp = 52.dp,
    onClick: () -> Unit
) {
    val resolvedContent = when {
        container == AuraColors.Orange || container == AuraColors.Forest ||
        container == AuraColors.Ink || container == AuraColors.Lime -> AuraColors.Paper
        else -> content
    }
    Box(
        modifier = modifier
            .width(width)
            .height(height)
            .tactile(onClick = onClick)
            .clip(ModuleShape)
            .background(container)
            .border(1.dp, AuraColors.Ink, ModuleShape),
        contentAlignment = Alignment.Center
    ) {
        Text(text, style = AuraType.chip.copy(fontSize = 13.sp), color = resolvedContent, textAlign = TextAlign.Center)
    }
}

@Composable
private fun RestDock(
    lastNfcEventText: String,
    readerModeActive: Boolean,
    onToggleReaderMode: () -> Unit,
    onExpand: () -> Unit
) {
    val context = LocalContext.current
    val snap = rememberRestSnapshot()
    PhaseHaptics(snap)
    val accent by animateColorAsState(phaseAccent(snap), tween(400), label = "dockAccent")
    val keyBg = AuraColors.Ink.copy(alpha = 0.08f)

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .padding(start = 12.dp, end = 16.dp, top = 2.dp, bottom = 8.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .hardShadow(4.dp, AuraColors.Ink, PanelShape)
                .clip(PanelShape)
                .background(AuraColors.Paper)
        ) {
            // Barra fina superior de progreso de fase
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(3.dp)
                    .background(AuraColors.Ink.copy(alpha = 0.10f))
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(snap.ratio.toFloat().coerceIn(0f, 1f))
                        .height(3.dp)
                        .background(if (snap.status == "running") accent else AuraColors.Ink)
                )
            }

            Column(
                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                verticalArrangement = Arrangement.spacedBy(5.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        modifier = Modifier
                            .tactile(onClick = onExpand)
                            .clip(ModuleShape)
                            .background(AuraColors.Ink)
                            .padding(horizontal = 10.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = formatClock(snap),
                            style = AuraType.number(26.sp, clockWeight(snap)),
                            color = if (snap.status == "running" || snap.status == "complete") accent else AuraColors.Input
                        )
                        Column {
                            Text(
                                text = statusLabel(snap),
                                style = AuraType.label.copy(fontSize = 9.sp, color = accent)
                            )
                            Text(
                                text = "POPUP ⤢",
                                style = AuraType.label.copy(fontSize = 8.sp, color = AuraColors.Input.copy(alpha = 0.7f))
                            )
                        }
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                        RestKey("−15", keyBg, AuraColors.Ink, width = 42.dp, height = 36.dp) {
                            RestTimerService.adjust(context, -15)
                        }
                        RestKey(
                            text = when (snap.status) {
                                "complete" -> "OFF"
                                "running" -> "II"
                                else -> "GO"
                            },
                            container = accent,
                            content = AuraColors.Paper,
                            width = 50.dp,
                            height = 36.dp
                        ) {
                            if (snap.status == "complete") RestTimerService.stopAndReset(context)
                            else RestTimerService.togglePause(context)
                        }
                        RestKey("+15", keyBg, AuraColors.Ink, width = 42.dp, height = 36.dp) {
                            RestTimerService.adjust(context, 15)
                        }
                    }
                }

                Row(horizontalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.fillMaxWidth()) {
                    for (preset in listOf(60, 90, 120, 180)) {
                        AuraChip(
                            text = "${preset}s",
                            modifier = Modifier.weight(1f),
                            container = keyBg,
                            contentColor = AuraColors.Ink,
                            minHeight = 26.dp,
                            onClick = { RestTimerService.startRest(context, preset) }
                        )
                    }
                    AuraChip(
                        text = "NFC",
                        modifier = Modifier.weight(1f),
                        container = if (readerModeActive) AuraColors.Orange else keyBg,
                        contentColor = if (readerModeActive) AuraColors.Paper else AuraColors.Ink,
                        minHeight = 26.dp,
                        onClick = onToggleReaderMode
                    )
                }
                if (readerModeActive) {
                    Text(lastNfcEventText, style = AuraType.label.copy(color = AuraColors.Ink))
                }
            }
        }
    }
}

@Composable
private fun RestEnvironment(
    lastNfcEventText: String,
    readerModeActive: Boolean,
    onToggleReaderMode: () -> Unit,
    onClose: () -> Unit
) {
    val context = LocalContext.current
    val snap = rememberRestSnapshot()
    PhaseHaptics(snap)
    val accent by animateColorAsState(phaseAccent(snap), tween(400), label = "envAccent")
    val keyBg = AuraColors.Ink.copy(alpha = 0.08f)
    BackHandler(onBack = onClose)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.48f))
            .pointerInput(Unit) {
                detectTapGestures(onTap = { onClose() })
            }
            .padding(horizontal = 20.dp),
        contentAlignment = Alignment.Center
    ) {
        AuraPanel(
            modifier = Modifier
                .fillMaxWidth()
                .pointerInput(Unit) {
                    detectTapGestures(onTap = { /* consume inside popup */ })
                }
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(18.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(RoundedCornerShape(2.dp))
                                .background(accent)
                        )
                        Text("CRONÓGRAFO · ${statusLabel(snap)}", style = AuraType.label.copy(color = AuraColors.Ink))
                    }
                    AuraChip(
                        text = "✕ CERRAR",
                        container = keyBg,
                        contentColor = AuraColors.Ink,
                        minHeight = 32.dp,
                        onClick = onClose
                    )
                }

                Box(
                    modifier = Modifier
                        .size(210.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(AuraColors.Ink),
                    contentAlignment = Alignment.Center
                ) {
                    Canvas(modifier = Modifier.size(176.dp)) {
                        val stroke = 7.dp.toPx()
                        val arcSize = Size(size.width - stroke, size.height - stroke)
                        val topLeft = Offset(stroke / 2f, stroke / 2f)
                        drawArc(
                            color = Color.White.copy(alpha = 0.12f),
                            startAngle = -90f,
                            sweepAngle = 360f,
                            useCenter = false,
                            topLeft = topLeft,
                            size = arcSize,
                            style = Stroke(stroke)
                        )
                        drawArc(
                            color = accent,
                            startAngle = -90f,
                            sweepAngle = 360f * snap.ratio.toFloat(),
                            useCenter = false,
                            topLeft = topLeft,
                            size = arcSize,
                            style = Stroke(stroke, cap = StrokeCap.Round)
                        )
                    }
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = formatClock(snap),
                            style = AuraType.number(54.sp, clockWeight(snap)),
                            color = AuraColors.Input
                        )
                        Text("OBJETIVO ${snap.total.toInt()}s", style = AuraType.label.copy(color = accent))
                    }
                }

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    RestKey("−15", keyBg, AuraColors.Ink, width = 68.dp, height = 50.dp) {
                        RestTimerService.adjust(context, -15)
                    }
                    RestKey(
                        text = when (snap.status) {
                            "complete" -> "APAGAR"
                            "running" -> "PAUSA"
                            else -> "GO"
                        },
                        container = accent,
                        content = AuraColors.Paper,
                        width = 110.dp,
                        height = 50.dp
                    ) {
                        if (snap.status == "complete") RestTimerService.stopAndReset(context)
                        else RestTimerService.togglePause(context)
                    }
                    RestKey("+15", keyBg, AuraColors.Ink, width = 68.dp, height = 50.dp) {
                        RestTimerService.adjust(context, 15)
                    }
                }

                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                    for (preset in listOf(60, 90, 120, 180)) {
                        AuraChip(
                            text = "${preset}s",
                            modifier = Modifier.weight(1f),
                            container = keyBg,
                            contentColor = AuraColors.Ink,
                            minHeight = 36.dp,
                            onClick = { RestTimerService.startRest(context, preset) }
                        )
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = lastNfcEventText,
                        style = AuraType.label.copy(color = AuraColors.InkFaint),
                        modifier = Modifier.weight(1f)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    AuraChip(
                        text = if (readerModeActive) "PARAR NFC" else "ESCUCHAR NFC",
                        container = if (readerModeActive) AuraColors.Orange else keyBg,
                        contentColor = if (readerModeActive) AuraColors.Paper else AuraColors.Ink,
                        minHeight = 34.dp,
                        onClick = onToggleReaderMode
                    )
                }
            }
        }
    }
}

// ───────────────────────── Utilidades ─────────────────────────

private fun parseDefaultRestSeconds(restText: String): Int {
    val lower = restText.lowercase()
    val nums = Regex("\\d+").findAll(lower).mapNotNull { it.value.toIntOrNull() }.toList()
    if (nums.isEmpty()) return 90
    val first = nums.first()
    return if (lower.contains("min")) (first * 60).coerceIn(30, 600) else first.coerceIn(15, 600)
}

private fun loadAssetBitmap(context: Context, assetPath: String): ImageBitmap? {
    return try {
        context.assets.open(assetPath).use { stream ->
            BitmapFactory.decodeStream(stream)?.asImageBitmap()
        }
    } catch (_: Exception) {
        null
    }
}

private fun copyAndShareJson(context: Context, filename: String, jsonContent: String) {
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    clipboard.setPrimaryClip(ClipData.newPlainText(filename, jsonContent))
    Toast.makeText(context, "$filename copiado al portapapeles", Toast.LENGTH_SHORT).show()
    try {
        val sendIntent = Intent(Intent.ACTION_SEND).apply {
            type = "application/json"
            putExtra(Intent.EXTRA_TITLE, filename)
            putExtra(Intent.EXTRA_TEXT, jsonContent)
        }
        context.startActivity(Intent.createChooser(sendIntent, "Exportar $filename"))
    } catch (_: Exception) {
    }
}

@Composable
private fun SettingsTab() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val settings by TrainingRepository.settings.collectAsState()
    val history by TrainingRepository.history.collectAsState()
    val checkins by TrainingRepository.checkins.collectAsState()
    val activePrescription by TrainingRepository.activePrescriptionFlow.collectAsState()

    val ringtonePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK && result.data != null) {
            val uri: Uri? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                result.data?.getParcelableExtra(RingtoneManager.EXTRA_RINGTONE_PICKED_URI, Uri::class.java)
            } else {
                @Suppress("DEPRECATION")
                result.data?.getParcelableExtra(RingtoneManager.EXTRA_RINGTONE_PICKED_URI)
            }
            if (uri != null) {
                val ringtone = RingtoneManager.getRingtone(context, uri)
                val title = ringtone.getTitle(context) ?: "Tono personalizado"
                TrainingRepository.updateSettings(
                    context,
                    settings.copy(
                        alarmSoundMode = "CUSTOM_URI",
                        customRingtoneUri = uri.toString(),
                        customRingtoneTitle = title
                    )
                )
                Toast.makeText(context, "Tono asignado: $title", Toast.LENGTH_SHORT).show()
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(start = 14.dp, end = 18.dp, bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // PANEL 1: ALARMA Y TEMPORIZADOR
        AuraPanel {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("ALARMA Y TEMPORIZADOR DE DESCANSO", style = AuraType.label)

                Text("TIPO DE ALARMA", style = AuraType.label.copy(color = AuraColors.Ink))
                val soundModes = listOf(
                    "BEEP_BRAUN" to "PITIDO BRAUN (NO CORTA MÚSICA)",
                    "NOTIFICATION" to "NOTIFICACIÓN CORTA",
                    "SYSTEM_ALARM" to "ALARMA SISTEMA",
                    "CUSTOM_URI" to "TONO DEL MÓVIL",
                    "VIBRATE_ONLY" to "SOLO VIBRACIÓN"
                )
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    soundModes.forEach { (mode, title) ->
                        val isSel = settings.alarmSoundMode == mode
                        AuraChip(
                            text = if (mode == "CUSTOM_URI" && settings.customRingtoneUri.isNotBlank()) "♫ ${settings.customRingtoneTitle}" else title,
                            selected = isSel,
                            container = if (isSel) AuraColors.Ink else AuraColors.Paper,
                            contentColor = if (isSel) AuraColors.Paper else AuraColors.Ink,
                            modifier = Modifier.fillMaxWidth(),
                            onClick = { TrainingRepository.updateSettings(context, settings.copy(alarmSoundMode = mode)) }
                        )
                    }
                }

                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                    AuraChip(
                        text = "♫ ELEGIR TONO",
                        container = AuraColors.CyanPill,
                        modifier = Modifier.weight(1f),
                        onClick = {
                            val intent = Intent(RingtoneManager.ACTION_RINGTONE_PICKER).apply {
                                putExtra(RingtoneManager.EXTRA_RINGTONE_TYPE, RingtoneManager.TYPE_ALARM or RingtoneManager.TYPE_NOTIFICATION)
                                putExtra(RingtoneManager.EXTRA_RINGTONE_TITLE, "Tono de aviso descanso")
                                putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_SILENT, false)
                                putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_DEFAULT, true)
                                if (settings.customRingtoneUri.isNotBlank()) {
                                    putExtra(RingtoneManager.EXTRA_RINGTONE_EXISTING_URI, Uri.parse(settings.customRingtoneUri))
                                }
                            }
                            ringtonePickerLauncher.launch(intent)
                        }
                    )
                    AuraChip(
                        text = "▶ PROBAR (2S)",
                        container = AuraColors.Orange,
                        contentColor = AuraColors.Paper,
                        modifier = Modifier.weight(1f),
                        onClick = { RestTimerService.previewAlarm(context) }
                    )
                }

                Text("DURACIÓN DEL AVISO SONORO", style = AuraType.label.copy(color = AuraColors.Ink))
                val durations = listOf(3 to "3 SEG", 4 to "4 SEG", 8 to "8 SEG", 0 to "BUCLE HASTA APAGAR")
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.fillMaxWidth()) {
                    durations.forEach { (sec, label) ->
                        val isSel = settings.alarmDurationSeconds == sec
                        AuraChip(
                            text = label,
                            selected = isSel,
                            container = if (isSel) AuraColors.Ink else AuraColors.Paper,
                            contentColor = if (isSel) AuraColors.Paper else AuraColors.Ink,
                            modifier = Modifier.weight(1f),
                            onClick = { TrainingRepository.updateSettings(context, settings.copy(alarmDurationSeconds = sec)) }
                        )
                    }
                }

                Text("VIBRACIÓN HÁPTICA", style = AuraType.label.copy(color = AuraColors.Ink))
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.fillMaxWidth()) {
                    AuraChip(
                        text = "ACTIVADA",
                        selected = settings.vibrationEnabled,
                        container = if (settings.vibrationEnabled) AuraColors.Ink else AuraColors.Paper,
                        contentColor = if (settings.vibrationEnabled) AuraColors.Paper else AuraColors.Ink,
                        modifier = Modifier.weight(1f),
                        onClick = { TrainingRepository.updateSettings(context, settings.copy(vibrationEnabled = true)) }
                    )
                    AuraChip(
                        text = "DESACTIVADA",
                        selected = !settings.vibrationEnabled,
                        container = if (!settings.vibrationEnabled) AuraColors.Ink else AuraColors.Paper,
                        contentColor = if (!settings.vibrationEnabled) AuraColors.Paper else AuraColors.Ink,
                        modifier = Modifier.weight(1f),
                        onClick = { TrainingRepository.updateSettings(context, settings.copy(vibrationEnabled = false)) }
                    )
                }

                Text("AUTO-INICIAR DESCANSO AL TOCAR EL RIR", style = AuraType.label.copy(color = AuraColors.Ink))
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.fillMaxWidth()) {
                    AuraChip(
                        text = "SÍ (AUTOMÁTICO)",
                        selected = settings.autoStartRestOnRir,
                        container = if (settings.autoStartRestOnRir) AuraColors.Ink else AuraColors.Paper,
                        contentColor = if (settings.autoStartRestOnRir) AuraColors.Paper else AuraColors.Ink,
                        modifier = Modifier.weight(1f),
                        onClick = { TrainingRepository.updateSettings(context, settings.copy(autoStartRestOnRir = true)) }
                    )
                    AuraChip(
                        text = "NO (MANUAL)",
                        selected = !settings.autoStartRestOnRir,
                        container = if (!settings.autoStartRestOnRir) AuraColors.Ink else AuraColors.Paper,
                        contentColor = if (!settings.autoStartRestOnRir) AuraColors.Paper else AuraColors.Ink,
                        modifier = Modifier.weight(1f),
                        onClick = { TrainingRepository.updateSettings(context, settings.copy(autoStartRestOnRir = false)) }
                    )
                }
            }
        }

        // PANEL 2: MOTOR DE PROGRESIÓN (ProgressionEngine)
        AuraPanel {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("MOTOR BIOMECÁNICO DE PROGRESIÓN", style = AuraType.label)

                Text("UMBRAL SALTO DE PLACA PARA EXIGIR PUENTE 16-18 REPS", style = AuraType.label.copy(color = AuraColors.Ink))
                val thresholds = listOf(10 to "10 %", 15 to "15 % (RECOMENDADO)", 20 to "20 %")
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.fillMaxWidth()) {
                    thresholds.forEach { (pct, label) ->
                        val isSel = settings.plateBridgeJumpPct == pct
                        AuraChip(
                            text = label,
                            selected = isSel,
                            container = if (isSel) AuraColors.Ink else AuraColors.Paper,
                            contentColor = if (isSel) AuraColors.Paper else AuraColors.Ink,
                            modifier = Modifier.weight(1f),
                            onClick = { TrainingRepository.updateSettings(context, settings.copy(plateBridgeJumpPct = pct)) }
                        )
                    }
                }

                AuraChip(
                    text = "⚡ RECALCULAR TODAS LAS SERIES DE HOY",
                    container = AuraColors.Orange,
                    contentColor = AuraColors.Paper,
                    modifier = Modifier.fillMaxWidth(),
                    minHeight = 48.dp,
                    onClick = {
                        val msg = TrainingRepository.recalculateActiveSessionProgression(context)
                        Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
                    }
                )
            }
        }

        // PANEL 3: DATOS Y ALMACENAMIENTO LOCAL
        AuraPanel {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("PUENTE NUBE ANTIGRAVITY & DATOS LOCALES", style = AuraType.label)
                Text(
                    text = "${history.size} sesiones en historial · ${checkins.size} bio check-ins guardados",
                    style = AuraType.heading.copy(fontSize = 14.sp)
                )
                Text(
                    text = "Prescripción activa: Día ${activePrescription?.dia ?: "-"} · ${activePrescription?.updatedAt?.take(16)?.replace('T', ' ') ?: "local"}",
                    style = AuraType.label.copy(color = AuraColors.Ink)
                )

                AuraChip(
                    text = "☁️ SINCRONIZAR SESIÓN Y PLANTILLAS CON AGENTE",
                    container = AuraColors.CyanPill,
                    modifier = Modifier.fillMaxWidth(),
                    minHeight = 48.dp,
                    onClick = {
                        scope.launch {
                            val (_, msg) = TrainingRepository.syncRemotePrescription(context, forceInject = true)
                            Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
                        }
                    }
                )

                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                    AuraChip(
                        text = "↗ EXPORTAR HISTORIAL",
                        container = AuraColors.Paper,
                        modifier = Modifier.weight(1f),
                        onClick = {
                            val jsonStr = JsonExporter.makeHistoryJson(history)
                            val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                            cm.setPrimaryClip(ClipData.newPlainText("Historial Dame Caña", jsonStr))
                            Toast.makeText(context, "Historial copiado al portapapeles", Toast.LENGTH_SHORT).show()
                        }
                    )
                    AuraChip(
                        text = "↗ EXPORTAR BIO",
                        container = AuraColors.Paper,
                        modifier = Modifier.weight(1f),
                        onClick = {
                            val jsonStr = kotlinx.serialization.json.Json { prettyPrint = true }.encodeToString(
                                kotlinx.serialization.builtins.ListSerializer(CheckinEntryV1.serializer()),
                                checkins
                            )
                            val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                            cm.setPrimaryClip(ClipData.newPlainText("Bio Checkins Dame Caña", jsonStr))
                            Toast.makeText(context, "Bio check-ins copiados al portapapeles", Toast.LENGTH_SHORT).show()
                        }
                    )
                }
            }
        }
    }
}
