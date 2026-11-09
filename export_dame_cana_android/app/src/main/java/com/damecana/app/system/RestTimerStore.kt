package com.damecana.app.system

import android.content.Context
import com.damecana.app.domain.TimerStateInput
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONObject

object RestTimerStore {
    private const val PREFS_NAME = "dame_cana_rest_timer_v1"
    private const val KEY_SELECTED_SECONDS = "selected_seconds"
    private const val KEY_ENDS_AT = "ends_at"
    private const val KEY_REMAINING = "remaining"
    private const val KEY_TOTAL = "total"
    private const val KEY_COMPLETE = "complete"
    private const val KEY_LAST_NFC_TOKEN = "last_nfc_token"
    private const val KEY_LEARNED_TAGS = "nfc_learned_tags"

    private val _stateFlow = MutableStateFlow(TimerStateInput())
    val stateFlow: StateFlow<TimerStateInput> = _stateFlow.asStateFlow()

    fun load(context: Context): TimerStateInput {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val state = TimerStateInput(
            selectedSeconds = prefs.getFloat(KEY_SELECTED_SECONDS, 120f).toDouble(),
            endsAt = prefs.getLong(KEY_ENDS_AT, 0L),
            remaining = prefs.getFloat(KEY_REMAINING, 0f).toDouble(),
            total = prefs.getFloat(KEY_TOTAL, 120f).toDouble(),
            complete = prefs.getBoolean(KEY_COMPLETE, false)
        )
        _stateFlow.value = state
        return state
    }

    fun save(context: Context, state: TimerStateInput) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit()
            .putFloat(KEY_SELECTED_SECONDS, state.selectedSeconds.toFloat())
            .putLong(KEY_ENDS_AT, state.endsAt)
            .putFloat(KEY_REMAINING, state.remaining.toFloat())
            .putFloat(KEY_TOTAL, state.total.toFloat())
            .putBoolean(KEY_COMPLETE, state.complete)
            .apply()
        _stateFlow.value = state
    }

    fun consumeNfcToken(context: Context, token: String): Boolean {
        if (token.isEmpty()) return true
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val last = prefs.getString(KEY_LAST_NFC_TOKEN, "") ?: ""
        if (last == token) return false
        prefs.edit().putString(KEY_LAST_NFC_TOKEN, token).apply()
        return true
    }

    fun getLearnedTags(context: Context): Map<String, String> {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val raw = prefs.getString(KEY_LEARNED_TAGS, "{}") ?: "{}"
        val result = mutableMapOf<String, String>()
        return try {
            val json = JSONObject(raw)
            val keys = json.keys()
            while (keys.hasNext()) {
                val k = keys.next()
                result[k] = json.optString(k, "")
            }
            result
        } catch (_: Exception) {
            emptyMap()
        }
    }

    fun saveLearnedTag(context: Context, uidHex: String, queryCommand: String) {
        if (uidHex.isBlank()) return
        val current = getLearnedTags(context).toMutableMap()
        current[uidHex.uppercase()] = queryCommand
        val json = JSONObject()
        for ((k, v) in current) json.put(k, v)
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_LEARNED_TAGS, json.toString())
            .apply()
    }

    fun clearLearnedTags(context: Context) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .remove(KEY_LEARNED_TAGS)
            .apply()
    }
}
