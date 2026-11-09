package com.damecana.app.system

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.ToneGenerator
import android.net.Uri
import com.damecana.app.data.TrainingRepository
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.IBinder
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.damecana.app.MainActivity
import com.damecana.app.domain.RestTimerTools
import com.damecana.app.domain.TimerStateInput
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlin.math.ceil

class RestTimerService : Service() {

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private var tickerJob: Job? = null
    private var mediaPlayer: MediaPlayer? = null
    private var vibrator: Vibrator? = null
    private var toneGenerator: ToneGenerator? = null
    private var toneJob: Job? = null
    private var alarmAutoOffJob: Job? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        ensureChannels()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val now = System.currentTimeMillis()
        val current = RestTimerStore.load(this)

        when (intent?.action) {
            ACTION_START -> {
                stopSoundAndVibration()
                val seconds = intent.getIntExtra(EXTRA_SECONDS, current.selectedSeconds.toInt().coerceAtLeast(10))
                val endsAt = now + seconds * 1000L
                val next = TimerStateInput(
                    selectedSeconds = seconds.toDouble(),
                    endsAt = endsAt,
                    remaining = 0.0,
                    total = seconds.toDouble(),
                    complete = false
                )
                RestTimerStore.save(this, next)
                AlarmScheduler.scheduleExact(this, endsAt)
                promoteForeground(buildCountdownNotification(next, now))
                startTicker()
            }
            ACTION_TOGGLE_PAUSE -> {
                stopSoundAndVibration()
                if (current.endsAt > now) {
                    val pausedRem = RestTimerTools.pausedSeconds(current.endsAt, now).toDouble()
                    AlarmScheduler.cancel(this)
                    val next = current.copy(endsAt = 0L, remaining = pausedRem, complete = false)
                    RestTimerStore.save(this, next)
                    promoteForeground(buildCountdownNotification(next, now))
                    stopTicker()
                } else {
                    val resumeSeconds = if (current.remaining > 0.0) current.remaining else current.selectedSeconds
                    val endsAt = now + (resumeSeconds * 1000.0).toLong()
                    val next = current.copy(
                        endsAt = endsAt,
                        remaining = 0.0,
                        total = if (current.total > 0.0) current.total else resumeSeconds,
                        complete = false
                    )
                    RestTimerStore.save(this, next)
                    AlarmScheduler.scheduleExact(this, endsAt)
                    promoteForeground(buildCountdownNotification(next, now))
                    startTicker()
                }
            }
            ACTION_ADJUST -> {
                stopSoundAndVibration()
                val delta = intent.getIntExtra(EXTRA_DELTA_SECONDS, 0).toDouble()
                val adjusted = RestTimerTools.adjust(current, delta, now)
                if (adjusted.reachedZero) {
                    AlarmScheduler.cancel(this)
                    triggerCompletedState()
                } else {
                    val next = current.copy(
                        endsAt = adjusted.endsAt,
                        remaining = adjusted.remaining,
                        total = adjusted.total,
                        complete = false
                    )
                    RestTimerStore.save(this, next)
                    if (next.endsAt > 0L) {
                        AlarmScheduler.scheduleExact(this, next.endsAt)
                        promoteForeground(buildCountdownNotification(next, now))
                        startTicker()
                    } else {
                        AlarmScheduler.cancel(this)
                        promoteForeground(buildCountdownNotification(next, now))
                        stopTicker()
                    }
                }
            }
            ACTION_TRIGGER_ALARM -> {
                triggerCompletedState()
            }
            ACTION_PREVIEW_ALARM -> {
                startSoundAndVibration(previewDurationSeconds = 2)
            }
            ACTION_STOP_RESET -> {
                stopSoundAndVibration()
                stopTicker()
                AlarmScheduler.cancel(this)
                val next = TimerStateInput(
                    selectedSeconds = current.selectedSeconds,
                    endsAt = 0L,
                    remaining = 0.0,
                    total = current.selectedSeconds,
                    complete = false
                )
                RestTimerStore.save(this, next)
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
                return START_NOT_STICKY
            }
            ACTION_SYNC_FROM_STORE -> {
                if (current.endsAt > now) {
                    promoteForeground(buildCountdownNotification(current, now))
                    startTicker()
                } else {
                    stopSelf()
                }
            }
        }
        return START_STICKY
    }

    private fun startTicker() {
        tickerJob?.cancel()
        tickerJob = serviceScope.launch {
            while (isActive) {
                val now = System.currentTimeMillis()
                val state = RestTimerStore.load(this@RestTimerService)
                if (state.endsAt <= 0L) break
                if (state.endsAt <= now) {
                    triggerCompletedState()
                    break
                }
                val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                nm.notify(NOTIFICATION_ID, buildCountdownNotification(state, now))
                delay(500L)
            }
        }
    }

    private fun stopTicker() {
        tickerJob?.cancel()
        tickerJob = null
    }

    private fun triggerCompletedState() {
        stopTicker()
        val current = RestTimerStore.load(this)
        val completed = current.copy(endsAt = 0L, remaining = 0.0, complete = true)
        RestTimerStore.save(this, completed)
        promoteForeground(buildAlarmFiredNotification())
        startSoundAndVibration()
    }

    private fun promoteForeground(notification: Notification) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun buildCountdownNotification(state: TimerStateInput, now: Long): Notification {
        val snap = RestTimerTools.snapshot(state, now)
        val remSec = ceil(snap.remaining).toInt()
        val mins = remSec / 60
        val secs = remSec % 60
        val formatted = String.format("%02d:%02d", mins, secs)
        val isPaused = snap.status == "paused"

        val openAppIntent = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_COUNTDOWN)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(if (isPaused) "Descanso en pausa · $formatted" else "Descanso activo · $formatted")
            .setContentText("Etapa: ${snap.stage.uppercase()} · Total ${snap.total.toInt()}s")
            .setContentIntent(openAppIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setProgress(snap.total.toInt().coerceAtLeast(1), remSec, false)
            .addAction(0, "-15s", servicePendingIntent(ACTION_ADJUST, 10, EXTRA_DELTA_SECONDS to -15))
            .addAction(0, if (isPaused) "Reanudar" else "Pausa", servicePendingIntent(ACTION_TOGGLE_PAUSE, 11))
            .addAction(0, "+15s", servicePendingIntent(ACTION_ADJUST, 12, EXTRA_DELTA_SECONDS to 15))
            .addAction(0, "Parar", servicePendingIntent(ACTION_STOP_RESET, 13))
            .build()
    }

    private fun buildAlarmFiredNotification(): Notification {
        val openAppIntent = PendingIntent.getActivity(
            this, 1, Intent(this, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ALARM)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("¡Descanso completado! — Dame Caña")
            .setContentText("Hora de atacar la siguiente serie.")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setFullScreenIntent(openAppIntent, true)
            .setOngoing(true)
            .addAction(0, "Apagar alarma", servicePendingIntent(ACTION_STOP_RESET, 20))
            .addAction(0, "+30s extra", servicePendingIntent(ACTION_START, 21, EXTRA_SECONDS to 30))
            .build()
    }

    private fun servicePendingIntent(actionName: String, reqCode: Int, extra: Pair<String, Int>? = null): PendingIntent {
        val intent = Intent(this, RestTimerService::class.java).apply {
            action = actionName
            if (extra != null) putExtra(extra.first, extra.second)
        }
        return PendingIntent.getService(
            this, reqCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun startSoundAndVibration(previewDurationSeconds: Int? = null) {
        stopSoundAndVibration()
        val settings = TrainingRepository.settings.value
        val soundMode = settings.alarmSoundMode
        val durationSec = previewDurationSeconds ?: settings.alarmDurationSeconds

        // 1. Vibracion
        if (settings.vibrationEnabled) {
            try {
                vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    val vm = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                    vm.defaultVibrator
                } else {
                    @Suppress("DEPRECATION")
                    getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
                }
                val pattern = longArrayOf(0L, 400L, 200L, 400L, 200L, 600L)
                val repeatIndex = if (durationSec == 0) 0 else -1
                vibrator?.vibrate(VibrationEffect.createWaveform(pattern, repeatIndex))
            } catch (_: Exception) {}
        }

        // 2. Audio segun modo
        when (soundMode) {
            "BEEP_BRAUN" -> {
                try {
                    toneGenerator = ToneGenerator(AudioManager.STREAM_ALARM, 95)
                    toneJob = serviceScope.launch {
                        while (isActive) {
                            try {
                                toneGenerator?.startTone(ToneGenerator.TONE_PROP_BEEP2, 140)
                                delay(180L)
                                toneGenerator?.startTone(ToneGenerator.TONE_PROP_BEEP2, 140)
                                delay(500L)
                            } catch (_: Exception) {
                                break
                            }
                        }
                    }
                } catch (_: Exception) {}
            }
            "NOTIFICATION" -> {
                try {
                    val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                    mediaPlayer = MediaPlayer().apply {
                        setDataSource(this@RestTimerService, uri)
                        setAudioAttributes(
                            AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                                .build()
                        )
                        isLooping = (durationSec == 0)
                        prepare()
                        start()
                    }
                } catch (_: Exception) {}
            }
            "SYSTEM_ALARM" -> {
                try {
                    val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                        ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                    mediaPlayer = MediaPlayer().apply {
                        setDataSource(this@RestTimerService, uri)
                        setAudioAttributes(
                            AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_ALARM)
                                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                                .build()
                        )
                        isLooping = true
                        prepare()
                        start()
                    }
                } catch (_: Exception) {}
            }
            "CUSTOM_URI" -> {
                try {
                    val uri = if (settings.customRingtoneUri.isNotBlank()) {
                        Uri.parse(settings.customRingtoneUri)
                    } else {
                        RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                    }
                    mediaPlayer = MediaPlayer().apply {
                        setDataSource(this@RestTimerService, uri)
                        setAudioAttributes(
                            AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_ALARM)
                                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                                .build()
                        )
                        isLooping = true
                        prepare()
                        start()
                    }
                } catch (_: Exception) {}
            }
            "VIBRATE_ONLY" -> {}
        }

        // 3. Auto-apagado programado
        if (durationSec > 0) {
            alarmAutoOffJob = serviceScope.launch {
                delay(durationSec * 1000L)
                stopSoundAndVibration()
            }
        }
    }

    private fun stopSoundAndVibration() {
        alarmAutoOffJob?.cancel()
        alarmAutoOffJob = null
        toneJob?.cancel()
        toneJob = null
        try {
            toneGenerator?.release()
        } catch (_: Exception) {}
        toneGenerator = null

        try {
            mediaPlayer?.let {
                if (it.isPlaying) it.stop()
                it.release()
            }
        } catch (_: Exception) {}
        mediaPlayer = null

        try {
            vibrator?.cancel()
        } catch (_: Exception) {}
    }

    private fun ensureChannels() {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val countdownChannel = NotificationChannel(
            CHANNEL_COUNTDOWN,
            "Temporizador de Descanso",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Cuenta atrás en vivo durante el descanso entre series"
        }
        val alarmChannel = NotificationChannel(
            CHANNEL_ALARM,
            "Alarma de Fin de Descanso",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Alarma exacta al terminar el descanso"
            setSound(null, null)
        }
        nm.createNotificationChannel(countdownChannel)
        nm.createNotificationChannel(alarmChannel)
    }

    override fun onDestroy() {
        stopTicker()
        stopSoundAndVibration()
        serviceScope.cancel()
        super.onDestroy()
    }

    companion object {
        const val CHANNEL_COUNTDOWN = "damecana_rest_countdown_v1"
        const val CHANNEL_ALARM = "damecana_rest_alarm_v1"
        const val NOTIFICATION_ID = 2001

        const val ACTION_START = "com.damecana.app.timer.START"
        const val ACTION_TOGGLE_PAUSE = "com.damecana.app.timer.TOGGLE_PAUSE"
        const val ACTION_ADJUST = "com.damecana.app.timer.ADJUST"
        const val ACTION_STOP_RESET = "com.damecana.app.timer.STOP_RESET"
        const val ACTION_TRIGGER_ALARM = "com.damecana.app.timer.TRIGGER_ALARM"
        const val ACTION_SYNC_FROM_STORE = "com.damecana.app.timer.SYNC_FROM_STORE"
        const val ACTION_PREVIEW_ALARM = "com.damecana.app.timer.PREVIEW_ALARM"

        const val EXTRA_SECONDS = "extra_seconds"
        const val EXTRA_DELTA_SECONDS = "extra_delta_seconds"

        fun startRest(context: Context, seconds: Int) {
            val intent = Intent(context, RestTimerService::class.java).apply {
                action = ACTION_START
                putExtra(EXTRA_SECONDS, seconds)
            }
            ContextCompat.startForegroundService(context, intent)
        }

        fun togglePause(context: Context) {
            val intent = Intent(context, RestTimerService::class.java).apply {
                action = ACTION_TOGGLE_PAUSE
            }
            ContextCompat.startForegroundService(context, intent)
        }

        fun adjust(context: Context, deltaSeconds: Int) {
            val intent = Intent(context, RestTimerService::class.java).apply {
                action = ACTION_ADJUST
                putExtra(EXTRA_DELTA_SECONDS, deltaSeconds)
            }
            ContextCompat.startForegroundService(context, intent)
        }

        fun stopAndReset(context: Context) {
            val intent = Intent(context, RestTimerService::class.java).apply {
                action = ACTION_STOP_RESET
            }
            context.startService(intent)
        }

        fun previewAlarm(context: Context) {
            val intent = Intent(context, RestTimerService::class.java).apply {
                action = ACTION_PREVIEW_ALARM
            }
            context.startService(intent)
        }
    }
}
