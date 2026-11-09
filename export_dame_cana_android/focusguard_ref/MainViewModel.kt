package com.example.focusguard

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class MainViewModel(application: Application) : AndroidViewModel(application) {
    private val repo = TimerRepository(application)
    
    private val _timers = MutableStateFlow<List<NfcTimer>>(emptyList())
    val timers: StateFlow<List<NfcTimer>> = _timers.asStateFlow()
    
    private val _safeState = MutableStateFlow<SafeState?>(null)
    val safeState: StateFlow<SafeState?> = _safeState.asStateFlow()
    
    private val _pairingUid = MutableStateFlow<String?>(null)
    val pairingUid: StateFlow<String?> = _pairingUid.asStateFlow()

    private val _isScanningForNew = MutableStateFlow(false)
    val isScanningForNew: StateFlow<Boolean> = _isScanningForNew.asStateFlow()

    private val _appSettings = MutableStateFlow(AppSettings())
    val appSettings: StateFlow<AppSettings> = _appSettings.asStateFlow()

    init {
        refreshData()
    }
    
    fun setScanningForNew(scanning: Boolean) {
        _isScanningForNew.value = scanning
    }

    fun updateSettings(settings: AppSettings) {
        repo.saveSettings(settings)
        _appSettings.value = settings
    }

    fun refreshData() {
        _timers.value = repo.getTimers()
        _safeState.value = repo.getLastSafeState()
        _appSettings.value = repo.getSettings()
    }

    fun onNfcScanned(hexUid: String): Boolean {
        val timer = repo.getTimerByUidOrLinkedTag(hexUid)
        return if (timer != null) {
            if (_isScanningForNew.value) {
                _pairingUid.value = timer.uid
                _isScanningForNew.value = false
                false
            } else {
                true
            }
        } else {
            _pairingUid.value = hexUid
            _isScanningForNew.value = false
            false
        }
    }
    
    fun getTimer(uidOrTag: String): NfcTimer? = repo.getTimerByUidOrLinkedTag(uidOrTag)
    
    fun deleteTimer(uid: String) {
        repo.deleteTimer(uid)
        refreshData()
    }
    
    fun setPairingUid(uid: String) {
        _pairingUid.value = uid
    }
    
    fun linkTagToTimer(timerUid: String, nfcTagUid: String) {
        val timer = repo.getTimerByUid(timerUid)
        if (timer != null) {
            val updated = timer.copy(linkedNfcUid = nfcTagUid)
            repo.updateTimer(updated)
            _pairingUid.value = null
            refreshData()
        }
    }
    
    fun cancelTimerState(uid: String): NfcTimer? {
        val timer = repo.getTimerByUidOrLinkedTag(uid)
        if (timer != null) {
            val updated = timer.copy(endTimeMs = null)
            repo.updateTimer(updated)
            refreshData()
            return updated
        }
        return null
    }
    
    fun saveTimer(uid: String, name: String, durationSec: Int, linkedTag: String? = null) {
        val durationMs = durationSec * 1000L
        val existing = repo.getTimerByUid(uid)
        val newTimer = (existing ?: NfcTimer(uid = uid, name = name)).copy(
            name = name,
            type = TaskType.COUNTDOWN,
            durationMs = durationMs,
            linkedNfcUid = linkedTag ?: existing?.linkedNfcUid
        )
        repo.updateTimer(newTimer)
        _pairingUid.value = null
        refreshData()
    }

    fun saveRoutine(uid: String, name: String, hour: Int, minute: Int) {
        val newRoutine = NfcTimer(uid = uid, name = name, type = TaskType.ROUTINE, routineHour = hour, routineMinute = minute)
        repo.updateTimer(newRoutine)
        _pairingUid.value = null
        refreshData()
    }
    
    fun saveSnoozeTag(uid: String, name: String) {
        val newSnooze = NfcTimer(uid = uid, name = name, type = TaskType.SNOOZE)
        repo.updateTimer(newSnooze)
        _pairingUid.value = null
        refreshData()
    }

    fun applyGlobalSnooze(): NfcTimer? {
        return adjustActiveTimer(60_000L)
    }

    fun adjustActiveTimer(diffMs: Long): NfcTimer? {
        val activeTimer = repo.getTimers().find { it.type == TaskType.COUNTDOWN && it.endTimeMs != null && it.endTimeMs > System.currentTimeMillis() }
        if (activeTimer != null) {
            val updated = activeTimer.copy(endTimeMs = activeTimer.endTimeMs!! + diffMs)
            repo.updateTimer(updated)
            refreshData()
            return updated
        }
        return null
    }

    fun completeRoutine(uid: String): NfcTimer? {
        val timer = repo.getTimerByUidOrLinkedTag(uid)
        if (timer != null && timer.type == TaskType.ROUTINE) {
            val updated = timer.copy(lastCompletedMs = System.currentTimeMillis())
            repo.updateTimer(updated)
            refreshData()
            return updated
        }
        return null
    }
    
    fun dismissPairing() {
        _pairingUid.value = null
    }
    
    fun updateTimerState(timer: NfcTimer) {
        repo.updateTimer(timer)
        refreshData()
    }
}
