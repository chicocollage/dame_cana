package com.damecana.app.ui

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.DeviceFontFamilyName
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

object AuraColors {
    val Stone = Color(0xFFEAE4D7)
    val StoneDeep = Color(0xFFDFD9CA)
    val Paper = Color(0xFFF4F0E6)
    val Input = Color(0xFFEFECE2)
    val Ink = Color(0xFF16181C)
    val InkSoft = Color(0xFF5A5852)
    val InkFaint = Color(0xFFA6A195)
    val Lime = Color(0xFFE03C1F)
    val Orange = Color(0xFFE03C1F)
    val Forest = Color(0xFF1E4D3B)
    val Amber = Color(0xFFD97706)
    val CyanPill = Color(0xFFE4E0D3)
    val DoneSolar = Color(0xFFF4DE4D)
    val DoneSolarCell = Color(0xFFFAF09B)
}

object AuraDimens {
    val CardRadius: Dp = 2.dp
    val InkBorder: Dp = 1.5.dp
    val MinTouchTarget: Dp = 48.dp
    val MedallionSize: Dp = 104.dp
}

/** Fuente "variable": el peso se ajusta al esfuerzo. Cacheado por tramos de 100 para no recrear familias. */
private val numeralFamilies = HashMap<Int, FontFamily>()

@OptIn(ExperimentalTextApi::class)
fun auraNumeralFamily(weight: Int): FontFamily {
    val w = ((weight.coerceIn(100, 900) + 50) / 100) * 100
    return numeralFamilies.getOrPut(w) {
        FontFamily(
            Font(
                familyName = DeviceFontFamilyName("sans-serif"),
                weight = FontWeight(w),
                variationSettings = FontVariation.Settings(FontVariation.weight(w), FontVariation.width(100f))
            )
        )
    }
}

object AuraType {
    val label = TextStyle(
        fontFamily = FontFamily.Monospace,
        fontWeight = FontWeight.SemiBold,
        fontSize = 10.sp,
        lineHeight = 13.sp,
        letterSpacing = 0.9.sp,
        color = AuraColors.InkSoft
    )
    val chip = TextStyle(
        fontFamily = FontFamily.Monospace,
        fontWeight = FontWeight.Bold,
        fontSize = 12.sp,
        lineHeight = 15.sp,
        letterSpacing = 0.5.sp,
        color = AuraColors.Ink
    )
    val title = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Black,
        fontSize = 26.sp,
        lineHeight = 27.sp,
        letterSpacing = (-0.6).sp,
        color = AuraColors.Ink
    )
    val heading = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 17.sp,
        lineHeight = 21.sp,
        letterSpacing = (-0.2).sp,
        color = AuraColors.Ink
    )
    val body = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        color = AuraColors.Ink
    )

    fun number(size: TextUnit, weight: Int): TextStyle = TextStyle(
        fontFamily = auraNumeralFamily(weight),
        fontSize = size,
        lineHeight = size * 1.1f,
        letterSpacing = (-1).sp,
        fontFeatureSettings = "tnum",
        color = AuraColors.Ink
    )
}

private val AuraColorScheme = lightColorScheme(
    primary = AuraColors.Ink,
    onPrimary = AuraColors.Input,
    primaryContainer = AuraColors.Lime,
    onPrimaryContainer = AuraColors.Paper,
    secondary = AuraColors.Orange,
    onSecondary = AuraColors.Paper,
    secondaryContainer = AuraColors.CyanPill,
    onSecondaryContainer = AuraColors.Ink,
    background = AuraColors.Stone,
    onBackground = AuraColors.Ink,
    surface = AuraColors.Paper,
    onSurface = AuraColors.Ink,
    surfaceVariant = AuraColors.Input,
    onSurfaceVariant = AuraColors.InkSoft,
    outline = AuraColors.Ink,
    outlineVariant = AuraColors.InkFaint
)

private val AuraShapes = Shapes(
    extraSmall = RoundedCornerShape(3.dp),
    small = RoundedCornerShape(4.dp),
    medium = RoundedCornerShape(6.dp),
    large = RoundedCornerShape(8.dp)
)

private val AuraTypography = Typography(
    headlineMedium = AuraType.title,
    titleMedium = AuraType.heading,
    bodyMedium = AuraType.body,
    labelMedium = AuraType.label
)

@Composable
fun AuraTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = AuraColorScheme,
        shapes = AuraShapes,
        typography = AuraTypography,
        content = content
    )
}
