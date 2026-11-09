package com.damecana.app.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import com.damecana.app.data.local.entities.MachineEntity

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExerciseNameAutoComplete(
    machines: List<MachineEntity>,
    selectedExerciseName: String,
    onExerciseSelected: (name: String, machineId: String?) -> Unit,
    modifier: Modifier = Modifier
) {
    var expanded by remember { mutableStateOf(false) }
    var textValue by remember { mutableStateOf(selectedExerciseName) }

    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = !expanded },
        modifier = modifier
    ) {
        OutlinedTextField(
            value = textValue,
            onValueChange = {
                textValue = it
                onExerciseSelected(it, null)
                expanded = true
            },
            label = { Text("Ejercicio / Estación") },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            colors = ExposedDropdownMenuDefaults.outlinedTextFieldColors(),
            modifier = Modifier
                .menuAnchor()
                .fillMaxWidth()
        )

        val filteredMachines = machines.filter {
            it.nombreVisibleEstacion.contains(textValue, ignoreCase = true) ||
            it.familiaSlot.contains(textValue, ignoreCase = true)
        }

        if (filteredMachines.isNotEmpty()) {
            ExposedDropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false }
            ) {
                filteredMachines.forEach { machine ->
                    DropdownMenuItem(
                        text = {
                            Column {
                                Text(machine.nombreVisibleEstacion, fontWeight = FontWeight.Bold)
                                Text(machine.familiaSlot, style = MaterialTheme.typography.bodySmall)
                            }
                        },
                        onClick = {
                            textValue = machine.nombreVisibleEstacion
                            onExerciseSelected(machine.nombreVisibleEstacion, machine.machineId)
                            expanded = false
                        }
                    )
                }
            }
        }
    }
}
