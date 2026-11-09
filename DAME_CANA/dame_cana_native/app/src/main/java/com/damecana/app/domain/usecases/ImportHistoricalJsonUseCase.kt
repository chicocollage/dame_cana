package com.damecana.app.domain.usecases

import com.damecana.app.data.local.dao.WorkoutImportDao
import com.damecana.app.data.local.entities.SessionEntity
import com.damecana.app.data.local.entities.SetEntity
import com.damecana.app.data.remote.dto.TrainingHistoryDto
import com.damecana.app.data.remote.dto.TrainingLogDto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import java.text.SimpleDateFormat
import java.util.Locale

class ImportHistoricalJsonUseCase(
    private val importDao: WorkoutImportDao
) {
    private val json = Json { ignoreUnknownKeys = true }
    private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())

    suspend operator fun invoke(jsonString: String): Int = withContext(Dispatchers.IO) {
        val sessionsToInsert = mutableListOf<SessionEntity>()
        val setsToInsert = mutableListOf<SetEntity>()

        try {
            val historyDto = try {
                json.decodeFromString<TrainingHistoryDto>(jsonString)
            } catch (e: Exception) {
                null
            }

            val logList = if (historyDto != null && historyDto.sessions.isNotEmpty()) {
                historyDto.sessions
            } else {
                listOf(json.decodeFromString<TrainingLogDto>(jsonString))
            }

            logList.forEach { logDto ->
                val dateMillis = try {
                    dateFormat.parse(logDto.session.date)?.time ?: System.currentTimeMillis()
                } catch (e: Exception) {
                    System.currentTimeMillis()
                }

                val sessionEntity = SessionEntity(
                    sessionId = logDto.session.id,
                    fecha = dateMillis,
                    dia = logDto.session.day,
                    titulo = logDto.session.title,
                    finished = logDto.session.finished,
                    recordQuality = logDto.session.recordQuality
                )
                sessionsToInsert.add(sessionEntity)

                logDto.exercises.forEach { exerciseDto ->
                    exerciseDto.result.sets.forEach { setDto ->
                        val setId = "${logDto.session.id}__E${exerciseDto.index}__S${setDto.index}"
                        val setEntity = SetEntity(
                            setId = setId,
                            sessionId = logDto.session.id,
                            exerciseOrder = exerciseDto.index,
                            exerciseName = exerciseDto.name,
                            machineId = exerciseDto.machineId,
                            setIndex = setDto.index,
                            loadKg = setDto.loadKg,
                            reps = setDto.reps,
                            rir = setDto.rir,
                            movementNotes = exerciseDto.result.movementNotes,
                            comparabilityGroup = exerciseDto.comparabilityGroup
                        )
                        setsToInsert.add(setEntity)
                    }
                }
            }

            importDao.importFullHistory(sessionsToInsert, setsToInsert)
            return@withContext sessionsToInsert.size
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext 0
        }
    }
}
