package com.damecana.app.domain.usecases

import android.content.Context
import android.content.SharedPreferences
import com.damecana.app.data.local.dao.MachineDao
import com.damecana.app.data.local.entities.MachineEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
private data class MachineCatalogDto(
    @SerialName("machine_id") val machineId: String,
    @SerialName("familia_slot") val familiaSlot: String,
    @SerialName("nombre_visible_estacion") val nombreVisibleEstacion: String,
    @SerialName("marca_modelo") val marcaModelo: String? = null,
    @SerialName("load_basis") val loadBasis: String? = null,
    @SerialName("ajustes_reproducibles") val ajustesReproducibles: String? = null
)

class PrepopulateDatabaseUseCase(
    private val machineDao: MachineDao,
    private val context: Context
) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("dame_cana_prefs", Context.MODE_PRIVATE)

    suspend operator fun invoke() = withContext(Dispatchers.IO) {
        val isPrepopulated = prefs.getBoolean("is_catalog_prepopulated", false)
        if (isPrepopulated) return@withContext

        try {
            val jsonString = context.assets.open("default_catalog.json")
                .bufferedReader()
                .use { it.readText() }

            val json = Json { ignoreUnknownKeys = true }
            val catalogDtoList = json.decodeFromString<List<MachineCatalogDto>>(jsonString)

            val entities = catalogDtoList.map { dto ->
                MachineEntity(
                    machineId = dto.machineId,
                    familiaSlot = dto.familiaSlot,
                    nombreVisibleEstacion = dto.nombreVisibleEstacion,
                    marcaModelo = dto.marcaModelo,
                    loadBasis = dto.loadBasis,
                    ajustesReproducibles = dto.ajustesReproducibles
                )
            }

            machineDao.insertMachines(entities)
            prefs.edit().putBoolean("is_catalog_prepopulated", true).apply()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
