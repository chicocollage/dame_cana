package com.example.focusguard

import android.Manifest
import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.RingtoneManager
import android.net.Uri
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : ComponentActivity() {
    
    private var nfcAdapter: NfcAdapter? = null
    private val viewModel: MainViewModel by viewModels()
    private var pendingTimerToSchedule: NfcTimer? = null
    
    // Grabación AAR y vinculación simultánea
    private val _writingAarForUid = mutableStateOf<String?>(null)
    val writingAarForUid: State<String?> = _writingAarForUid

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        if (isGranted) {
            pendingTimerToSchedule?.let { 
                AlarmScheduler.schedule(this, it)
                Toast.makeText(this, "Alarma del fuego programada", Toast.LENGTH_SHORT).show()
            }
        } else {
            Toast.makeText(this, "Permiso de notificaciones denegado", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        nfcAdapter = NfcAdapter.getDefaultAdapter(this)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
        
        setContent {
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = Color.White // Fondo mantel de cocina / papel cómic
                ) {
                    QueSeQuemaApp(
                        viewModel = viewModel,
                        writingAarForUid = _writingAarForUid.value,
                        onCancelWritingAar = { _writingAarForUid.value = null },
                        onRequestWriteAar = { uid -> _writingAarForUid.value = uid },
                        onStartFire = { timer ->
                            val endTime = System.currentTimeMillis() + timer.durationMs
                            val updatedTimer = timer.copy(endTimeMs = endTime)
                            viewModel.updateTimerState(updatedTimer)
                            checkPermissionsAndSchedule(updatedTimer)
                        },
                        onStopFire = { timer ->
                            viewModel.cancelTimerState(timer.uid)
                            AlarmScheduler.cancel(this, timer)
                            Toast.makeText(this, "Fuego apagado a tiempo", Toast.LENGTH_SHORT).show()
                        }
                    )
                }
            }
        }
        
        handleIntent(intent)
    }

    override fun onResume() {
        super.onResume()
        viewModel.refreshData()
        val pendingIntent = android.app.PendingIntent.getActivity(
            this, 0, Intent(this, javaClass).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP), android.app.PendingIntent.FLAG_MUTABLE
        )
        nfcAdapter?.enableForegroundDispatch(this, pendingIntent, null, null)
    }

    override fun onPause() {
        super.onPause()
        nfcAdapter?.disableForegroundDispatch(this)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent) {
        val hasNfcData = intent.action in listOf(
            NfcAdapter.ACTION_NDEF_DISCOVERED,
            NfcAdapter.ACTION_TECH_DISCOVERED,
            NfcAdapter.ACTION_TAG_DISCOVERED
        ) || intent.hasExtra(NfcAdapter.EXTRA_ID) || intent.hasExtra(NfcAdapter.EXTRA_TAG)

        if (!hasNfcData) return

        // Modo de grabación de auto-arranque en la pegatina
        val writingUid = _writingAarForUid.value
        if (writingUid != null) {
            @Suppress("DEPRECATION")
            val rawTag: Tag? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                intent.getParcelableExtra(NfcAdapter.EXTRA_TAG, Tag::class.java)
            } else {
                intent.getParcelableExtra(NfcAdapter.EXTRA_TAG)
            }
            
            if (rawTag != null) {
                val hexUid = rawTag.id.joinToString(":") { "%02X".format(it) }
                val result = NfcWriter.writeAppLaunchRecord(rawTag, packageName)
                result.onSuccess { msg ->
                    viewModel.linkTagToTimer(writingUid, hexUid)
                    Toast.makeText(this, "¡Pegatina vinculada y auto-arranque grabado!", Toast.LENGTH_LONG).show()
                }.onFailure { err ->
                    Toast.makeText(this, err.message ?: "Fallo al escribir en la pegatina", Toast.LENGTH_LONG).show()
                }
            }
            _writingAarForUid.value = null
            return
        }

        @Suppress("DEPRECATION")
        val rawId = intent.getByteArrayExtra(NfcAdapter.EXTRA_ID) ?: run {
            val tag: Tag? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                intent.getParcelableExtra(NfcAdapter.EXTRA_TAG, Tag::class.java)
            } else {
                intent.getParcelableExtra(NfcAdapter.EXTRA_TAG)
            }
            tag?.id
        }
            if (rawId != null) {
                val hexUid = rawId.joinToString(":") { "%02X".format(it) }
                val timer = viewModel.getTimer(hexUid)

                if (timer != null) {
                    // Si el tag es un comodín de remover (+1 min)
                    if (timer.type == TaskType.SNOOZE) {
                        val updated = viewModel.applyGlobalSnooze()
                        if (updated != null) {
                            checkPermissionsAndSchedule(updated)
                            Toast.makeText(this, "+1 Minuto para remover", Toast.LENGTH_SHORT).show()
                        } else {
                            Toast.makeText(this, "No hay ningún fuego encendido", Toast.LENGTH_SHORT).show()
                        }
                        return
                    }

                    // Si es un fuego de cocción: toggle encender / apagar
                    val isRunning = timer.endTimeMs != null && timer.endTimeMs > System.currentTimeMillis()
                    if (isRunning) {
                        viewModel.cancelTimerState(timer.uid)
                        AlarmScheduler.cancel(this, timer)
                        Toast.makeText(this, "Fuego apagado: " + timer.name, Toast.LENGTH_SHORT).show()
                    } else {
                        val endTime = System.currentTimeMillis() + timer.durationMs
                        val updatedTimer = timer.copy(endTimeMs = endTime)
                        viewModel.updateTimerState(updatedTimer)
                        checkPermissionsAndSchedule(updatedTimer)
                        Toast.makeText(this, "¡Fuego iniciado! " + timer.name, Toast.LENGTH_SHORT).show()
                    }
                } else {
                    // Tag no vinculado todavía: abrimos selector para asociarlo a un fuego
                    viewModel.setPairingUid(hexUid)
                }
            }
    }

    internal fun checkPermissionsAndSchedule(timer: NfcTimer) {
        val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
            val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
                data = Uri.parse("package:" + packageName)
            }
            startActivity(intent)
            Toast.makeText(this, "Otorga el permiso de alarmas y vuelve a intentarlo", Toast.LENGTH_LONG).show()
            return
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                pendingTimerToSchedule = timer
                requestPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                return
            }
        }

        AlarmScheduler.schedule(this, timer)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QueSeQuemaApp(
    viewModel: MainViewModel,
    writingAarForUid: String?,
    onCancelWritingAar: () -> Unit,
    onRequestWriteAar: (String) -> Unit,
    onStartFire: (NfcTimer) -> Unit,
    onStopFire: (NfcTimer) -> Unit
) {
    val timers by viewModel.timers.collectAsState()
    val pairingUid by viewModel.pairingUid.collectAsState()
    val appSettings by viewModel.appSettings.collectAsState()
    val context = LocalContext.current

    var showSettings by remember { mutableStateOf(false) }
    var editingTimer by remember { mutableStateOf<NfcTimer?>(null) }
    var showCustomFireModal by remember { mutableStateOf(false) }

    var currentTimeMs by remember { mutableStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) {
        while(true) {
            kotlinx.coroutines.delay(200)
            currentTimeMs = System.currentTimeMillis()
        }
    }

    val countdowns = timers.filter { it.type == TaskType.COUNTDOWN }.sortedBy { it.durationMs }
    val snoozeTag = timers.find { it.type == TaskType.SNOOZE }

    val anyFireActive = countdowns.any { it.endTimeMs != null && it.endTimeMs > currentTimeMs }

    val infiniteTransition = rememberInfiniteTransition(label = "headerPulse")
    val fireAlpha by infiniteTransition.animateFloat(
        initialValue = if (anyFireActive) 0.5f else 1f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(600, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "fireAlpha"
    )

    val titleColor by animateColorAsState(
        targetValue = if (anyFireActive) Color(0xFFFF4838) else Color.Black,
        animationSpec = tween(500),
        label = "titleColor"
    )

    Scaffold(
        modifier = Modifier.systemBarsPadding(),
        containerColor = Color.Transparent,
        topBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            "¡QUE SE QUEMA!",
                            fontWeight = FontWeight.Black,
                            fontSize = 26.sp,
                            letterSpacing = (-1).sp,
                            color = titleColor
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            "🔥",
                            fontSize = 24.sp,
                            modifier = Modifier.graphicsLayer { alpha = fireAlpha }
                        )
                    }
                    Text(
                        "Temporizadores de cocina con NFC",
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        color = Color(0xFFD97706)
                    )
                }

                Box(
                    modifier = Modifier
                        .size(46.dp)
                        .neoBrutalismBounce { showSettings = true }
                        .neoBrutalismCard(cornerRadius = 8.dp, shadowOffset = 3.dp, borderWidth = 4.dp, backgroundColor = Color.White),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.Settings, contentDescription = "Ajustes", tint = Color.Black, modifier = Modifier.size(24.dp))
                }
            }
        },
        floatingActionButton = {
            // Botón cómic para fuego personalizado
            Box(
                modifier = Modifier
                    .neoBrutalismBounce { showCustomFireModal = true }
                    .neoBrutalismCard(cornerRadius = 8.dp, shadowOffset = 5.dp, borderWidth = 4.dp, backgroundColor = Color(0xFFFFA500))
                    .padding(horizontal = 20.dp, vertical = 14.dp),
                contentAlignment = Alignment.Center
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Add, contentDescription = "Añadir", tint = Color.Black, modifier = Modifier.size(24.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Otro Tiempo", fontWeight = FontWeight.Black, color = Color.Black, fontSize = 15.sp)
                }
            }
        }
    ) { paddingValues ->
        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(14.dp),
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 16.dp)
        ) {
            // Banner de la cuchara comodín (+1 Minuto)
            item {
                SnoozeKitchenBanner(
                    timer = snoozeTag,
                    onManualReduce = {
                        val updated = viewModel.adjustActiveTimer(-60_000L)
                        if (updated != null) {
                            (context as MainActivity).checkPermissionsAndSchedule(updated)
                            Toast.makeText(context, "-1 Minuto al fuego", Toast.LENGTH_SHORT).show()
                        } else {
                            Toast.makeText(context, "Ningún fuego encendido", Toast.LENGTH_SHORT).show()
                        }
                    },
                    onManualSnooze = {
                        val updated = viewModel.adjustActiveTimer(60_000L)
                        if (updated != null) {
                            (context as MainActivity).checkPermissionsAndSchedule(updated)
                            Toast.makeText(context, "+1 Minuto para remover", Toast.LENGTH_SHORT).show()
                        } else {
                            Toast.makeText(context, "Ningún fuego encendido", Toast.LENGTH_SHORT).show()
                        }
                    },
                    onConfigure = {
                        snoozeTag?.let { editingTimer = it }
                    }
                )
            }

            // Lista horizontal con los fuegos
            items(countdowns, key = { it.uid }) { fire ->
                KitchenFireCard(
                    timer = fire,
                    currentTimeMs = currentTimeMs,
                    onToggleFire = {
                        val isRunning = fire.endTimeMs != null && fire.endTimeMs > System.currentTimeMillis()
                        if (isRunning) {
                            onStopFire(fire)
                        } else {
                            onStartFire(fire)
                        }
                    },
                    onEditTag = {
                        editingTimer = fire
                    }
                )
            }

            item {
                Spacer(modifier = Modifier.height(90.dp))
            }
        }
    }

    // Modal para vincular tag escaneado a uno de los fuegos
    pairingUid?.let { tagUid ->
        BindTagToFireDialog(
            scannedTagUid = tagUid,
            countdowns = countdowns,
            onAssignToTimer = { timerUid ->
                viewModel.linkTagToTimer(timerUid, tagUid)
                Toast.makeText(context, "¡Pegatina vinculada al fuego!", Toast.LENGTH_SHORT).show()
            },
            onDismiss = { viewModel.dismissPairing() }
        )
    }

    // Modal de edición / vinculación de tag de un fuego específico
    editingTimer?.let { fire ->
        EditFireTagModal(
            fire = fire,
            onSave = { updatedName, minutes ->
                viewModel.saveTimer(fire.uid, updatedName, minutes * 60)
                editingTimer = null
            },
            onUnlinkTag = {
                viewModel.saveTimer(fire.uid, fire.name, (fire.durationMs / 1000).toInt(), linkedTag = null)
                editingTimer = null
            },
            onDelete = if (fire.uid.startsWith("fuego_custom_")) {
                {
                    viewModel.deleteTimer(fire.uid)
                    editingTimer = null
                    Toast.makeText(context, "Fuego eliminado", Toast.LENGTH_SHORT).show()
                }
            } else null,
            onRequestWriteAar = { onRequestWriteAar(fire.uid) },
            onDismiss = { editingTimer = null }
        )
    }

    // Modal para crear fuego personalizado (ej. 20, 30, 45 min)
    if (showCustomFireModal) {
        CustomFireModal(
            onSave = { name, mins ->
                val newUid = "fuego_custom_" + System.currentTimeMillis()
                viewModel.saveTimer(newUid, name, mins * 60)
                showCustomFireModal = false
            },
            onDismiss = { showCustomFireModal = false }
        )
    }

    // Modal de grabación AAR
    if (writingAarForUid != null) {
        AlertDialog(
            onDismissRequest = onCancelWritingAar,
            shape = RoundedCornerShape(24.dp),
            containerColor = Color.White,
            title = { Text("Grabando Auto-Arranque", fontWeight = FontWeight.Black, color = Color.Black) },
            text = { 
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Acerca la pegatina NFC ahora para que Android abra 'Que se quema' automáticamente al tocarla.", color = Color.DarkGray)
                    Spacer(modifier = Modifier.height(16.dp))
                    CircularProgressIndicator(color = Color(0xFFFF5722))
                }
            },
            confirmButton = { },
            dismissButton = {
                TextButton(onClick = onCancelWritingAar) {
                    Text("Cancelar", color = Color.Black, fontWeight = FontWeight.Bold)
                }
            }
        )
    }

    if (showSettings) {
        KitchenSettingsModal(
            appSettings = appSettings,
            onSettingsChanged = { viewModel.updateSettings(it) },
            onDismiss = { showSettings = false }
        )
    }
}

