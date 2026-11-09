package com.damecana.app.ui.workout

import com.damecana.app.data.local.entities.SessionEntity
import com.damecana.app.data.local.entities.SetEntity
import com.damecana.app.domain.usecases.ProgressionRecommendation

data class ExerciseGroup(
    val exerciseOrder: Int,
    val exerciseName: String,
    val machineId: String?,
    val sets: List<SetEntity>,
    val recommendation: ProgressionRecommendation? = null
)

data class ActiveWorkoutUiState(
    val isLoading: Boolean = true,
    val isExporting: Boolean = false,
    val session: SessionEntity? = null,
    val exerciseGroups: List<ExerciseGroup> = emptyList(),
    val isFinished: Boolean = false,
    val exportedFilePath: String? = null,
    val errorMessage: String? = null
)
