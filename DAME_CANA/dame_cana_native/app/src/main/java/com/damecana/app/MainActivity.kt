package com.damecana.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.lifecycle.lifecycleScope
import androidx.room.Room
import com.damecana.app.data.local.DameCanaDatabase
import com.damecana.app.data.repository.WorkoutRepositoryImpl
import com.damecana.app.domain.usecases.*
import com.damecana.app.ui.history.WorkoutHistoryViewModel
import com.damecana.app.ui.navigation.MainScreen
import com.damecana.app.ui.theme.DameCanaTheme
import com.damecana.app.ui.workout.ActiveWorkoutViewModel
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 1. Inicialización BBDD Room
        val db = Room.databaseBuilder(
            applicationContext,
            DameCanaDatabase::class.java,
            "dame_cana.db"
        ).fallbackToDestructiveMigration().build()

        val repository = WorkoutRepositoryImpl(db.sessionDao(), db.setDao())

        // 2. Ejecutar precargas de catálogo e historial al arrancar
        val prepopulateUseCase = PrepopulateDatabaseUseCase(db.machineDao(), applicationContext)
        val importHistoricalUseCase = ImportHistoricalJsonUseCase(db.workoutImportDao())

        lifecycleScope.launch {
            prepopulateUseCase()

            val prefs = getSharedPreferences("dame_cana_prefs", MODE_PRIVATE)
            val isHistoryImported = prefs.getBoolean("is_history_imported", false)
            if (!isHistoryImported) {
                try {
                    val historyFiles = applicationContext.assets.list("history") ?: emptyArray()
                    historyFiles.filter { it.endsWith(".json") }.forEach { fileName ->
                        val jsonString = applicationContext.assets.open("history/$fileName")
                            .bufferedReader()
                            .use { it.readText() }

                        importHistoricalUseCase(jsonString)
                    }
                    prefs.edit().putBoolean("is_history_imported", true).apply()
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }

        // 3. Instanciación de Casos de Uso
        val startNewSessionUseCase = StartNewSessionUseCase(repository)
        val addSetToSessionUseCase = AddSetToSessionUseCase(repository)
        val finishSessionUseCase = FinishSessionUseCase(repository)
        val exportWorkoutToJsonUseCase = ExportWorkoutToJsonUseCase(repository, applicationContext)
        val getWorkoutHistoryUseCase = GetWorkoutHistoryUseCase(repository)
        val progressionEngineUseCase = ProgressionEngineUseCase()

        // 4. Instanciación de ViewModels
        val activeWorkoutViewModel = ActiveWorkoutViewModel(
            startNewSessionUseCase = startNewSessionUseCase,
            addSetToSessionUseCase = addSetToSessionUseCase,
            finishSessionUseCase = finishSessionUseCase,
            exportWorkoutToJsonUseCase = exportWorkoutToJsonUseCase,
            progressionEngineUseCase = progressionEngineUseCase,
            repository = repository,
            machineDao = db.machineDao()
        )

        val workoutHistoryViewModel = WorkoutHistoryViewModel(
            getWorkoutHistoryUseCase = getWorkoutHistoryUseCase
        )

        // 5. Montaje de la UI Compose
        setContent {
            DameCanaTheme {
                MainScreen(
                    activeWorkoutViewModel = activeWorkoutViewModel,
                    workoutHistoryViewModel = workoutHistoryViewModel
                )
            }
        }
    }
}
