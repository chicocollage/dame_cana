package com.damecana.app.ui.workout

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.damecana.app.data.local.entities.SetEntity
import com.damecana.app.domain.usecases.ProgressionRecommendation
import com.damecana.app.ui.components.ExerciseNameAutoComplete

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ActiveWorkoutScreen(
    viewModel: ActiveWorkoutViewModel,
    onWorkoutFinished: () -> Unit,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val machines by viewModel.machines.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    var newExerciseName by remember { mutableStateOf("") }
    var selectedMachineId by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(uiState.isFinished) {
        if (uiState.isFinished) {
            onWorkoutFinished()
        }
    }

    LaunchedEffect(uiState.errorMessage) {
        uiState.errorMessage?.let { error ->
            snackbarHostState.showSnackbar(error)
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = uiState.session?.titulo ?: "Cargando...",
                        fontWeight = FontWeight.Bold
                    )
                },
                actions = {
                    Button(
                        onClick = { viewModel.finishWorkout() },
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                        modifier = Modifier.padding(end = 8.dp)
                    ) {
                        Icon(Icons.Default.Check, contentDescription = null)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Finalizar")
                    }
                }
            )
        },
        modifier = modifier
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            if (uiState.isLoading) {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    // Selector para añadir un nuevo ejercicio a la lista
                    item {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text("Añadir Nuevo Ejercicio a la Sesión", fontWeight = FontWeight.Bold)
                                Spacer(modifier = Modifier.height(8.dp))
                                ExerciseNameAutoComplete(
                                    machines = machines,
                                    selectedExerciseName = newExerciseName,
                                    onExerciseSelected = { name, machineId ->
                                        newExerciseName = name
                                        selectedMachineId = machineId
                                    }
                                )
                            }
                        }
                    }

                    items(uiState.exerciseGroups, key = { it.exerciseOrder }) { group ->
                        ExerciseCard(
                            group = group,
                            onAddSet = { load, reps, rir ->
                                viewModel.addSet(
                                    exerciseOrder = group.exerciseOrder,
                                    exerciseName = group.exerciseName,
                                    loadKg = load,
                                    reps = reps,
                                    rir = rir,
                                    machineId = group.machineId ?: selectedMachineId
                                )
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun ExerciseCard(
    group: ExerciseGroup,
    onAddSet: (load: Double, reps: Int, rir: Double?) -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        shape = RoundedCornerShape(12.dp),
        modifier = modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "${group.exerciseOrder}. ${group.exerciseName}",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            group.machineId?.let { machine ->
                Text(
                    text = "Máquina: $machine",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            // Recomendación del Algoritmo
            group.recommendation?.let { rec ->
                Spacer(modifier = Modifier.height(6.dp))
                Surface(
                    color = MaterialTheme.colorScheme.secondaryContainer,
                    shape = RoundedCornerShape(6.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "💡 Sugerencia Algoritmo: ${rec.recommendedLoadKg}kg x ${rec.recommendedReps} reps (${rec.reason})",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSecondaryContainer,
                        modifier = Modifier.padding(8.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            if (group.sets.isNotEmpty()) {
                SetTableHeader()
                HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
                group.sets.forEach { setItem ->
                    SetTableRow(set = setItem)
                }
            } else {
                Text(
                    text = "No hay series registradas aún.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.outline,
                    modifier = Modifier.padding(vertical = 8.dp)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            AddSetQuickForm(
                recommendation = group.recommendation,
                onAddSet = onAddSet
            )
        }
    }
}

@Composable
fun SetTableHeader() {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text("Serie", fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
        Text("Carga (kg)", fontWeight = FontWeight.Bold, modifier = Modifier.weight(1.5f))
        Text("Reps", fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
        Text("RIR", fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
    }
}

@Composable
fun SetTableRow(set: SetEntity) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text("#${set.setIndex}", modifier = Modifier.weight(1f))
        Text("${set.loadKg} kg", modifier = Modifier.weight(1.5f))
        Text("${set.reps}", modifier = Modifier.weight(1f))
        Text(set.rir?.let { "RIR $it" } ?: "-", modifier = Modifier.weight(1f))
    }
}

@Composable
fun AddSetQuickForm(
    recommendation: ProgressionRecommendation?,
    onAddSet: (load: Double, reps: Int, rir: Double?) -> Unit
) {
    var load by remember(recommendation) {
        mutableDoubleStateOf(recommendation?.recommendedLoadKg ?: 50.0)
    }
    var reps by remember(recommendation) {
        mutableIntStateOf(recommendation?.recommendedReps ?: 10)
    }
    var selectedRir by remember(recommendation) {
        mutableStateOf(recommendation?.targetRir ?: 2.0)
    }

    Surface(
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
        shape = RoundedCornerShape(8.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text("Añadir Serie", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                StepperInput(
                    label = "Kg",
                    value = "$load",
                    onDecrement = { if (load >= 2.5) load -= 2.5 },
                    onIncrement = { load += 2.5 },
                    modifier = Modifier.weight(1f)
                )

                Spacer(modifier = Modifier.width(8.dp))

                StepperInput(
                    label = "Reps",
                    value = "$reps",
                    onDecrement = { if (reps > 1) reps -= 1 },
                    onIncrement = { reps += 1 },
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("RIR:", modifier = Modifier.padding(end = 8.dp), style = MaterialTheme.typography.bodyMedium)
                listOf(0.0, 1.0, 2.0, 3.0, 4.0).forEach { rirVal ->
                    FilterChip(
                        selected = selectedRir == rirVal,
                        onClick = { selectedRir = rirVal },
                        label = { Text(rirVal.toInt().toString()) },
                        modifier = Modifier.padding(horizontal = 2.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Button(
                onClick = { onAddSet(load, reps, selectedRir) },
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.Add, contentDescription = null)
                Spacer(modifier = Modifier.width(4.dp))
                Text("Registrar Serie")
            }
        }
    }
}

@Composable
fun StepperInput(
    label: String,
    value: String,
    onDecrement: () -> Unit,
    onIncrement: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = modifier) {
        Text(label, style = MaterialTheme.typography.labelSmall)
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            FilledTonalIconButton(onClick = onDecrement, modifier = Modifier.size(36.dp)) {
                Text("-", fontWeight = FontWeight.Bold, fontSize = 18.sp)
            }
            Text(
                text = value,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 8.dp)
            )
            FilledTonalIconButton(onClick = onIncrement, modifier = Modifier.size(36.dp)) {
                Text("+", fontWeight = FontWeight.Bold, fontSize = 18.sp)
            }
        }
    }
}
