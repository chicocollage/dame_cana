package com.example.focusguard


import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            Log.d("FocusGuard", "Boot completed. Reprogramando alarmas activas...")
            
            val repo = TimerRepository(context)
            val allTimers = repo.getTimers()
            
            for (timer in allTimers) {
                if (timer.type == TaskType.COUNTDOWN && timer.endTimeMs != null) {
                    AlarmScheduler.schedule(context, timer)
                } else if (timer.type == TaskType.ROUTINE) {
                    AlarmScheduler.schedule(context, timer)
                }
            }
        }
    }
}
