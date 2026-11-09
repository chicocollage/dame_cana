package com.damecana.app.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.damecana.app.ui.history.WorkoutHistoryScreen
import com.damecana.app.ui.history.WorkoutHistoryViewModel
import com.damecana.app.ui.workout.ActiveWorkoutScreen
import com.damecana.app.ui.workout.ActiveWorkoutViewModel

sealed class Screen(val route: String, val title: String, val icon: ImageVector) {
    object ActiveWorkout : Screen("active_workout", "Entrenar", Icons.Default.PlayArrow)
    object History : Screen("history", "Historial", Icons.Default.DateRange)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    activeWorkoutViewModel: ActiveWorkoutViewModel,
    workoutHistoryViewModel: WorkoutHistoryViewModel
) {
    val navController = rememberNavController()

    Scaffold(
        bottomBar = {
            BottomNavigationBar(navController = navController)
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.ActiveWorkout.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Screen.ActiveWorkout.route) {
                ActiveWorkoutScreen(
                    viewModel = activeWorkoutViewModel,
                    onWorkoutFinished = {
                        workoutHistoryViewModel.loadHistory()
                        navController.navigate(Screen.History.route) {
                            popUpTo(navController.graph.findStartDestination().id) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                )
            }
            composable(Screen.History.route) {
                WorkoutHistoryScreen(
                    viewModel = workoutHistoryViewModel
                )
            }
        }
    }
}

@Composable
fun BottomNavigationBar(navController: NavHostController) {
    val items = listOf(Screen.ActiveWorkout, Screen.History)
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    NavigationBar {
        items.forEach { screen ->
            NavigationBarItem(
                icon = { Icon(screen.icon, contentDescription = screen.title) },
                label = { Text(screen.title) },
                selected = currentRoute == screen.route,
                onClick = {
                    if (currentRoute != screen.route) {
                        navController.navigate(screen.route) {
                            popUpTo(navController.graph.findStartDestination().id) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                }
            )
        }
    }
}
