package com.damecana.app.system

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        when (intent?.action) {
            ACTION_REST_ALARM_EXPIRED -> {
                val serviceIntent = Intent(context, RestTimerService::class.java).apply {
                    action = RestTimerService.ACTION_TRIGGER_ALARM
                }
                ContextCompat.startForegroundService(context, serviceIntent)
            }
            Intent.ACTION_BOOT_COMPLETED -> {
                val state = RestTimerStore.load(context)
                val now = System.currentTimeMillis()
                if (state.endsAt > now) {
                    AlarmScheduler.scheduleExact(context, state.endsAt)
                    val serviceIntent = Intent(context, RestTimerService::class.java).apply {
                        action = RestTimerService.ACTION_SYNC_FROM_STORE
                    }
                    ContextCompat.startForegroundService(context, serviceIntent)
                }
            }
        }
    }

    companion object {
        const val ACTION_REST_ALARM_EXPIRED = "com.damecana.app.ACTION_REST_ALARM_EXPIRED"
    }
}