@Composable
fun SnoozeKitchenBanner(
    timer: NfcTimer?,
    onManualReduce: () -> Unit,
    onManualSnooze: () -> Unit,
    onConfigure: () -> Unit
) {
    val isLinked = timer?.linkedNfcUid != null || (timer?.uid != null && !timer.uid.startsWith("snooze_global"))

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .neoBrutalismCard(cornerRadius = 8.dp, shadowOffset = 6.dp, borderWidth = 4.dp, backgroundColor = Color(0xFFFFD166))
            .padding(14.dp)
    ) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                    Text("🥄", fontSize = 28.sp)
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text("CONTROL GLOBAL", fontWeight = FontWeight.Black, fontSize = 16.sp, color = Color.Black)
                        Text(
                            if (isLinked) "🏷️ Pegatina NFC vinculada" else "Ajusta el fuego activo",
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = Color(0xFF78350F)
                        )
                    }
                }
                IconButton(onClick = onConfigure) {
                    Icon(Icons.Default.Edit, contentDescription = "Configurar", tint = Color.Black)
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .neoBrutalismBounce { onManualReduce() }
                        .neoBrutalismCard(cornerRadius = 8.dp, shadowOffset = 4.dp, borderWidth = 3.dp, backgroundColor = Color(0xFFFFE4E6))
                        .padding(12.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text("-1 MIN", fontWeight = FontWeight.Black, color = Color.Black, fontSize = 16.sp)
                }
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .neoBrutalismBounce { onManualSnooze() }
                        .neoBrutalismCard(cornerRadius = 8.dp, shadowOffset = 4.dp, borderWidth = 3.dp, backgroundColor = Color(0xFFD1FAE5))
                        .padding(12.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text("+1 MIN", fontWeight = FontWeight.Black, color = Color.Black, fontSize = 16.sp)
                }
            }
        }
    }
}

