package com.damecana.app.ui

import android.graphics.RuntimeShader
import android.os.Build
import androidx.annotation.RequiresApi
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.ShaderBrush
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.drawOutline
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.abs

val PanelShape = RoundedCornerShape(2.dp)
val ModuleShape = RoundedCornerShape(2.dp)

/** Sombra dura desplazada (neo-brutalismo técnico). Se dibuja fuera de los límites: reservar margen. */
fun Modifier.hardShadow(
    offset: Dp = 3.dp,
    color: Color = AuraColors.Ink,
    shape: Shape = PanelShape
): Modifier = this.drawBehind {
    val o = offset.toPx()
    val outline = shape.createOutline(size, layoutDirection, this)
    translate(o, o) { drawOutline(outline, color) }
}

/** Pulsación táctil con muelle + háptica. */
@Composable
fun Modifier.tactile(enabled: Boolean = true, onClick: () -> Unit): Modifier {
    val source = remember { MutableInteractionSource() }
    val pressed by source.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (pressed) 0.95f else 1f,
        animationSpec = spring(dampingRatio = 0.5f, stiffness = Spring.StiffnessMedium),
        label = "tactileScale"
    )
    val haptic = LocalHapticFeedback.current
    return this
        .graphicsLayer {
            scaleX = scale
            scaleY = scale
        }
        .clickable(interactionSource = source, indication = null, enabled = enabled) {
            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
            onClick()
        }
}

@Composable
fun AuraPanel(
    modifier: Modifier = Modifier,
    color: Color = AuraColors.Paper,
    shadow: Boolean = true,
    content: @Composable ColumnScope.() -> Unit
) {
    Column(
        modifier = modifier
            .then(if (shadow) Modifier.hardShadow() else Modifier)
            .clip(PanelShape)
            .background(color)
            .border(1.5.dp, AuraColors.Ink, PanelShape),
        content = content
    )
}

@Composable
fun AuraChip(
    text: String,
    modifier: Modifier = Modifier,
    selected: Boolean = false,
    container: Color = AuraColors.Input,
    contentColor: Color = AuraColors.Ink,
    selectedContainer: Color = AuraColors.Ink,
    selectedContent: Color = AuraColors.Paper,
    minHeight: Dp = 36.dp,
    onClick: () -> Unit
) {
    val resolvedContent = when {
        selected -> selectedContent
        contentColor != AuraColors.Ink -> contentColor
        container == AuraColors.Lime || container == AuraColors.Orange ||
        container == AuraColors.Ink || container == AuraColors.Forest -> AuraColors.Paper
        else -> AuraColors.Ink
    }

    Box(
        modifier = modifier
            .tactile(onClick = onClick)
            .clip(ModuleShape)
            .background(if (selected) selectedContainer else container)
            .border(1.dp, AuraColors.Ink, ModuleShape)
            .heightIn(min = minHeight)
            .padding(horizontal = 12.dp, vertical = 8.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = text,
            style = AuraType.chip,
            color = resolvedContent,
            textAlign = TextAlign.Center
        )
    }
}

/** Fila de segmentos continua (RIR, escalas 1–10, pestañas) estilo Ficha Perforada (Punch-Card). */
@Composable
fun SegmentRow(
    options: List<String>,
    selected: String?,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
    selectedContainer: Color = AuraColors.Orange,
    selectedContent: Color = AuraColors.Paper,
    track: Color = AuraColors.Ink.copy(alpha = 0.07f),
    minHeight: Dp = 40.dp,
    expandSelected: Boolean = false,
    shortLabels: List<String>? = null
) {
    Row(
        modifier = modifier
            .clip(ModuleShape)
            .background(track),
        horizontalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        options.forEachIndexed { index, option ->
            val isSelected = option == selected
            val cellWeight by animateFloatAsState(
                targetValue = if (expandSelected && isSelected) 2.4f else 1f,
                animationSpec = spring(dampingRatio = 0.75f, stiffness = Spring.StiffnessMediumLow),
                label = "segWeight"
            )
            val shown = if (expandSelected && !isSelected && shortLabels != null) shortLabels[index] else option
            Box(
                modifier = Modifier
                    .weight(cellWeight)
                    .tactile { onSelect(option) }
                    .clip(ModuleShape)
                    .background(if (isSelected) selectedContainer else Color.Transparent)
                    .border(1.dp, AuraColors.Ink, ModuleShape)
                    .heightIn(min = minHeight)
                    .padding(vertical = 8.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = shown,
                    maxLines = 1,
                    softWrap = false,
                    style = AuraType.chip,
                    color = if (isSelected) selectedContent else AuraColors.Ink
                )
            }
        }
    }
}

