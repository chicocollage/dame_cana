package com.damecana.app.domain.usecases

import android.content.Context
import com.damecana.app.data.remote.dto.*
import com.damecana.app.domain.repository.WorkoutRepository
import kotlinx.coroutines.flow.first
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

class ExportWorkoutToJsonUseCase(
    private val repository: WorkoutRepository,
    private val context: Context
) {
    private val json = Json {
        prettyPrint = true
        encodeDefaults = true
        ignoreUnknownKeys = true
    }

    suspend operator fun invoke(sessionId: String): File? {
        val session = repository.getActiveSession()?.takeIf { it.sessionId == sessionId }
            ?: repository.getLastFinishedSession()?.takeIf { it.sessionId == sessionId }
            ?: return null

        val sets = repository.getSetsForSession(sessionId).first()
        val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.getDefault()).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }

        val groupedExercises = sets.groupBy { it.exerciseOrder to it.exerciseName }
            .map { (key, setList) ->
                val order = key.first
                val name = key.second
                val firstSet = setList.first()

                ExerciseDto(
                    index = order,
                    name = name,
                    machineId = firstSet.machineId,
                    comparabilityGroup = firstSet.comparabilityGroup,
                    result = ExerciseResultDto(
                        movementNotes = firstSet.movementNotes ?: "",
                        sets = setList.map { setItem ->
                            SetDto(
                                index = setItem.setIndex,
                                loadKg = setItem.loadKg,
                                reps = setItem.reps,
                                rir = setItem.rir
                            )
                        }
                    )
                )
            }.sortedBy { it.index }

        val logDto = TrainingLogDto(
            exportedAt = isoFormat.format(Date()),
            session = SessionDto(
                id = session.sessionId,
                date = dateFormat.format(Date(session.fecha)),
                day = session.dia,
                title = session.titulo,
                finished = session.finished,
                exerciseCount = groupedExercises.size,
                plannedSetCount = sets.size,
                recordedSetCount = sets.size
            ),
            exercises = groupedExercises
        )

        val jsonString = json.encodeToString(logDto)
        return saveJsonToLocalFolder(session.sessionId, jsonString)
    }

    private fun saveJsonToLocalFolder(sessionId: String, jsonContent: String): File {
        val documentsDir = context.getExternalFilesDir(null) ?: context.filesDir
        val dameCanaFolder = File(documentsDir, "DameCana/Exported")
        if (!dameCanaFolder.exists()) {
            dameCanaFolder.mkdirs()
        }

        val file = File(dameCanaFolder, "${sessionId}.json")
        file.writeText(jsonContent)
        return file
    }
}
