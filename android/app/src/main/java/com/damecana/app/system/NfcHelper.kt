package com.damecana.app.system

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.nfc.NdefMessage
import android.nfc.NdefRecord
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.Ndef
import android.nfc.tech.NdefFormatable
import com.damecana.app.domain.NfcCommand
import com.damecana.app.domain.RestTimerTools

object NfcHelper {
    const val BASE_NFC_URL = "https://dame-cana-pwa.web.app/app/"

    fun buildRestUrl(seconds: Int): String = "$BASE_NFC_URL?descanso=${seconds.coerceIn(10, 1800)}"
    fun buildPauseUrl(): String = "$BASE_NFC_URL?accion=pausa"

    fun extractCommandFromIntent(context: Context, intent: Intent?): NfcCommand? {
        if (intent == null) return null
        val dataUri = intent.data
        if (dataUri != null && dataUri.query != null) {
            val cmd = RestTimerTools.parseNfcCommand("?${dataUri.query}")
            if (cmd != null && RestTimerStore.consumeNfcToken(context, cmd.id)) {
                return cmd
            }
        }
        return null
    }

    fun executeCommand(context: Context, command: NfcCommand) {
        when (command.type) {
            "rest" -> RestTimerService.startRest(context, command.seconds ?: 90)
            "toggle" -> RestTimerService.togglePause(context)
        }
    }

    fun tagIdToHex(tag: Tag?): String {
        val bytes = tag?.id ?: return ""
        return bytes.joinToString("") { "%02X".format(it) }
    }

    /**
     * Modo lector seguro (SOLO LECTURA de UID o NDEF).
     * Cumple la restricción crítica: jamás escribe en tarjetas de acceso al gimnasio.
     */
    fun enableSafeReaderMode(activity: Activity, onTagRead: (uidHex: String, ndefUrl: String?) -> Unit) {
        val adapter = NfcAdapter.getDefaultAdapter(activity) ?: return
        val flags = NfcAdapter.FLAG_READER_NFC_A or
            NfcAdapter.FLAG_READER_NFC_B or
            NfcAdapter.FLAG_READER_NFC_F or
            NfcAdapter.FLAG_READER_NFC_V
        adapter.enableReaderMode(activity, { tag ->
            val uidHex = tagIdToHex(tag)
            var url: String? = null
            try {
                val ndef = Ndef.get(tag)
                val cached = ndef?.cachedNdefMessage
                val record = cached?.records?.firstOrNull()
                url = record?.toUri()?.toString()
            } catch (_: Exception) {
            }
            activity.runOnUiThread {
                onTagRead(uidHex, url)
            }
        }, flags, null)
    }

    fun disableReaderMode(activity: Activity) {
        val adapter = NfcAdapter.getDefaultAdapter(activity) ?: return
        adapter.disableReaderMode(activity)
    }

    /**
     * Escribe exclusivamente una etiqueta NTAG propia con la URL del contrato NFC.
     */
    fun writeContractUrlToNtag(tag: Tag, url: String): Result<String> {
        val uriRecord = NdefRecord.createUri(url)
        val message = NdefMessage(arrayOf(uriRecord))

        val ndef = Ndef.get(tag)
        if (ndef != null) {
            return try {
                ndef.connect()
                if (!ndef.isWritable) {
                    ndef.close()
                    Result.failure(Exception("La etiqueta es de solo lectura."))
                } else if (ndef.maxSize < message.byteArrayLength) {
                    ndef.close()
                    Result.failure(Exception("Capacidad insuficiente en la etiqueta NFC."))
                } else {
                    ndef.writeNdefMessage(message)
                    ndef.close()
                    Result.success("Etiqueta grabada: $url")
                }
            } catch (e: Exception) {
                Result.failure(Exception("Error al grabar NTAG: ${e.localizedMessage ?: "I/O"}"))
            }
        }

        val formatable = NdefFormatable.get(tag)
        if (formatable != null) {
            return try {
                formatable.connect()
                formatable.format(message)
                formatable.close()
                Result.success("Etiqueta formateada y grabada: $url")
            } catch (e: Exception) {
                Result.failure(Exception("Error al formatear NTAG: ${e.localizedMessage ?: "I/O"}"))
            }
        }
        return Result.failure(Exception("Etiqueta no compatible con NDEF (no se toca por seguridad)."))
    }
}