/**
 * Dial táctil: arrastrar en horizontal = pasos gruesos, toque en los bordes = paso fino,
 * pulsación larga = borrar. Háptica por cada marca. Sin teclado.
 */
@Composable
fun DialValue(
    label: String,
    valueText: String?,
    ghostText: String,
    weight: Int,
    onCoarse: (Int) -> Unit,
    onFine: (Int) -> Unit,
    onClear: () -> Unit,
    modifier: Modifier = Modifier,
    tickDp: Dp = 18.dp,
    onHeaderTap: (() -> Unit)? = null
) {
    val haptic = LocalHapticFeedback.current
    val coarse by rememberUpdatedState(onCoarse)
    val fine by rememberUpdatedState(onFine)
    val clear by rememberUpdatedState(onClear)
    val headerTap by rememberUpdatedState(onHeaderTap)
    val tickPx = with(LocalDensity.current) { tickDp.toPx() }

    Box(
        modifier = modifier
            .clip(ModuleShape)
            .background(Color.White.copy(alpha = 0.55f))
            .border(1.dp, AuraColors.Ink, ModuleShape)
            .pointerInput(tickPx) {
                var acc = 0f
                detectHorizontalDragGestures(
                    onDragStart = { acc = 0f },
                    onDragEnd = { acc = 0f },
                    onDragCancel = { acc = 0f }
                ) { change, dragAmount ->
                    change.consume()
                    acc += dragAmount
                    var steps = 0
                    while (abs(acc) >= tickPx) {
                        val d = if (acc > 0) 1 else -1
                        acc -= d * tickPx
                        steps += d
                    }
                    if (steps != 0) {
                        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        coarse(steps)
                    }
                }
            }
            .pointerInput(Unit) {
                detectTapGestures(
                    onLongPress = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        clear()
                    },
                    onTap = { offset ->
                        val w = size.width
                        when {
                            offset.x < w * 0.34f -> {
                                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                fine(-1)
                            }
                            offset.x > w * 0.66f -> {
                                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                fine(1)
                            }
                            else -> {
                                headerTap?.let {
                                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                    it()
                                }
                            }
                        }
                    }
                )
            }
            .heightIn(min = 78.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(text = label, style = AuraType.label)
            Text(
                text = valueText ?: ghostText,
                style = AuraType.number(32.sp, weight),
                color = if (valueText == null) AuraColors.InkFaint else AuraColors.Ink,
                maxLines = 1
            )
        }
        Text(
            text = "‹",
            color = AuraColors.InkFaint,
            fontSize = 20.sp,
            modifier = Modifier
                .align(Alignment.CenterStart)
                .padding(start = 4.dp)
        )
        Text(
            text = "›",
            color = AuraColors.InkFaint,
            fontSize = 20.sp,
            modifier = Modifier
                .align(Alignment.CenterEnd)
                .padding(end = 4.dp)
        )
    }
}

