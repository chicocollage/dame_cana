package com.damecana.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.damecana.data.entity.WorkoutSet

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WorkoutScreen(
    sessionTitle: String,
    sets: List<WorkoutSet>,
    onSetCompleted: (String, Double, Int, String) -> Unit,
    onStartTimer: (Int) -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(text = sessionTitle) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                )
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            items(sets) { set ->
                SetCard(
                    workoutSet = set,
                    onSave = { weight, reps, rir ->
                        onSetCompleted(set.setId, weight, reps, rir)
                        // Extraemos el tiempo de descanso si está en los metadatos, o usamos 120s por defecto
                        onStartTimer(120) 
                    }
                )
            }
        }
    }
}

@Composable
fun SetCard(
    workoutSet: WorkoutSet,
    onSave: (Double, Int, String) -> Unit
) {
    var weight by remember { mutableStateOf(workoutSet.loadKg?.toString() ?: "") }
    var reps by remember { mutableStateOf(if (workoutSet.reps > 0) workoutSet.reps.toString() else "") }
    var rir by remember { mutableStateOf(workoutSet.rir) }

    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(text = ". ", style = MaterialTheme.typography.titleMedium)
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = weight,
                    onValueChange = { weight = it },
                    label = { Text("Kg") },
                    modifier = Modifier.weight(1f)
                )
                OutlinedTextField(
                    value = reps,
                    onValueChange = { reps = it },
                    label = { Text("Reps") },
                    modifier = Modifier.weight(1f)
                )
                OutlinedTextField(
                    value = rir,
                    onValueChange = { rir = it },
                    label = { Text("RIR") },
                    modifier = Modifier.weight(1f)
                )
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Button(
                onClick = { onSave(weight.toDoubleOrNull() ?: 0.0, reps.toIntOrNull() ?: 0, rir) },
                modifier = Modifier.align(Alignment.End)
            ) {
                Text(if (workoutSet.completed) "Actualizar" else "Completar y Descansar")
            }
        }
    }
}
