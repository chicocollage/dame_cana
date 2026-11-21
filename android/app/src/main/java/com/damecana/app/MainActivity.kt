package com.damecana.app

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.core.content.ContextCompat
import com.damecana.app.data.TrainingRepository
import com.damecana.app.domain.RestTimerTools
import com.damecana.app.system.NfcHelper
import com.damecana.app.system.RestTimerService
import com.damecana.app.system.RestTimerStore
import com.damecana.app.ui.AuraTheme
import com.damecana.app.ui.DameCanaMainApp

class MainActivity : ComponentActivity() {

    private var lastNfcEventText by mutableStateOf("NFC listo (acerca etiqueta o activa escucha UID)")
    private var readerModeActive by mutableStateOf(false)

    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { _ -> }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        RestTimerStore.load(this)
        TrainingRepository.init(this)
        requestNotificationPermissionIfNeeded()
        handleIncomingNfcIntent(intent)

        enableEdgeToEdge()
        setContent {
            AuraTheme {
                DameCanaMainApp(
                    lastNfcEventText = lastNfcEventText,
                    readerModeActive = readerModeActive,
                    onToggleReaderMode = { toggleSafeReaderMode() }
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIncomingNfcIntent(intent)
    }

    private fun handleIncomingNfcIntent(incoming: Intent?) {
        val cmd = NfcHelper.extractCommandFromIntent(this, incoming) ?: return
        NfcHelper.executeCommand(this, cmd)
        lastNfcEventText = when (cmd.type) {
            "rest" -> "NFC URL → Descanso ${cmd.seconds}s"
            "toggle" -> "NFC URL → Pausa/Reanudar"
            else -> "Comando NFC: ${cmd.type}"
        }
    }

    private fun toggleSafeReaderMode() {
        if (readerModeActive) {
            NfcHelper.disableReaderMode(this)
            readerModeActive = false
            lastNfcEventText = "Modo escucha NFC desactivado"
        } else {
            NfcHelper.enableSafeReaderMode(this) { uidHex, ndefUrl ->
                val learned = RestTimerStore.getLearnedTags(this)[uidHex]
                if (ndefUrl != null) {
                    val queryIdx = ndefUrl.indexOf('?')
                    val query = if (queryIdx >= 0) ndefUrl.substring(queryIdx) else ""
                    val cmd = RestTimerTools.parseNfcCommand(query)
                    if (cmd != null) {
                        NfcHelper.executeCommand(this, cmd)
                        lastNfcEventText = "Tag NDEF ($uidHex) → ${cmd.type} ${cmd.seconds ?: ""}"
                        return@enableSafeReaderMode
                    }
                }
                if (learned != null) {
                    val cmd = RestTimerTools.parseNfcCommand(learned)
                    if (cmd != null) {
                        NfcHelper.executeCommand(this, cmd)
                        lastNfcEventText = "Tag aprendido ($uidHex) → $learned"
                        return@enableSafeReaderMode
                    }
                } else {
                    RestTimerStore.saveLearnedTag(this, uidHex, "?descanso=90")
                    RestTimerService.startRest(this, 90)
                    lastNfcEventText = "Nuevo UID aprendido ($uidHex) → 90s arrancado"
                }
            }
            readerModeActive = true
            lastNfcEventText = "Escuchando NFC (Solo lectura segura de UID/NDEF)..."
        }
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) !=
                PackageManager.PERMISSION_GRANTED
            ) {
                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }
}