/** Campo plano (sin contorno Material) para notas y variantes. */
@Composable
fun FlatField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    singleLine: Boolean = true,
    keyboardType: KeyboardType = KeyboardType.Text,
    minHeight: Dp = 48.dp
) {
    Column(
        modifier = modifier
            .clip(ModuleShape)
            .background(AuraColors.Ink.copy(alpha = 0.06f))
            .heightIn(min = minHeight)
            .padding(horizontal = 12.dp, vertical = 8.dp)
    ) {
        Text(text = label.uppercase(), style = AuraType.label)
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            singleLine = singleLine,
            textStyle = AuraType.body.copy(fontWeight = FontWeight.SemiBold),
            cursorBrush = SolidColor(AuraColors.Ink),
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
            modifier = Modifier.fillMaxWidth()
        )
    }
}

// ───────────────────────── Atmósfera AGSL ─────────────────────────

private const val ATMOSPHERE_AGSL = """
uniform float2 size;
uniform float time;
uniform float ratio;
uniform float3 accent;

half4 main(float2 fc) {
    float2 uv = fc / size;
    float asp = size.x / size.y;
    float2 p = float2(uv.x * asp, uv.y) * 2.4;
    float t = time * 0.35;
    float w = sin(p.x * 2.1 + t * 1.2) * 0.5 + sin(p.y * 1.7 - t * 0.9 + p.x) * 0.5;
    w += sin((p.x - p.y) * 1.4 + t * 0.6) * 0.5;
    w = w / 3.0;
    float yb = 1.0 - uv.y;
    float surf = ratio * 0.9 + 0.05;
    float glow = 1.0 - smoothstep(surf - 0.25, surf + 0.35, yb + w * 0.18);
    float hot = 1.0 - smoothstep(surf - 0.02, surf + 0.05, yb + w * 0.10);
    float3 ink = float3(0.086, 0.094, 0.110);
    float3 c = ink + accent * (glow * 0.20 + hot * 0.13);
    float vig = 1.0 - smoothstep(0.2, 1.2, length(uv - 0.5));
    c *= 0.75 + 0.25 * vig;
    return half4(half3(c), 1.0);
}
"""

private fun createAtmosphereShader(): Any? = try {
    if (Build.VERSION.SDK_INT >= 33) newRuntimeShader() else null
} catch (_: Throwable) {
    null
}

@RequiresApi(33)
private fun newRuntimeShader(): Any = RuntimeShader(ATMOSPHERE_AGSL)

@RequiresApi(33)
private fun shaderBrushOf(shader: Any): ShaderBrush = ShaderBrush(shader as RuntimeShader)

@RequiresApi(33)
private fun DrawScope.drawAtmosphere(shader: Any, brush: ShaderBrush, time: Float, ratio: Float, accent: Color) {
    val s = shader as RuntimeShader
    s.setFloatUniform("size", size.width, size.height)
    s.setFloatUniform("time", time)
    s.setFloatUniform("ratio", ratio)
    s.setFloatUniform("accent", accent.red, accent.green, accent.blue)
    drawRect(brush)
}

/** Fondo fluido por shader: el "líquido" baja con el tiempo restante y vira de color por fase. */
@Composable
fun AtmosphereBackground(
    ratio: Float,
    accent: Color,
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit
) {
    var time by remember { mutableFloatStateOf(0f) }
    LaunchedEffect(Unit) {
        val start = withFrameNanos { it }
        while (true) {
            withFrameNanos { time = (it - start) / 1_000_000_000f }
        }
    }
    val shader = remember { createAtmosphereShader() }
    Box(
        modifier = modifier.drawWithCache {
            val brush = if (Build.VERSION.SDK_INT >= 33 && shader != null) shaderBrushOf(shader) else null
            onDrawBehind {
                if (brush != null && shader != null && Build.VERSION.SDK_INT >= 33) {
                    drawAtmosphere(shader, brush, time, ratio, accent)
                } else {
                    drawRect(
                        Brush.verticalGradient(
                            listOf(AuraColors.Ink, lerp(AuraColors.Ink, accent, 0.30f))
                        )
                    )
                }
            }
        },
        content = content
    )
}
