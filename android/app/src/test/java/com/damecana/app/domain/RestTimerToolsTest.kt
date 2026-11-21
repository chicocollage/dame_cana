package com.damecana.app.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class RestTimerToolsTest {

    private val now = 1785664800000L // 2026-08-02T10:00:00.000Z

    @Test
    fun representsIdleRunningPausedAndCompleteStates() {
        assertEquals(
            TimerSnapshot(remaining = 120.0, total = 120.0, ratio = 1.0, status = "idle", stage = "full"),
            RestTimerTools.snapshot(TimerStateInput(selectedSeconds = 120.0), now)
        )

        val running = RestTimerTools.snapshot(
            TimerStateInput(selectedSeconds = 120.0, endsAt = now + 90_000L, total = 120.0),
            now
        )
        assertEquals(90.0, running.remaining, 0.0001)
        assertEquals("running", running.status)
        assertEquals(0.75, running.ratio, 0.0001)
        assertEquals("full", running.stage)

        val paused = RestTimerTools.snapshot(
            TimerStateInput(selectedSeconds = 120.0, remaining = 45.0, total = 120.0),
            now
        )
        assertEquals(45.0, paused.remaining, 0.0001)
        assertEquals("paused", paused.status)
        assertEquals(0.375, paused.ratio, 0.0001)
        assertEquals("middle", paused.stage)

        val complete = RestTimerTools.snapshot(
            TimerStateInput(selectedSeconds = 120.0, remaining = 45.0, total = 120.0, complete = true),
            now
        )
        assertEquals(0.0, complete.remaining, 0.0001)
        assertEquals("complete", complete.status)
        assertEquals(0.0, complete.ratio, 0.0001)
        assertEquals("ending", complete.stage)
    }

    @Test
    fun clampsRatioBetweenZeroAndOneAndAppliesStageThresholds() {
        val over = RestTimerTools.snapshot(TimerStateInput(endsAt = now + 200_000L, total = 100.0), now)
        assertEquals(1.0, over.ratio, 0.0001)
        assertEquals("full", over.stage)

        val elapsed = RestTimerTools.snapshot(TimerStateInput(endsAt = now - 1_000L, total = 100.0), now)
        assertEquals(0.0, elapsed.remaining, 0.0001)
        assertEquals(0.0, elapsed.ratio, 0.0001)
        assertEquals("running", elapsed.status)
        assertEquals("ending", elapsed.stage)

        assertEquals("full", RestTimerTools.snapshot(TimerStateInput(remaining = 51.0, total = 100.0), now).stage)
        assertEquals("middle", RestTimerTools.snapshot(TimerStateInput(remaining = 50.0, total = 100.0), now).stage)
        assertEquals("middle", RestTimerTools.snapshot(TimerStateInput(remaining = 21.0, total = 100.0), now).stage)
        assertEquals("ending", RestTimerTools.snapshot(TimerStateInput(remaining = 20.0, total = 100.0), now).stage)
    }

    @Test
    fun pausedSecondsRoundsUpAndReturnsZeroWhenExpired() {
        assertEquals(11, RestTimerTools.pausedSeconds(now + 10_001L, now))
        assertEquals(10, RestTimerTools.pausedSeconds(now + 10_000L, now))
        assertEquals(0, RestTimerTools.pausedSeconds(now, now))
        assertEquals(0, RestTimerTools.pausedSeconds(now - 5_000L, now))
    }

    @Test
    fun extends30SecondsDuringRunningAndPause() {
        val extendedRunning = RestTimerTools.extend(
            TimerStateInput(selectedSeconds = 120.0, endsAt = now + 60_000L, remaining = 0.0, total = 120.0),
            30.0
        )
        assertEquals(TimerExtendResult(endsAt = now + 90_000L, remaining = 0.0, total = 150.0), extendedRunning)

        val snapRunning = RestTimerTools.snapshot(
            TimerStateInput(selectedSeconds = 120.0, endsAt = extendedRunning.endsAt, remaining = extendedRunning.remaining, total = extendedRunning.total),
            now
        )
        assertEquals("running", snapRunning.status)
        assertEquals(90.0, snapRunning.remaining, 0.0001)
        assertEquals(150.0, snapRunning.total, 0.0001)
        assertEquals(0.6, snapRunning.ratio, 0.0001)

        val extendedPaused = RestTimerTools.extend(
            TimerStateInput(selectedSeconds = 120.0, endsAt = 0L, remaining = 45.0, total = 120.0),
            30.0
        )
        assertEquals(TimerExtendResult(endsAt = 0L, remaining = 75.0, total = 150.0), extendedPaused)
    }

    @Test
    fun supportsSignedAdjustmentsAndClampsAtZero() {
        val reduced = RestTimerTools.adjust(
            TimerStateInput(selectedSeconds = 120.0, endsAt = now + 20_000L, total = 120.0),
            -15.0,
            now
        )
        assertEquals(
            TimerAdjustResult(endsAt = now + 5_000L, remaining = 0.0, total = 120.0, reachedZero = false),
            reduced
        )

        val completed = RestTimerTools.adjust(
            TimerStateInput(selectedSeconds = 120.0, endsAt = now + 10_000L, total = 120.0),
            -15.0,
            now
        )
        assertEquals(
            TimerAdjustResult(endsAt = 0L, remaining = 0.0, total = 120.0, reachedZero = true),
            completed
        )

        val expired = RestTimerTools.adjust(
            TimerStateInput(selectedSeconds = 120.0, endsAt = now - 1_000L, total = 120.0),
            -15.0,
            now
        )
        assertEquals(
            TimerAdjustResult(endsAt = 0L, remaining = 0.0, total = 120.0, reachedZero = true),
            expired
        )
    }

    @Test
    fun parsesNfcTriggersAndCommandsAccurately() {
        assertEquals(NfcTrigger(90, "abc"), RestTimerTools.parseNfcTrigger("?descanso=90&t=abc"))
        assertEquals(NfcTrigger(60, ""), RestTimerTools.parseNfcTrigger("descanso=60"))
        val badTriggers = listOf("", "?descanso=", "?descanso=abc", "?descanso=9", "?descanso=1801", "?descanso=-5", "?descanso=90.5", "?x=1", null)
        for (bad in badTriggers) {
            assertNull("Expected null for $bad", RestTimerTools.parseNfcTrigger(bad))
        }

        assertEquals(NfcCommand("rest", 90, "x"), RestTimerTools.parseNfcCommand("?descanso=90&t=x"))
        assertEquals(NfcCommand("toggle", null, ""), RestTimerTools.parseNfcCommand("?accion=pausa"))
        assertEquals(NfcCommand("toggle", null, "7"), RestTimerTools.parseNfcCommand("?accion=pausa&t=7"))
        val badCommands = listOf("", "?accion=borrar", "?accion=", "?descanso=5", null)
        for (bad in badCommands) {
            assertNull("Expected null for $bad", RestTimerTools.parseNfcCommand(bad))
        }
    }

    @Test
    fun buildsClockIntentsAndRejectsInvalidValues() {
        val setIntent = RestTimerTools.buildClockIntent("set", 90.0, "Descanso")
        assertTrue(setIntent.startsWith("intent://#Intent;action=android.intent.action.SET_TIMER;"))
        assertTrue(setIntent.contains(";i.android.intent.extra.alarm.LENGTH=90;"))
        assertTrue(setIntent.contains(";B.android.intent.extra.alarm.SKIP_UI=true;"))
        assertTrue(setIntent.endsWith(";end;"))
        assertTrue(RestTimerTools.buildClockIntent("set", 45.9).contains("LENGTH=45;"))
        assertTrue(RestTimerTools.buildClockIntent("set", 30.0, "a;b").endsWith("MESSAGE=a%3Bb;end;"))
        assertEquals(
            "intent://#Intent;action=android.intent.action.DISMISS_TIMER;end;",
            RestTimerTools.buildClockIntent("dismiss")
        )
        for (bad in listOf(0.0, -5.0, Double.NaN, 86401.0, null)) {
            assertEquals("", RestTimerTools.buildClockIntent("set", bad))
        }
        assertEquals("", RestTimerTools.buildClockIntent("otro", 60.0))
    }
}
