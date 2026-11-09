# Protocolo estandarizado de métricas de seguimiento

**Documento:** Mejora-B4  
**Fecha de creación:** 2026-08-23  
**Tipo:** Aplicación práctica — procedimiento operativo  
**Nivel de evidencia:** Síntesis práctica derivada del corpus. El protocolo fotográfico y antropométrico no tiene un ECA de validación específica para este uso. Su función es reducir el ruido de medición, no producir datos clínicos.  
**Integra:** Conclusiones de dosificación (Fase 2B), algoritmo de estancamiento (Fase 7A) y reglas de ajuste de dieta (Fase 4).

---

## Por qué se necesita este protocolo

El corpus describe correctamente los criterios para ajustar volumen y dieta: rendimiento, recuperación, seguimiento visual. Pero sin un procedimiento estandarizado, esos criterios son ambiguos:

- La iluminación, la pose, la hora del día y el estado de hidratación pueden cambiar la apariencia percibida en ±5 años y ±5 kg de músculo sin que haya cambiado nada real.
- "Me veo mejor" o "me veo peor" no activa con fiabilidad los algoritmos de ajuste ya definidos en el corpus.
- Sin métricas de rendimiento registradas, el "estancamiento" queda sin definición operativa.

Este protocolo no añade complejidad: define condiciones mínimas reproducibles para que las decisiones del corpus puedan tomarse con datos objetivos.

---

## 1. Protocolo fotográfico

### 1.1 Condiciones obligatorias

| Variable | Especificación |
|---|---|
| **Hora** | Misma franja de 30 min cada vez. Recomendado: mañana, entre 1–2 h tras levantarse, antes de la primera comida sólida. |
| **Hidratación** | Haber bebido agua normal esa mañana; evitar el día después de una comida muy salada o de un ayuno prolongado. |
| **Ropa** | Bóxer o bañador ajustado, siempre el mismo. Sin ropa compresiva que deforme contornos. |
| **Iluminación** | Luz natural difusa (ventana sin sol directo) o luz artificial blanca uniforme de frente. Sin flash directo. Sin luz lateral dura (crea sombras que parecen músculo). |
| **Fondo** | Pared lisa de color neutro. Sin espejos adicionales en el encuadre. |
| **Cámara** | Misma cámara o teléfono. Lente estándar (equivalente a 50 mm; evitar gran angular que distorsiona proporciones). Sin zoom digital. |
| **Distancia** | 2 metros desde el objetivo hasta el sujeto. Marcar el suelo con cinta si es necesario. |
| **Encuadre** | Cuerpo completo desde el suelo hasta el cuello. |
| **Disparador** | Temporizador de 3–10 s o mando a distancia. No sujetar el teléfono con el brazo extendido. |

### 1.2 Cuatro ángulos obligatorios

| Ángulo | Instrucción de pose |
|---|---|
| **Frontal** | De pie, peso equilibrado en ambos pies, brazos caídos a los lados sin tensar, mirada al frente. |
| **Posterior** | Espalda a cámara, misma postura neutra, brazos caídos. |
| **Lateral derecho** | Perfil derecho, brazo derecho ligeramente adelantado para que no tape el contorno del tronco. |
| **Lateral izquierdo** | Igual al derecho, lado izquierdo. |

> **Regla de no posing:** no arquear la espalda, no contraer el glúteo, no sacar pecho, no encoger el abdomen. La foto documenta el estado de reposo, no el mejor aspecto posible.

### 1.3 Frecuencia y archivo

- **Frecuencia:** Semanas 1, 4, 8 y 12 de cada bloque. No evaluar entre semanas.
- **Archivo:** Carpeta `FOTO_SEGUIMIENTO/YYYY-MM-DD/` con 4 archivos: `frontal.jpg`, `posterior.jpg`, `lateral_D.jpg`, `lateral_I.jpg`.
- **Comparación:** Siempre comparar la foto actual con la del inicio del bloque (semana 1), no con la semana anterior.

---

## 2. Mediciones antropométricas

### 2.1 Circunferencia de cadera

| Parámetro | Especificación |
|---|---|
| **Punto de medición** | Al nivel del trocánter mayor del fémur. Palpar el trocánter lateralmente y marcar con rotulador lavable. |
| **Técnica** | Cinta métrica inextensible (metálica o de fibra de vidrio). Paralela al suelo. Tensión suave y reproducible. |
| **Momento** | Misma franja horaria que la foto. De pie, relajado, peso equilibrado. |
| **Registro** | 3 mediciones consecutivas → registrar la mediana. |
| **Frecuencia** | Semanas 1, 4, 8 y 12. |