@Composable
fun KitchenFireCard(
    timer: NfcTimer,
    currentTimeMs: Long,
    onToggleFire: () -> Unit,
    onEditTag: () -> Unit
) {
    val isRunning = timer.endTimeMs != null && timer.endTimeMs > currentTimeMs
    val isLinked = timer.linkedNfcUid != null || (!timer.uid.startsWith("fuego_"))
    val minutes = (timer.durationMs / 60000).toInt()

    val totalSecs = if (isRunning) ((timer.endTimeMs!! - currentTimeMs) / 1000).coerceAtLeast(0) else 0L
    val ratio = if (isRunning && timer.durationMs > 0) {
        (timer.endTimeMs!! - currentTimeMs).toFloat() / timer.durationMs.toFloat()
    } else 0f

    val isCritical = isRunning && ratio <= 0.30f

    // Escala de temperatura visual: Cartón base -> Cartón tostado -> Cartón quemado (rojo)
    val targetBgColor = when {
        !isRunning -> Color.White // Cartón Kraft
        isCritical -> Color(0xFFFF3333) // Cartón rojizo quemado
        else -> Color(0xFFFFA500) // Cartón tostado
    }

    val cardColor by animateColorAsState(
        targetValue = targetBgColor,
        animationSpec = tween(400),
        label = "fireCardColor"
    )

    // Animación de pulso cuando está en estado crítico (<30% de tiempo)
    val criticalPulseTransition = rememberInfiniteTransition(label = "criticalPulse")
    val pulseScale by criticalPulseTransition.animateFloat(
        initialValue = 0.98f,
        targetValue = 1.02f,
        animationSpec = infiniteRepeatable(
            animation = tween(350, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "criticalPulseScale"
    )

    // Rotación sutil y orgánica basada en el ID del fuego
    val rotationAngle = remember(timer.uid) {
        val hash = timer.uid.hashCode()
        (hash % 5) - 2f // entre -2 y +2 grados
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            
            .scale(if (isCritical) pulseScale else 1f)
            .neoBrutalismBounce { onEditTag() }
            .neoBrutalismCard(
                
                cornerRadius = 8.dp,
                shadowOffset = if (isRunning) 6.dp else 4.dp,
                borderWidth = 4.dp,
                backgroundColor = cardColor
            )
            .padding(horizontal = 18.dp, vertical = 14.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Lado izquierdo: Información y tiempo gigante
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (isRunning) {
                        val m = totalSecs / 60
                        val s = totalSecs % 60
                        Text(
                            text = String.format("%02d:%02d", m, s),
                            fontWeight = FontWeight.Black,
                            fontSize = 38.sp,
                            color = Color.White,
                            letterSpacing = 1.sp
                        )
                    } else {
                        Text(
                            text = "$minutes MIN",
                            fontWeight = FontWeight.Black,
                            fontSize = 36.sp,
                            color = Color.Black,
                            letterSpacing = (-1).sp
                        )
                    }

                    if (isCritical) {
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("🔥", fontSize = 24.sp)
                    }
                }

                Spacer(modifier = Modifier.height(2.dp))

                val dishName = timer.name.substringAfter("(").substringBefore(")").ifBlank { timer.name }
                Text(
                    text = dishName,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = when {
                        !isRunning -> Color(0xFF64748B)
                        isCritical -> Color.Yellow
                        else -> Color.White
                    },
                    maxLines = 1
                )

                Spacer(modifier = Modifier.height(6.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = when {
                            isRunning && isCritical -> "¡A PUNTO DE QUEMARSE!"
                            isRunning -> "Cocinando..."
                            isLinked -> "🏷️ Vinculado"
                            else -> "Sin pegatina"
                        },
                        fontWeight = FontWeight.Black,
                        fontSize = 11.sp,
                        color = when {
                            !isRunning -> Color(0xFF475569)
                            isCritical -> Color.White
                            else -> Color(0xFF78350F)
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Lado derecho: Botón Play / Stop grande
            Box(
                modifier = Modifier
                    .size(54.dp)
                    .neoBrutalismBounce { onToggleFire() }
                    .neoBrutalismCard(
                        cornerRadius = 8.dp,
                        shadowOffset = 3.dp,
                        borderWidth = 4.dp,
                        backgroundColor = if (isRunning) Color.Black else Color(0xFFFFA500)
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = if (isRunning) Icons.Default.Clear else Icons.Default.PlayArrow,
                    contentDescription = if (isRunning) "Parar" else "Arrancar",
                    tint = if (isRunning) Color.White else Color.Black,
                    modifier = Modifier.size(30.dp)
                )
            }
        }
    }
}

@Composable
fun BindTagToFireDialog(
    scannedTagUid: String,
    countdowns: List<NfcTimer>,
    onAssignToTimer: (String) -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        shape = RoundedCornerShape(28.dp),
        containerColor = Color.White,
        title = {
            Text("¡Nueva Pegatina Detectada!", fontWeight = FontWeight.Black, color = Color.Black, fontSize = 20.sp)
        },
        text = {
            Column {
                Text("¿A qué fuego de la cocina quieres asignar esta pegatina?", color = Color.DarkGray, fontSize = 14.sp)
                Spacer(modifier = Modifier.height(16.dp))
                
                countdowns.forEach { fire ->
                    val mins = (fire.durationMs / 60000).toInt()
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp)
                            .neoBrutalismBounce { onAssignToTimer(fire.uid); onDismiss() }
                            .neoBrutalismCard(cornerRadius = 8.dp, shadowOffset = 3.dp, borderWidth = 4.dp, backgroundColor = Color(0xFFFFA500))
                            .padding(horizontal = 14.dp, vertical = 10.dp)
                    ) {
                        Text(
                            text = "Fuego de " + mins.toString() + " Minutos (" + fire.name + ")",
                            fontWeight = FontWeight.Black,
                            color = Color.Black,
                            fontSize = 13.sp
                        )
                    }
                }
            }
        },
        confirmButton = { },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancelar", fontWeight = FontWeight.Bold, color = Color.Black)
            }
        }
    )
}

