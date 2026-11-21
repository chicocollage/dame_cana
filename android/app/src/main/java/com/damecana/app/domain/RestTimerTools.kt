package com.damecana.app.domain

import java.net.URLDecoder
import java.net.URLEncoder
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min

data class TimerStateInput(
    val selectedSeconds: Double = 120.0,
    val endsAt: Long = 0L,
    val remaining: Double = 0.0,
    val total: Double = 0.0,
    val complete: Boolean = false
)

data class TimerSnapshot(
    val remaining: Double,
    val total: Double,
    val ratio: Double,
    val status: String,
    val stage: String
)

data class TimerAdjustResult(
    val endsAt: Long,
    val remaining: Double,
    val total: Double,
    val reachedZero: Boolean
)

data class TimerExtendResult(
    val endsAt: Long,
    val remaining: Double,
    val total: Double
)

data class NfcTrigger(
    val seconds: Int,
    val id: String
)

data class NfcCommand(
    val type: String,
    val seconds: Int? = null,
    val id: String = ""
)

object RestTimerTools {

    private fun finiteOrZero(value: Double?): Double {
        return if (value != null && value.isFinite()) value else 0.0
    }

    fun snapshot(state: TimerStateInput?, nowMs: Long = System.currentTimeMillis()): TimerSnapshot {
        val source = state ?: TimerStateInput()
        val now = if (nowMs > 0L) nowMs.toDouble() else System.currentTimeMillis().toDouble()
        val sSel = finiteOrZero(source.selectedSeconds)
        val selected = max(1.0, if (sSel == 0.0) 120.0 else sSel)
        val endsAt = max(0L, source.endsAt)
        val paused = max(0.0, finiteOrZero(source.remaining))
        val complete = source.complete

        val remaining = when {
            complete -> 0.0
            endsAt > 0L -> max(0.0, (endsAt.toDouble() - now) / 1000.0)
            paused > 0.0 -> paused
            else -> selected
        }

        val sTot = finiteOrZero(source.total)
        val total = max(1.0, if (sTot == 0.0) selected else sTot)
        val ratio = max(0.0, min(1.0, remaining / total))
        val status = when {
            complete -> "complete"
            endsAt > 0L -> "running"
            paused > 0.0 -> "paused"
            else -> "idle"
        }
        val stage = when {
            ratio <= 0.2 -> "ending"
            ratio <= 0.5 -> "middle"
            else -> "full"
        }
        return TimerSnapshot(
            remaining = remaining,
            total = total,
            ratio = ratio,
            status = status,
            stage = stage
        )
    }

    fun pausedSeconds(endsAt: Long, nowMs: Long = System.currentTimeMillis()): Int {
        val now = if (nowMs > 0L) nowMs else System.currentTimeMillis()
        val diffSeconds = ceil((endsAt.toDouble() - now.toDouble()) / 1000.0).toInt()
        return max(0, diffSeconds)
    }

    fun adjust(state: TimerStateInput?, deltaSeconds: Double, nowMs: Long = System.currentTimeMillis()): TimerAdjustResult {
        val source = state ?: TimerStateInput()
        val delta = finiteOrZero(deltaSeconds)
        val now = if (nowMs > 0L) nowMs else System.currentTimeMillis()
        val endsAt = max(0L, source.endsAt)
        val remaining = max(0.0, finiteOrZero(source.remaining))
        val sSel = finiteOrZero(source.selectedSeconds)
        val selected = max(1.0, if (sSel == 0.0) 120.0 else sSel)

        val currentRemaining = if (endsAt > 0L) {
            max(0.0, (endsAt.toDouble() - now.toDouble()) / 1000.0)
        } else {
            remaining
        }
        val nextRemaining = max(0.0, currentRemaining + delta)
        val positiveDelta = max(0.0, delta)
        val hadActiveTimer = endsAt > 0L || remaining > 0.0
        val sTot = finiteOrZero(source.total)
        val baseTotal = max(1.0, if (sTot == 0.0) selected else sTot)

        return TimerAdjustResult(
            endsAt = if (endsAt > 0L && nextRemaining > 0.0) (now + (nextRemaining * 1000.0).toLong()) else 0L,
            remaining = if (endsAt > 0L) 0.0 else nextRemaining,
            total = baseTotal + positiveDelta,
            reachedZero = hadActiveTimer && nextRemaining == 0.0
        )
    }

    fun extend(state: TimerStateInput?, secondsValue: Double): TimerExtendResult {
        val source = state ?: TimerStateInput()
        val seconds = finiteOrZero(secondsValue)
        val endsAt = max(0L, source.endsAt)
        val remaining = max(0.0, finiteOrZero(source.remaining))
        val sSel = finiteOrZero(source.selectedSeconds)
        val selected = max(1.0, if (sSel == 0.0) 120.0 else sSel)
        val sTot = finiteOrZero(source.total)
        val baseTotal = max(1.0, if (sTot == 0.0) selected else sTot)

        return TimerExtendResult(
            endsAt = if (endsAt > 0L) max(0L, endsAt + (seconds * 1000.0).toLong()) else 0L,
            remaining = if (endsAt > 0L) remaining else max(0.0, remaining + seconds),
            total = baseTotal + max(0.0, seconds)
        )
    }

    private fun parseQueryParams(search: String?): Map<String, String> {
        val query = (search ?: "").removePrefix("?")
        val params = mutableMapOf<String, String>()
        for (pair in query.split("&")) {
            val index = pair.indexOf('=')
            if (index < 1) continue
            try {
                val key = URLDecoder.decode(pair.substring(0, index), "UTF-8")
                val value = URLDecoder.decode(pair.substring(index + 1), "UTF-8")
                params[key] = value
            } catch (_: Exception) {
                // ignora pares mal codificados
            }
        }
        return params
    }

    fun parseNfcTrigger(search: String?): NfcTrigger? {
        if (search.isNullOrEmpty()) return null
        val params = parseQueryParams(search)
        val raw = params["descanso"]?.trim() ?: return null
        if (!Regex("^\\d{1,4}$").matches(raw)) return null
        val seconds = raw.toIntOrNull() ?: return null
        if (seconds < 10 || seconds > 1800) return null
        return NfcTrigger(seconds = seconds, id = params["t"] ?: "")
    }

    fun parseNfcCommand(search: String?): NfcCommand? {
        if (search.isNullOrEmpty()) return null
        val rest = parseNfcTrigger(search)
        if (rest != null) {
            return NfcCommand(type = "rest", seconds = rest.seconds, id = rest.id)
        }
        val params = parseQueryParams(search)
        if (params["accion"] == "pausa") {
            return NfcCommand(type = "toggle", seconds = null, id = params["t"] ?: "")
        }
        return null
    }

    fun buildClockIntent(kind: String, secondsValue: Double? = null, label: String? = null): String {
        if (kind == "dismiss") {
            return "intent://#Intent;action=android.intent.action.DISMISS_TIMER;end;"
        }
        val seconds = floor(finiteOrZero(secondsValue)).toInt()
        if (kind != "set" || seconds < 1 || seconds > 86400) return ""
        val rawLabel = if (label.isNullOrEmpty()) "Descanso" else label
        val encoded = URLEncoder.encode(rawLabel, "UTF-8")
            .replace("+", "%20")
            .replace(";", "%3B")
        return "intent://#Intent;action=android.intent.action.SET_TIMER;i.android.intent.extra.alarm.LENGTH=$seconds;B.android.intent.extra.alarm.SKIP_UI=true;S.android.intent.extra.alarm.MESSAGE=$encoded;end;"
    }
}
