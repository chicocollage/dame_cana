package com.damecana.service

import android.app.Service
import android.content.Intent
import android.os.CountDownTimer
import android.os.IBinder
import android.util.Log

class RestTimerService : Service() {

    private var countDownTimer: CountDownTimer? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val seconds = intent?.getIntExtra("EXTRA_SECONDS", 120) ?: 120
        startTimer(seconds)
        
        // TODO: Mover el servicio a Foreground con Notification para que no lo mate el SO
        
        return START_NOT_STICKY
    }

    private fun startTimer(seconds: Int) {
        countDownTimer?.cancel()
        countDownTimer = object : CountDownTimer(seconds * 1000L, 1000L) {
            override fun onTick(millisUntilFinished: Long) {
                Log.d("RestTimer", "Restante: s")
                // Aquí emitiremos un broadcast o usaremos un Flow para actualizar la UI
            }

            override fun onFinish() {
                Log.d("RestTimer", "¡Tiempo de descanso terminado!")
                // Aquí haremos vibrar el móvil (Haptics)
                stopSelf()
            }
        }.start()
    }

    override fun onDestroy() {
        countDownTimer?.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
