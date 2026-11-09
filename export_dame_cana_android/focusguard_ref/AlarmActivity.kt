package com.example.focusguard

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.nfc.NfcAdapter
import android.os.Bundle
import android.view.WindowManager
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.animateColor
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

class AlarmActivity : ComponentActivity() {

    private var nfcAdapter: NfcAdapter? = null
    private var alarmUid: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        nfcAdapter = NfcAdapter.getDefaultAdapter(this)
        
        // Despertar pantalla y romper Doze
        window.addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_ALLOW_LOCK_WHILE_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
        )
        
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            val km = getSystemService(Context.KEYGUARD_SERVICE) as? android.app.KeyguardManager
            km?.requestDismissKeyguard(this, null)
        }

        alarmUid = intent.getStringExtra("UID")

        setContent {
            MaterialTheme {
                val infiniteTransition = rememberInfiniteTransition(label = "fireAlarmPulse")
                val flameScale by infiniteTransition.animateFloat(
                    initialValue = 0.92f,
                    targetValue = 1.08f,
                    animationSpec = infiniteRepeatable(
                        animation = tween(400, easing = FastOutSlowInEasing),
                        repeatMode = RepeatMode.Reverse
                    ),
                    label = "flameScale"
                )

                val bgColor by rememberInfiniteTransition(label = "bgFlash").animateColor(
                    initialValue = Color(0xFFFFF275),
                    targetValue = Color(0xFFFFD166),
                    animationSpec = infiniteRepeatable(tween(800), RepeatMode.Reverse),
                    label = "bgColor"
                )

                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = bgColor // Fondo amarillo cómic estridente parpadeante
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(20.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        // Tarjeta cómic de explosión de cocina
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .neoBrutalismCard(
                                    cornerRadius = 28.dp,
                                    shadowOffset = 8.dp,
                                    borderWidth = 4.dp,
                                    backgroundColor = Color(0xFFFF4838) // Rojo tomate de fuego
                                )
                                .padding(24.dp)
                        ) {
                            Column(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                // Llama animada grande
                                Text(
                                    text = "🔥",
                                    fontSize = 80.sp,
                                    modifier = Modifier.scale(flameScale)
                                )

                                Spacer(modifier = Modifier.height(20.dp))

                                Text(
                                    text = "¡QUE SE QUEMA!",
                                    fontSize = 32.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color.White,
                                    textAlign = TextAlign.Center,
                                    letterSpacing = (-1).sp
                                )

                                Spacer(modifier = Modifier.height(10.dp))

                                Text(
                                    text = "¡APAGA EL FUEGO!",
                                    fontSize = 20.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color.Yellow,
                                    textAlign = TextAlign.Center
                                )

                                Spacer(modifier = Modifier.height(14.dp))

                                Text(
                                    text = "El temporizador ha terminado.",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    textAlign = TextAlign.Center,
                                    color = Color.White
                                )
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = "Acerca la pegatina NFC para silenciar.",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    textAlign = TextAlign.Center,
                                    color = Color.Yellow,
                                    lineHeight = 20.sp
                                )

                                Spacer(modifier = Modifier.height(30.dp))

                                // Diana visual NFC
                                Box(
                                    modifier = Modifier
                                        .size(70.dp)
                                        .background(Color.White.copy(alpha = 0.2f), CircleShape)
                                        .border(2.dp, Color.White, CircleShape),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text("NFC", fontWeight = FontWeight.Black, color = Color.White, fontSize = 16.sp)
                                }

                                Spacer(modifier = Modifier.height(36.dp))

                                // Botón de apagado forzado de emergencia
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .neoBrutalismBounce { stopAlarmAndFinish() }
                                        .neoBrutalismCard(
                                            cornerRadius = 18.dp,
                                            shadowOffset = 4.dp,
                                            borderWidth = 3.dp,
                                            backgroundColor = Color.Black
                                        )
                                        .padding(vertical = 14.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = "APAGADO DE EMERGENCIA",
                                        color = Color.White,
                                        fontWeight = FontWeight.Black,
                                        fontSize = 13.sp,
                                        letterSpacing = 1.sp
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        val pendingIntent = PendingIntent.getActivity(
            this, 0, Intent(this, javaClass).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP), PendingIntent.FLAG_MUTABLE
        )
        nfcAdapter?.enableForegroundDispatch(this, pendingIntent, null, null)
    }

    override fun onPause() {
        super.onPause()
        nfcAdapter?.disableForegroundDispatch(this)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (NfcAdapter.ACTION_TAG_DISCOVERED == intent.action || 
            NfcAdapter.ACTION_TECH_DISCOVERED == intent.action || 
            NfcAdapter.ACTION_NDEF_DISCOVERED == intent.action) {
            
            val rawId = intent.getByteArrayExtra(NfcAdapter.EXTRA_ID)
            if (rawId != null) {
                val hexUid = rawId.joinToString(":") { "%02X".format(it) }
                val repo = TimerRepository(this)
                val scannedTimer = repo.getTimerByUidOrLinkedTag(hexUid)
                
                // Si escanea un comodín durante la alarma -> Prórroga de emergencia de 1 min
                if (scannedTimer != null && scannedTimer.type == TaskType.SNOOZE && alarmUid != null) {
                    val ringingTimer = repo.getTimerByUidOrLinkedTag(alarmUid!!)
                    if (ringingTimer != null && ringingTimer.type == TaskType.COUNTDOWN) {
                        val updated = ringingTimer.copy(endTimeMs = System.currentTimeMillis() + 60_000L)
                        repo.updateTimer(updated)
                        AlarmScheduler.schedule(this, updated)
                        Toast.makeText(this, "¡1 Minuto de prórroga para remover!", Toast.LENGTH_SHORT).show()
                        
                        val stopIntent = Intent(this, AlarmService::class.java).apply {
                            action = "SNOOZE_ALARM"
                        }
                        startService(stopIntent)
                        finish()
                        return
                    }
                }

                // Si escanea el tag vinculado al fuego que estaba sonando
                val ringingTimer = repo.getTimerByUidOrLinkedTag(alarmUid ?: "")
                val isMatching = (alarmUid == hexUid) || (ringingTimer?.linkedNfcUid == hexUid) || (ringingTimer?.uid == hexUid)

                if (isMatching) {
                    Toast.makeText(this, "¡Fuego apagado a tiempo!", Toast.LENGTH_SHORT).show()
                    stopAlarmAndFinish()
                } else {
                    Toast.makeText(this, "Esta pegatina no es la de este fuego.", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun stopAlarmAndFinish() {
        val stopIntent = Intent(this, AlarmService::class.java).apply {
            action = "STOP_ALARM"
            putExtra("UID", alarmUid)
        }
        startService(stopIntent)
        finish()
    }
}