@Composable
fun EditFireTagModal(
    fire: NfcTimer,
    onSave: (String, Int) -> Unit,
    onUnlinkTag: () -> Unit,
    onDelete: (() -> Unit)? = null,
    onRequestWriteAar: () -> Unit,
    onDismiss: () -> Unit
) {
    var name by remember { mutableStateOf(fire.name) }
    var minsStr by remember { mutableStateOf((fire.durationMs / 60000).toString()) }

    AlertDialog(
        onDismissRequest = onDismiss,
        shape = RoundedCornerShape(28.dp),
        containerColor = Color.White,
        title = { Text("Configurar Fuego", fontWeight = FontWeight.Black, color = Color.Black) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Nombre / Plato") },
                    singleLine = true,
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = minsStr,
                    onValueChange = { minsStr = it },
                    label = { Text("Minutos de cocción") },
                    singleLine = true,
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                if (fire.linkedNfcUid != null) {
                    Text("🏷️ Tag NFC: " + fire.linkedNfcUid, fontSize = 12.sp, color = Color(0xFF16A34A), fontWeight = FontWeight.Bold)
                    TextButton(onClick = onUnlinkTag) {
                        Text("Desvincular Pegatina", color = Color(0xFFDC2626), fontWeight = FontWeight.Bold)
                    }
                } else {
                    Text("Acerca una pegatina NFC con la app abierta para vincularla a este fuego.", fontSize = 12.sp, color = Color.Gray)
                }

                // Botón para inyectar auto-arranque en la pegatina
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .neoBrutalismBounce { onRequestWriteAar() }
                        .neoBrutalismCard(cornerRadius = 8.dp, shadowOffset = 3.dp, borderWidth = 4.dp, backgroundColor = Color.White)
                        .padding(vertical = 10.dp, horizontal = 14.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text("Grabar Auto-Arranque en Pegatina (AAR)", fontWeight = FontWeight.Black, color = Color.Black, fontSize = 12.sp)
                }

                // Opción para eliminar fuegos personalizados
                if (onDelete != null) {
                    HorizontalDivider(color = Color(0xFFE2E8F0))
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .neoBrutalismBounce { onDelete() }
                            .neoBrutalismCard(cornerRadius = 8.dp, shadowOffset = 3.dp, borderWidth = 4.dp, backgroundColor = Color(0xFFFF3333))
                            .padding(vertical = 10.dp, horizontal = 14.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Delete, contentDescription = "Eliminar", tint = Color(0xFFDC2626), modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("ELIMINAR ESTE FUEGO", fontWeight = FontWeight.Black, color = Color(0xFFDC2626), fontSize = 12.sp)
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    val m = minsStr.toIntOrNull() ?: 5
                    onSave(name.ifBlank { "Fuego" }, m)
                }
            ) {
                Text("GUARDAR", fontWeight = FontWeight.Black, color = Color.Black)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("CERRAR", fontWeight = FontWeight.Bold, color = Color.Gray)
            }
        }
    )
}

