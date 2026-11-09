package com.damecana.app.data.local.entities

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "machines")
data class MachineEntity(
    @PrimaryKey
    @ColumnInfo(name = "machine_id")
    val machineId: String,

    @ColumnInfo(name = "familia_slot")
    val familiaSlot: String,

    @ColumnInfo(name = "nombre_visible_estacion")
    val nombreVisibleEstacion: String,

    @ColumnInfo(name = "marca_modelo")
    val marcaModelo: String? = null,

    @ColumnInfo(name = "load_basis")
    val loadBasis: String? = null,

    @ColumnInfo(name = "ajustes_reproducibles")
    val ajustesReproducibles: String? = null
)
