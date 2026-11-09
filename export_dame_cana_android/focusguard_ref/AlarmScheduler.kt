package com.example.focusguard

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import java.util.Calendar

object AlarmScheduler {
    
    fun schedule(context: Context, timer: NfcTimer) {
        if (timer.type == TaskType.COUNTDOWN && timer.endTimeMs == null) return
        
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            putExtra("UID", timer.uid)
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context, timer.uid.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val triggerTimeMs = calculateNextTriggerTime(timer)

        try {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTimeMs, pendingIntent)
        } catch (e: SecurityException) {
            // Permission missing
        }
    }

    fun cancel(context: Context, timer: NfcTimer) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            putExtra("UID", timer.uid)
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context, timer.uid.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        alarmManager.cancel(pendingIntent)
    }
    
    private fun calculateNextTriggerTime(timer: NfcTimer): Long {
        if (timer.type == TaskType.COUNTDOWN) {
            return timer.endTimeMs ?: System.currentTimeMillis()
        }
        
        // ROUTINE logic
        val now = Calendar.getInstance()
        val scheduledTime = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, timer.routineHour)
            set(Calendar.MINUTE, timer.routineMinute)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        
        // Check if it was already completed today
        val lastCompleted = Calendar.getInstance().apply {
            timeInMillis = timer.lastCompletedMs
        }
        val completedToday = timer.lastCompletedMs > 0 &&
            now.get(Calendar.YEAR) == lastCompleted.get(Calendar.YEAR) &&
            now.get(Calendar.DAY_OF_YEAR) == lastCompleted.get(Calendar.DAY_OF_YEAR)

        if (completedToday) {
            // Already done today, schedule for tomorrow
            scheduledTime.add(Calendar.DAY_OF_YEAR, 1)
        } else if (now.after(scheduledTime)) {
            // Time has passed and not completed today! Trigger immediately.
            return now.timeInMillis + 1000 // 1 second from now
        }
        
        return scheduledTime.timeInMillis
    }
}
