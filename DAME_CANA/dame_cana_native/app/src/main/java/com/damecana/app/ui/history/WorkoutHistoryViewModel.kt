package com.damecana.app.ui.history

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.damecana.app.domain.usecases.GetWorkoutHistoryUseCase
import com.damecana.app.domain.usecases.HistorySessionItem
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class WorkoutHistoryUiState(
    val isLoading: Boolean = true,
    val historyItems: List<HistorySessionItem> = emptyList(),
    val errorMessage: String? = null
)

class WorkoutHistoryViewModel(
    private val getWorkoutHistoryUseCase: GetWorkoutHistoryUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow(WorkoutHistoryUiState())
    val uiState: StateFlow<WorkoutHistoryUiState> = _uiState.asStateFlow()

    init {
        loadHistory()
    }

    fun loadHistory() {
        viewModelScope.launch {
            getWorkoutHistoryUseCase()
                .catch { e ->
                    _uiState.update {
                        it.copy(isLoading = false, errorMessage = "Error al cargar historial: ${e.localizedMessage}")
                    }
                }
                .collect { items ->
                    _uiState.update {
                        it.copy(isLoading = false, historyItems = items)
                    }
                }
        }
    }
}
