import os
from PIL import Image, ImageDraw, ImageFont

def draw_letter_spaced_text(draw, text, font, fill, y, cx, spacing=8):
    total_width = sum(font.getbbox(char)[2] - font.getbbox(char)[0] for char in text) + spacing * (len(text) - 1)
    x = cx - (total_width // 2)

    for char in text:
        char_w = font.getbbox(char)[2] - font.getbbox(char)[0]
        draw.text((x, y), char, font=font, fill=fill)
        x += char_w + spacing

def draw_centered_text(draw, text, font, fill, y, cx, shadow_color=None, shadow_offset=(0, 2)):
    bbox = font.getbbox(text)
    w = bbox[2] - bbox[0]
    x = cx - (w // 2)
    if shadow_color:
        draw.text((x + shadow_offset[0], y + shadow_offset[1]), text, font=font, fill=shadow_color)
    draw.text((x, y), text, font=font, fill=fill)

def draw_down_chevron(draw, cx, cy, size=20, stroke=5, color=(184, 93, 67)):
    points_left = [(cx - size, cy - size // 2), (cx, cy + size // 2)]
    points_right = [(cx, cy + size // 2), (cx + size, cy - size // 2)]
    draw.line(points_left, fill=color, width=stroke)
    draw.line(points_right, fill=color, width=stroke)

def create_base_canvas():
    bg_path = 'public/assets/stationery-watercolor-bg.jpg'
    im = Image.open(bg_path).convert('RGB')

    target_w, target_h = 1200, 630
    orig_w, orig_h = im.size
    scale = max(target_w / orig_w, target_h / orig_h)
    new_w = int(orig_w * scale)
    new_h = int(orig_h * scale)
    im_resized = im.resize((new_w, new_h), Image.Resampling.LANCZOS)

    canvas = im_resized.crop((0, 0, target_w, target_h))

    overlay = Image.new('RGBA', (target_w, target_h), (255, 255, 255, 0))
    ov_draw = ImageDraw.Draw(overlay)
    ov_draw.rounded_rectangle([24, 24, target_w - 24, target_h - 24], radius=16, outline=(232, 203, 195, 140), width=2)
    ov_draw.rounded_rectangle([32, 32, target_w - 32, target_h - 32], radius=12, outline=(193, 119, 103, 60), width=1)

    canvas = Image.alpha_composite(canvas.convert('RGBA'), overlay).convert('RGB')
    return canvas

def main():
    fonts_dir = 'scripts/fonts'
    font_cinzel_header = ImageFont.truetype(os.path.join(fonts_dir, 'Cinzel-Bold.ttf'), 28)
    font_cinzel_sub = ImageFont.truetype(os.path.join(fonts_dir, 'Cinzel-Regular.ttf'), 23)
    font_cinzel_small = ImageFont.truetype(os.path.join(fonts_dir, 'Cinzel-Regular.ttf'), 17)
    font_script_huge = ImageFont.truetype(os.path.join(fonts_dir, 'GreatVibes-Regular.ttf'), 118)
    font_script_medium = ImageFont.truetype(os.path.join(fonts_dir, 'GreatVibes-Regular.ttf'), 102)

    COLOR_TERRACOTTA = (184, 93, 67)
    COLOR_CHARCOAL = (55, 45, 40)
    COLOR_TAUPE = (125, 110, 102)
    CX = 695

    # 1. CARD CONVITE (og-convite.jpg)
    card1 = create_base_canvas()
    draw1 = ImageDraw.Draw(card1)
    draw_letter_spaced_text(draw1, "CONVITE · DEMO", font_cinzel_header, COLOR_TAUPE, 130, CX, spacing=8)
    draw_centered_text(draw1, "Anita & Giuseppe", font_script_huge, COLOR_TERRACOTTA, 195, CX)
    draw_letter_spaced_text(draw1, "18 · SETEMBRO · 2027", font_cinzel_sub, COLOR_CHARCOAL, 365, CX, spacing=6)
    draw_letter_spaced_text(draw1, "PETRÓPOLIS · RIO DE JANEIRO", font_cinzel_small, COLOR_TAUPE, 410, CX, spacing=4)
    draw_down_chevron(draw1, CX, 485, size=22, stroke=5, color=COLOR_TERRACOTTA)
    card1.save('public/assets/og-convite.jpg', 'JPEG', quality=92, optimize=True)

    # 2. CARD PAINEL DOS NOIVOS (og-painel-noivos.jpg)
    card2 = create_base_canvas()
    draw2 = ImageDraw.Draw(card2)
    draw_letter_spaced_text(draw2, "ÁREA DOS NOIVOS", font_cinzel_header, COLOR_TAUPE, 130, CX, spacing=8)
    draw_centered_text(draw2, "Painel dos Noivos", font_script_medium, COLOR_TERRACOTTA, 205, CX)
    draw_letter_spaced_text(draw2, "ANITA & GIUSEPPE · DEMO", font_cinzel_sub, COLOR_CHARCOAL, 365, CX, spacing=6)
    draw_letter_spaced_text(draw2, "CONFIRMAÇÕES (RSVP) · RECADOS · PRESENTES", font_cinzel_small, COLOR_TAUPE, 410, CX, spacing=4)
    draw_down_chevron(draw2, CX, 485, size=22, stroke=5, color=COLOR_TERRACOTTA)
    card2.save('public/assets/og-painel-noivos.jpg', 'JPEG', quality=92, optimize=True)

    # 3. CARD CERIMONIALISTA (og-painel-cerimonialista.jpg)
    card3 = create_base_canvas()
    draw3 = ImageDraw.Draw(card3)
    draw_letter_spaced_text(draw3, "CERIMONIAL & ASSESSORIA", font_cinzel_header, COLOR_TAUPE, 130, CX, spacing=8)
    draw_centered_text(draw3, "Portal da Cerimonialista", font_script_medium, COLOR_TERRACOTTA, 205, CX)
    draw_letter_spaced_text(draw3, "ANITA & GIUSEPPE · DEMO", font_cinzel_sub, COLOR_CHARCOAL, 365, CX, spacing=6)
    draw_letter_spaced_text(draw3, "CHECK-IN · MAPA DE MESAS · RELATÓRIOS PDF", font_cinzel_small, COLOR_TAUPE, 410, CX, spacing=4)
    draw_down_chevron(draw3, CX, 485, size=22, stroke=5, color=COLOR_TERRACOTTA)
    card3.save('public/assets/og-painel-cerimonialista.jpg', 'JPEG', quality=92, optimize=True)

    # 4. CARD MESA DOS CONVIDADOS (og-mesa-convidados.jpg)
    card4 = create_base_canvas()
    draw4 = ImageDraw.Draw(card4)
    draw_letter_spaced_text(draw4, "ESPECIAL DO DIA · DEMO", font_cinzel_header, COLOR_TAUPE, 130, CX, spacing=8)
    draw_centered_text(draw4, "Bem-vindos à Nossa Mesa", font_script_medium, COLOR_TERRACOTTA, 205, CX)
    draw_letter_spaced_text(draw4, "ANITA & GIUSEPPE · 18.09.2027", font_cinzel_sub, COLOR_CHARCOAL, 365, CX, spacing=6)
    draw_letter_spaced_text(draw4, "NOSSA HISTÓRIA · FOTOS & RECADOS · PRESENTES", font_cinzel_small, COLOR_TAUPE, 410, CX, spacing=4)
    draw_down_chevron(draw4, CX, 485, size=22, stroke=5, color=COLOR_TERRACOTTA)
    card4.save('public/assets/og-mesa-convidados.jpg', 'JPEG', quality=92, optimize=True)

    print("Generated all 4 Demo OG cards successfully.")

if __name__ == '__main__':
    main()
