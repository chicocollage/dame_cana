package com.example.focusguard

import android.nfc.NdefMessage
import android.nfc.NdefRecord
import android.nfc.Tag
import android.nfc.tech.Ndef
import android.nfc.tech.NdefFormatable

object NfcWriter {
    /**
     * Escribe un registro AAR (Android Application Record) en la pegatina NFC.
     * Esto hace que cualquier teléfono Android que escanee la pegatina abra FocusGuard automáticamente.
     */
    fun writeAppLaunchRecord(tag: Tag, packageName: String): Result<String> {
        val mimeRecord = NdefRecord.createMime("application/vnd.com.example.focusguard", "quemar".toByteArray(Charsets.UTF_8))
        val aarRecord = NdefRecord.createApplicationRecord(packageName)
        val message = NdefMessage(arrayOf(mimeRecord, aarRecord))
        
        val ndef = Ndef.get(tag)
        if (ndef != null) {
            return try {
                ndef.connect()
                if (!ndef.isWritable) {
                    ndef.close()
                    Result.failure(Exception("La etiqueta está bloqueada contra escritura."))
                } else if (ndef.maxSize < message.byteArrayLength) {
                    ndef.close()
                    Result.failure(Exception("Memoria insuficiente en el chip NFC."))
                } else {
                    ndef.writeNdefMessage(message)
                    ndef.close()
                    Result.success("¡Auto-arranque grabado con éxito!")
                }
            } catch (e: Exception) {
                val detail = e.localizedMessage ?: "Error de I/O"
                Result.failure(Exception("Error al escribir en el tag: " + detail))
            }
        }
        
        val formatable = NdefFormatable.get(tag)
        if (formatable != null) {
            return try {
                formatable.connect()
                formatable.format(message)
                formatable.close()
                Result.success("¡Etiqueta formateada y auto-arranque grabado!")
            } catch (e: Exception) {
                val detail = e.localizedMessage ?: "Error de I/O"
                Result.failure(Exception("Error al formatear tag: " + detail))
            }
        }
        
        return Result.failure(Exception("Esta tarjeta no admite el estándar NDEF (probablemente sea de solo lectura)."))
    }
}
