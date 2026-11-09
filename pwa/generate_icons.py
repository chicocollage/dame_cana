import math
import subprocess
from pathlib import Path
from PIL import Image

ROOT = Path(r"C:\Users\Daniel\Proyectos\01_biomecanica\dame-cana\pwa")
APP_DIR = ROOT / "public" / "app"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

def make_grip_path(center_x, center_y, r_inner, r_outer, start_deg, end_deg):
    rad_s = math.radians(start_deg)
    rad_e = math.radians(end_deg)
    
    x_o1 = center_x + r_outer * math.cos(rad_s)
    y_o1 = center_y + r_outer * math.sin(rad_s)
    x_o2 = center_x + r_outer * math.cos(rad_e)
    y_o2 = center_y + r_outer * math.sin(rad_e)
    
    x_i2 = center_x + r_inner * math.cos(rad_e)
    y_i2 = center_y + r_inner * math.sin(rad_e)
    x_i1 = center_x + r_inner * math.cos(rad_s)
    y_i1 = center_y + r_inner * math.sin(rad_s)
    
    cap_r = (r_outer - r_inner) / 2
    
    return (
        f"M {x_o1:.2f} {y_o1:.2f} "
        f"A {r_outer} {r_outer} 0 0 1 {x_o2:.2f} {y_o2:.2f} "
        f"A {cap_r:.2f} {cap_r:.2f} 0 0 1 {x_i2:.2f} {y_i2:.2f} "
        f"A {r_inner} {r_inner} 0 0 0 {x_i1:.2f} {y_i1:.2f} "
        f"A {cap_r:.2f} {cap_r:.2f} 0 0 1 {x_o1:.2f} {y_o1:.2f} Z"
    )

left_grip = make_grip_path(256, 256, 142, 172, 154, 206)
right_grip = make_grip_path(256, 256, 142, 172, -26, 26)

ticks = []
for deg in range(0, 360, 30):
    if (145 <= deg <= 215) or (deg <= 35 or deg >= 325):
        continue
    rad = math.radians(deg)
    x1 = 256 + 185 * math.cos(rad)
    y1 = 256 + 185 * math.sin(rad)
    x2 = 256 + 196 * math.cos(rad)
    y2 = 256 + 196 * math.sin(rad)
    ticks.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="#c9ff4a" stroke-width="3" stroke-linecap="round" opacity="0.8"/>')
ticks_svg = "\n    ".join(ticks)

svg_template = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="plateGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1e2720" />
      <stop offset="70%" stop-color="#121814" />
      <stop offset="100%" stop-color="#080c09" />
    </radialGradient>
    <radialGradient id="hubGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#324436" />
      <stop offset="55%" stop-color="#1f2b22" />
      <stop offset="100%" stop-color="#0e1410" />
    </radialGradient>
    
    <!-- Top arc: left to right over the top -->
    <path id="topArc" d="M 115 256 A 141 141 0 0 1 397 256" fill="none" />
    <!-- Bottom arc: concentric at R=152 -->
    <path id="bottomArc" d="M 148 376 A 152 152 0 0 0 364 376" fill="none" />
  </defs>

  <!-- Background container -->
  <rect width="512" height="512" rx="{{RX}}" fill="#0a0f0c" />

  <!-- Outer Plate Body (Calibrated Olympic Plate) -->
  <circle cx="256" cy="256" r="204" fill="url(#plateGrad)" stroke="#222d25" stroke-width="5" />
  
  <!-- Outer Calibrated Rim / Chamfer -->
  <circle cx="256" cy="256" r="196" fill="none" stroke="#c9ff4a" stroke-width="3.5" opacity="0.9" />
  <circle cx="256" cy="256" r="185" fill="none" stroke="#232e26" stroke-width="1.5" />

  <!-- Calibration Notches -->
  <g>
    {ticks_svg}
  </g>

  <!-- Dual Precision Grip Handles (Left & Right) -->
  <path d="{left_grip}" fill="#0a0f0c" stroke="#c9ff4a" stroke-width="3" stroke-linejoin="round" />
  <path d="{right_grip}" fill="#0a0f0c" stroke="#c9ff4a" stroke-width="3" stroke-linejoin="round" />

  <!-- Recessed Center Hub Area -->
  <circle cx="256" cy="256" r="124" fill="#0e1410" stroke="#253227" stroke-width="2.5" />

  <!-- Top Lettering: DAME CAÑA -->
  <text font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" 
        font-size="28" font-weight="900" letter-spacing="5" fill="#f4f5ef" text-anchor="middle">
    <textPath href="#topArc" startOffset="50%">DAME CAÑA</textPath>
  </text>

  <!-- Bottom Lettering: DC LOG -->
  <text font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" 
        font-size="20" font-weight="900" letter-spacing="6" fill="#c9ff4a" text-anchor="middle">
    <textPath href="#bottomArc" startOffset="50%">DC LOG</textPath>
  </text>

  <!-- Central Steel Collar Hub (Bushing insert) -->
  <circle cx="256" cy="256" r="76" fill="url(#hubGrad)" stroke="#c9ff4a" stroke-width="3.5" />
  <circle cx="256" cy="256" r="62" fill="#0a0f0c" stroke="#3b4d40" stroke-width="2" />

  <!-- Center DC Brand Mark -->
  <text x="256" y="276" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
        font-size="46" font-weight="950" letter-spacing="2" fill="#c9ff4a" text-anchor="middle">DC</text>
</svg>'''

svg_standard = svg_template.replace("{RX}", "128")
svg_maskable = svg_template.replace("{RX}", "0")

(APP_DIR / "icon.svg").write_text(svg_standard, encoding="utf-8")

def render_html(svg_str, output_path):
    html_content = f'''<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  html, body {{ width: 512px; height: 512px; overflow: hidden; background: transparent; }}
  svg {{ display: block; width: 512px; height: 512px; }}
</style>
</head>
<body>
{svg_str}
</body>
</html>'''
    temp_html = APP_DIR / "_temp_icon.html"
    temp_html.write_text(html_content, encoding="utf-8")
    
    cmd = [
        CHROME,
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--window-size=512,512",
        "--default-background-color=00000000",
        f"--screenshot={str(output_path)}",
        temp_html.as_uri()
    ]
    subprocess.run(cmd, check=True)
    temp_html.unlink(missing_ok=True)

# 1. Render standard 512x512
icon512_path = APP_DIR / "icon-512.png"
render_html(svg_standard, icon512_path)
render_html(svg_standard, APP_DIR / "dclog-icon-512.png")

# 2. Render maskable 512x512
icon_maskable_path = APP_DIR / "icon-maskable-512.png"
render_html(svg_maskable, icon_maskable_path)
render_html(svg_maskable, APP_DIR / "dclog-maskable-512.png")

# 3. Create 192x192 and apple-touch-icon
with Image.open(icon512_path) as im:
    im192 = im.resize((192, 192), Image.Resampling.LANCZOS)
    im192.save(APP_DIR / "icon-192.png", format="PNG")
    im192.save(APP_DIR / "dclog-icon-192.png", format="PNG")
    
    im_apple = im.resize((180, 180), Image.Resampling.LANCZOS)
    im_apple.save(APP_DIR / "apple-touch-icon.png", format="PNG")
    im_apple.save(APP_DIR / "dclog-apple-touch-icon.png", format="PNG")

(APP_DIR / "dclog-icon.svg").write_text(svg_standard, encoding="utf-8")
(ROOT / "public" / "favicon.svg").write_text(svg_standard, encoding="utf-8")

print("Regenerated cleanly.")
