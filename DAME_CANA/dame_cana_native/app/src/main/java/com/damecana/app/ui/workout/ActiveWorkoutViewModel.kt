package com.damecana.app.ui.workout

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.damecana.app.data.local.entities.MachineEntity
import com.damecana.app.domain.repository.WorkoutRepository
import com.damecana.app.domain.usecases.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class ActiveWorkoutViewModel(
    private val startNewSessionUseCase: StartNewSessionUseCase,
    private val addSetToSessionUseCase: AddSetToSessionUseCase,
    private val finishSessionUseCase: FinishSessionUseCase,
    private val exportWorkoutToJsonUseCase: ExportWorkoutToJsonUseCase,
    private val progressionEngineUseCase: ProgressionEngineUseCase,
    private val repository: WorkoutRepository,
    private val machineDao: com.damecana.app.data.local.dao.MachineDao
) : ViewModel() {

    private val _uiState = MutableStateFlow(ActiveWorkoutUiState())
    val uiState: StateFlow<ActiveWorkoutUiState> = _uiState.asStateFlow()

    private val _machines = MutableStateFlow<List<MachineEntity>>(emptyList())
    val machines: StateFlow<List<MachineEntity>> = _machines.asStateFlow()

    init {
        startWorkout()
        observeMachines()
    }

    private fun observeMachines() {
        viewModelScope.launch {
            machineDao.getAllMachines().collect { list ->
                _machines.value = list
            }
        }
    }

    fun startWorkout(customTitle: String? = null) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            try {
                val session = startNewSessionUseCase(customTitle)
                _uiState.update { it.copy(session = session, isLoading = false) }
                observeSets(session.sessionId)
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = "Error al iniciar sesión: ${e.localizedMessage}"
                    )
                }
            }
        }
    }

    private fun observeSets(sessionId: String) {
        viewModelScope.launch {
            repository.getSetsForSession(sessionId)
                .catch { e ->
                    _uiState.update {
                        it.copy(errorMessage = "Error al leer series: ${e.localizedMessage}")
                    }
                }
                .collect { sets ->
                    val grouped = sets
                        .groupBy { it.exerciseOrder to it.exerciseName }
                        .map { (key, setList) ->
                            val exerciseName = key.second
                            val recentSets = repository.getRecentSetsForExercise(exerciseName)
                            val recommendation = progressionEngineUseCase.calculateRecommendation(recentSets)

                            ExerciseGroup(
                                exerciseOrder = key.first,
                                exerciseName = exerciseName,
                                machineId = setList.firstOrNull()?.machineId,
                                sets = setList,
                                recommendation = recommendation
                            )
                        }
                        .sortedBy { it.exerciseOrder }

                    _uiState.update { it.copy(exerciseGroups = grouped) }
                }
        }
    }

    fun addSet(
        exerciseOrder: Int,
        exerciseName: String,
        loadKg: Double,
        reps: Int,
        rir: Double?,
        machineId: String? = null,
        movementNotes: String? = null
    ) {
        val currentSessionId = _uiState.value.session?.sessionId ?: return

        viewModelScope.launch {
            try {
                addSetToSessionUseCase(
                    sessionId = currentSessionId,
                    exerciseOrder = exerciseOrder,
                    exerciseName = exerciseName,
                    loadKg = loadKg,
                    reps = reps,
                    rir = rir,
                    machineId = machineId,
                    movementNotes = movementNotes
                )
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(errorMessage = "Error al añadir serie: ${e.localizedMessage}")
                }
            }
        }
    }

    fun finishWorkout() {
        val currentSessionId = _uiState.value.session?.sessionId ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isExporting = true) }
            try {
                finishSessionUseCase(currentSessionId)

                val exportedFile = withContext(Dispatchers.IO) {
                    exportWorkoutToJsonUseCase(currentSessionId)
                }

                _uiState.update {
                    it.copy(
                        isExporting = false,
                        isFinished = true,
                        exportedFilePath = exportedFile?.absolutePath
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isExporting = false,
                        errorMessage = "Error al finalizar y exportar: ${e.localizedMessage}"
                    )
                }
            }
        }
    }
}
