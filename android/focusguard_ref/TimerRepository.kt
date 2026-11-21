package com.example.focusguard

import android.content.Context
import android.content.SharedPreferences
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

enum class TaskType {
    COUNTDOWN,
    ROUTINE,
    SNOOZE
}

@Serializable
data class NfcTimer(
    val uid: String,
    val name: String,
    val type: TaskType = TaskType.COUNTDOWN,
    
    // Para COUNTDOWN / FUEGO
    val durationMs: Long = 0,
    val endTimeMs: Long? = null,
    
    // Para ROUTINE (conservado en segundo plano)
    val routineHour: Int = 0,
    val routineMinute: Int = 0,
    val lastCompletedMs: Long = 0,

    // Vinculación opcional a una pegatina NFC física
    val linkedNfcUid: String? = null
)

@Serializable
data class SafeState(
    val timestampMs: Long,
    val timerName: String
)

@Serializable
data class AppSettings(
    val alarmToneUri: String? = null,
    val forceMaxVolume: Boolean = true
)

class TimerRepository(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("focusguard_timers", Context.MODE_PRIVATE)
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }
    
    fun getSettings(): AppSettings {
        val jsonStr = prefs.getString("app_settings", null) ?: return AppSettings()
        return try {
            json.decodeFromString<AppSettings>(jsonStr)
        } catch (e: Exception) {
            AppSettings()
        }
    }

    fun saveSettings(settings: AppSettings) {
        prefs.edit().putString("app_settings", json.encodeToString(settings)).apply()
    }

    fun getTimers(): List<NfcTimer> {
        val jsonString = prefs.getString("timers_list", null)
        val list = try {
            if (jsonString != null) json.decodeFromString<List<NfcTimer>>(jsonString) else emptyList()
        } catch (e: Exception) {
            emptyList()
        }

        // Limpieza estricta: borrar CUALQUIER temporizador de la versión vieja 
        // Solo nos quedamos con los que tienen el prefijo oficial de esta fase (fuego_, snooze_)
        val cleanedList = list.filter { 
            it.uid.startsWith("fuego_") || it.uid.startsWith("snooze_")
        }.toMutableList()

        // Garantizar que los 5 preestablecidos de la cocina existan
        val defaults = getInitialKitchenPresets()
        var changed = false

        for (defaultTimer in defaults) {
            if (cleanedList.none { it.uid == defaultTimer.uid }) {
                cleanedList.add(defaultTimer)
                changed = true
            }
        }

        // Si hemos limpiado basura o inyectado preestablecidos, guardamos
        if (changed || cleanedList.size != list.size) {
            saveTimers(cleanedList)
        }

        return cleanedList
    }
    
    fun saveTimers(timers: List<NfcTimer>) {
        val jsonString = json.encodeToString(timers)
        prefs.edit().putString("timers_list", jsonString).apply()
    }
    
    fun getTimerByUid(uid: String): NfcTimer? {
        return getTimers().find { it.uid == uid }
    }

    fun getTimerByUidOrLinkedTag(rawUid: String): NfcTimer? {
        return getTimers().find { it.uid == rawUid || it.linkedNfcUid == rawUid }
    }
    
    fun updateTimer(timer: NfcTimer) {
        val timers = getTimers().toMutableList()
        val index = timers.indexOfFirst { it.uid == timer.uid }
        if (index != -1) {
            timers[index] = timer
        } else {
            timers.add(timer)
        }
        saveTimers(timers)
    }

    fun deleteTimer(uid: String) {
        val timers = getTimers().toMutableList()
        timers.removeAll { it.uid == uid }
        saveTimers(timers)
    }

    fun getLastSafeState(): SafeState? {
        val jsonString = prefs.getString("last_safe_state", null) ?: return null
        return try {
            json.decodeFromString(jsonString)
        } catch (e: Exception) {
            null
        }
    }
    
    fun setLastSafeState(state: SafeState) {
        val jsonString = json.encodeToString(state)
        prefs.edit().putString("last_safe_state", jsonString).apply()
    }

    private fun getInitialKitchenPresets(): List<NfcTimer> {
        return listOf(
            NfcTimer(
                uid = "fuego_3m",
                name = "3 Min (Huevos / Té)",
                type = TaskType.COUNTDOWN,
                durationMs = 3 * 60 * 1000L
            ),
            NfcTimer(
                uid = "fuego_5m",
                name = "5 Min (Fideos / Verdura)",
                type = TaskType.COUNTDOWN,
                durationMs = 5 * 60 * 1000L
            ),
            NfcTimer(
                uid = "fuego_10m",
                name = "10 Min (Pasta / Arroz)",
                type = TaskType.COUNTDOWN,
                durationMs = 10 * 60 * 1000L
            ),
            NfcTimer(
                uid = "fuego_12m",
                name = "12 Min (Guiso / Caldoso)",
                type = TaskType.COUNTDOWN,
                durationMs = 12 * 60 * 1000L
            ),
            NfcTimer(
                uid = "fuego_15m",
                name = "15 Min (Horno / Fuego Lento)",
                type = TaskType.COUNTDOWN,
                durationMs = 15 * 60 * 1000L
            ),
            NfcTimer(
                uid = "snooze_global",
                name = "Remover (+1 Min)",
                type = TaskType.SNOOZE
            )
        )
    }
}