@Composable
fun CustomFireModal(
    onSave: (String, Int) -> Unit,
    onDismiss: () -> Unit
) {
    var name by remember { mutableStateOf("") }
    var minsStr by remember { mutableStateOf("20") }

    AlertDialog(
        onDismissRequest = onDismiss,
        shape = RoundedCornerShape(28.dp),
        containerColor = Color.White,
        title = { Text("Añadir Otro Fuego", fontWeight = FontWeight.Black, color = Color.Black) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Nombre (ej. Horno, Asado)") },
                    singleLine = true,
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = minsStr,
                    onValueChange = { minsStr = it },
                    label = { Text("Minutos") },
                    singleLine = true,
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    val m = minsStr.toIntOrNull() ?: 20
                    onSave(if (name.isBlank()) (m.toString() + " Minutos") else name, m)
                }
            ) {
                Text("AÑADIR", fontWeight = FontWeight.Black, color = Color.Black)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("CANCELAR", fontWeight = FontWeight.Bold, color = Color.Gray)
            }
        }
    )
}

@Composable
fun KitchenSettingsModal(
    appSettings: AppSettings,
    onSettingsChanged: (AppSettings) -> Unit,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val ringtonePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == android.app.Activity.RESULT_OK) {
            val uri: Uri? = result.data?.getParcelableExtra(RingtoneManager.EXTRA_RINGTONE_PICKED_URI)
            onSettingsChanged(appSettings.copy(alarmToneUri = uri?.toString()))
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        shape = RoundedCornerShape(28.dp),
        containerColor = Color.White,
        title = { Text("Ajustes de Cocina", fontWeight = FontWeight.Black, color = Color.Black) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                
                // Ringtone Selection
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Sirena de la Cocina", fontWeight = FontWeight.Bold, color = Color.Black)
                        Text(if (appSettings.alarmToneUri != null) "Personalizada" else "Por defecto", fontSize = 12.sp, color = Color.Gray)
                    }
                    Button(
                        onClick = {
                            val intent = Intent(RingtoneManager.ACTION_RINGTONE_PICKER).apply {
                                putExtra(RingtoneManager.EXTRA_RINGTONE_TYPE, RingtoneManager.TYPE_ALARM)
                                putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_DEFAULT, true)
                                putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_SILENT, false)
                            }
                            ringtonePickerLauncher.launch(intent)
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color.Black)
                    ) {
                        Text("Cambiar", color = Color.White, fontWeight = FontWeight.Bold)
                    }
                }

                HorizontalDivider(color = Color(0xFFE2E8F0))

                // Force Volume
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Secuestro de Volumen", fontWeight = FontWeight.Bold, color = Color.Black)
                        Text("Pone el móvil al 100% de sonido al quemarse", fontSize = 12.sp, color = Color.Gray)
                    }
                    Switch(
                        checked = appSettings.forceMaxVolume,
                        onCheckedChange = { onSettingsChanged(appSettings.copy(forceMaxVolume = it)) },
                        colors = SwitchDefaults.colors(checkedThumbColor = Color(0xFFFF4838), checkedTrackColor = Color(0xFFFF4838).copy(alpha=0.5f))
                    )
                }

                HorizontalDivider(color = Color(0xFFE2E8F0))

                // Notification Permission
                val hasNotificationPermission = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
                } else {
                    true
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Permiso de Alarma", fontWeight = FontWeight.Bold, color = Color.Black)
                        Text(if (hasNotificationPermission) "Activo" else "Requerido para despertar la pantalla", fontSize = 12.sp, color = if (hasNotificationPermission) Color(0xFF16A34A) else Color(0xFFDC2626))
                    }
                    if (!hasNotificationPermission) {
                        Button(
                            onClick = {
                                val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                                    data = Uri.parse("package:" + context.packageName)
                                }
                                context.startActivity(intent)
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626))
                        ) {
                            Text("Permitir", color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    } else {
                        Icon(Icons.Default.CheckCircle, contentDescription = "OK", tint = Color(0xFF16A34A))
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("CERRAR", fontWeight = FontWeight.Black, color = Color.Black)
            }
        }
    )
}