### 2.2 Circunferencia de cintura (referencia proporcional)

| Parámetro | Especificación |
|---|---|
| **Punto** | A nivel del ombligo o en el punto más estrecho entre costillas y cresta ilíaca. Elegir uno y mantenerlo. |
| **Técnica** | Cinta inextensible, paralela al suelo, al final de una espiración normal. |
| **Uso** | Índice proporcional y criterio de ajuste energético (Fase 4). No es métrica primaria de hipertrofia. |

### 2.3 Peso corporal

| Parámetro | Especificación |
|---|---|
| **Báscula** | Siempre la misma, en superficie plana dura. |
| **Condiciones** | Mañana, tras orinar, antes de comer o beber. |
| **Registro semanal** | Media de 3 días consecutivos por semana. Esa media entra en el algoritmo de dieta. |

---

## 3. Métricas de rendimiento por ejercicio índice

### 3.1 Registro por serie en cada sesión

Ejercicio | Fecha | Carga (kg) | Reps | RIR | Notas

### 3.2 Índice de progresión

Volumen de carga = suma(carga × reps) por ejercicio y semana.

Comparar semana actual vs. semana anterior a RIR equivalente. Aumento ≥2,5–5% = progresión. Sin cambio durante ≥3 semanas → activar algoritmo de estancamiento (Fase 7A, sec. 7).

---

## 4. Separación de métricas de proceso y de resultado

| Tipo | Métrica | Frecuencia de revisión |
|---|---|---|
| **Proceso** | Series completadas vs. planificadas | Semanal |
| **Proceso** | Adherencia proteica (% días con ingesta suficiente) | Semanal |
| **Proceso** | Calidad subjetiva del sueño (0–10) | Semanal |
| **Resultado** | Volumen de carga por ejercicio índice | Cada bloque (4–8 sem) |
| **Resultado** | Circunferencias cadera y cintura | Cada bloque |
| **Resultado** | Foto de seguimiento | Cada bloque |

> Las métricas de proceso informan ajustes semana a semana. Las de resultado evalúan el bloque completo. Nunca usar una foto de la semana 3 para tomar decisiones de volumen.

---

## 5. Interpretación: cuándo actuar

### Aumentar volumen (≥2 criterios simultáneos)
- Volumen de carga aumentó ≥2,5% durante ≥3 semanas seguidas.
- Circunferencia de cadera no aumentó durante 4 semanas y la adherencia fue alta.
- El RIR real está consistentemente ≥1 por encima del objetivo.
- No hay fatiga acumulada, dolor articular ni caída de rendimiento.

### Reducir volumen (≥1 criterio)
- Volumen de carga cae durante ≥2 sesiones comparables sin causa identificada.
- Dolor articular o tendinoso creciente durante ≥2 sesiones.
- Agujetas alteran la siguiente sesión durante ≥72 h.
- Sueño o disposición a entrenar empeoran de forma sostenida.

### Ajustar dieta (algoritmo Fase 4)

| Observación (media 2 semanas) | Acción |
|---|---|
| Peso estable, cintura estable, rendimiento mejora | Mantener |
| Cintura aumenta sin progresión | Reducir 100–150 kcal/día |
| Peso y cintura bajan, rendimiento cae | Añadir 100–200 kcal/día |
| Todo estable, rendimiento estancado >3 sem | Valorar superávit +100–150 kcal/día |

---

## 6. Límites de este protocolo

- Las mediciones de circunferencia tienen un error típico de ±0,5–1 cm. Un cambio ≤1 cm entre mediciones no es interpretable.
- El protocolo fotográfico no sustituye a la ecografía de grosor muscular.
- El peso corporal varía 1–3 kg por agua y glucógeno. La media de 3 días reduce el ruido pero no lo elimina.
- El RIR estimado tiene un margen de ±1–2 repeticiones, especialmente con cargas ligeras.

---

## 7. Registro de Integración

```
ID: INT-2026-08-23-B4-01
Fecha: 2026-08-23
Proyecto de destino: Glúteo y estética masculina
Documentos afectados: Fase 2B (reglas de ajuste), Fase 4 (ajuste dieta), Fase 7A (estancamiento)
Tipo de impacto: amplía

Hallazgo: Los algoritmos de ajuste del corpus requieren métricas objetivas
que no estaban especificadas operativamente. Este protocolo las define.

Cambio práctico: adoptar el protocolo desde el inicio del siguiente bloque.
Qué permanece igual: todos los algoritmos de decisión. Solo cambia el input.
Riesgo: muy bajo. No modifica ninguna conclusión científica.
```
