"""Render the DooGo commercial picture track (silent) to out/picture.mp4.

Clips are decoded through ffmpeg (their own audio is dropped), zoomed and
graded, then chat bubbles, narrator captions, prototype step chips, push
notifications and animated prototype screens are composited frame by frame.
"""
import json
import math
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from timeline import (APP_BG, ASSETS, BANNERS, BEATS, BORDER, CHIPS, CRIMSON, FPS, H, ICON_BG, LINES, OUT,
                      ROLE, SEGMENTS, SURFACE, TEXT, TEXT_2, TINT, TITLES, TOTAL, W, clip)

FONT_DIR = os.path.join(ASSETS, "fonts")
UI = os.path.join(ASSETS, "ui")
VO = json.load(open(os.path.join(ASSETS, "vo", "lines.json")))


def font(weight, size):
    return ImageFont.truetype(os.path.join(FONT_DIR, f"Inter-{weight}.ttf"), size)


# ---------------------------------------------------------------- easing utils
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def ease_out(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


def ease_io(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def back_out(x):
    x = clamp(x)
    c = 1.70158
    return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2


def rrect(size, radius, fill, outline=None, width=0):
    im = Image.new("RGBA", size, (0, 0, 0, 0))
    ImageDraw.Draw(im).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius, fill=fill, outline=outline,
                                         width=width)
    return im


def shadowed(im, blur=18, offset=(0, 10), alpha=70, pad=40):
    """Return im on a transparent canvas with a soft drop shadow; also the paste offset."""
    w, h = im.size
    can = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    sh = Image.new("RGBA", can.size, (0, 0, 0, 0))
    a = im.split()[3].point(lambda v: v * alpha // 255)
    sh.paste((0, 0, 0, 255), (pad + offset[0], pad + offset[1]), a)
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    can.alpha_composite(sh)
    can.alpha_composite(im, (pad, pad))
    return can, pad


def paste_center(base, im, cx, cy, scale=1.0, alpha=1.0):
    if alpha <= 0.01 or scale <= 0.01:
        return
    if abs(scale - 1) > 0.002:
        im = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.BICUBIC)
    if alpha < 0.999:
        a = im.split()[3].point(lambda v: int(v * alpha))
        im = im.copy()
        im.putalpha(a)
    base.alpha_composite(im, (int(cx - im.width / 2), int(cy - im.height / 2)))


def wrap(text, fnt, maxw):
    words, lines, cur = text.split(), [], ""
    for w_ in words:
        t = (cur + " " + w_).strip()
        if fnt.getlength(t) <= maxw or not cur:
            cur = t
        else:
            lines.append(cur)
            cur = w_
    if cur:
        lines.append(cur)
    return lines


# ------------------------------------------------------------- overlay assets
def make_bubble(text, role, tail="down", dark=False):
    """Speech bubble in the DooGo style with a role tag. Returns (img, tail_tip_xy)."""
    f = font("SemiBold", 40)
    lines = wrap(text, f, 620)
    lh = 52
    tw = max(f.getlength(l) for l in lines)
    bw, bh = int(tw + 64), int(lh * len(lines) + 44)
    tag_f = font("Bold", 24)
    tag_w = int(tag_f.getlength(role.upper()) + 36) if role else 0
    tail_h = 26
    cw, ch = max(bw, tag_w + 30), bh + 24 + tail_h
    im = Image.new("RGBA", (cw + 4, ch + 4), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    fill = CRIMSON if dark else SURFACE
    txt = SURFACE if dark else TEXT
    top = 24
    d.rounded_rectangle([0, top, bw, top + bh], 30, fill=fill + (255,))
    # tail
    if tail == "down":
        tx = 70
        d.polygon([(tx, top + bh - 2), (tx + 40, top + bh - 2), (tx + 4, top + bh + tail_h)], fill=fill + (255,))
        tip = (tx + 4, top + bh + tail_h)
    elif tail == "left":
        ty = top + bh // 2
        d.polygon([(2, ty - 18), (2, ty + 18), (-24 + 2, ty + 4)], fill=fill + (255,))
        tip = (0, ty)
    else:
        tip = (bw // 2, top + bh)
    for i, l in enumerate(lines):
        d.text((32, top + 22 + i * lh), l, font=f, fill=txt)
    if not role:
        return im, tip
    # role tag
    tag_fill = SURFACE if dark else CRIMSON
    tag_txt = CRIMSON if dark else SURFACE
    d.rounded_rectangle([22, 0, 22 + tag_w, 44], 22, fill=tag_fill + (255,))
    d.text((22 + 18, 9), role.upper(), font=tag_f, fill=tag_txt)
    return im, tip


def make_chip(text, step=None):
    f = font("SemiBold", 34)
    tw = int(f.getlength(text))
    w_, h_ = tw + 120, 76
    im = rrect((w_, h_), 38, SURFACE + (245,))
    d = ImageDraw.Draw(im)
    d.ellipse([14, 14, 62, 62], fill=ICON_BG)
    draw_drop(d, 38, 38, 15, CRIMSON)
    d.text((80, 18), text, font=f, fill=CRIMSON)
    return shadowed(im, blur=14, offset=(0, 6), alpha=60, pad=30)[0]


def draw_drop(d, cx, cy, r, color, width=0):
    """Blood drop icon."""
    pts = []
    for i in range(0, 361, 8):
        a = math.radians(i)
        pts.append((cx + r * math.sin(a), cy + r * 0.25 + r * math.cos(a) * 0.85))
    d.polygon([(cx, cy - r * 1.35), (cx - r * 0.9, cy + r * 0.05), (cx + r * 0.9, cy + r * 0.05)], fill=color)
    d.ellipse([cx - r * 0.95, cy - r * 0.55, cx + r * 0.95, cy + r * 1.3], fill=color)


def make_app_icon(size):
    im = rrect((size, size), int(size * 0.24), CRIMSON + (255,))
    d = ImageDraw.Draw(im)
    draw_drop(d, size / 2, size / 2 - size * 0.04, size * 0.24, SURFACE)
    return im


def make_banner(title, body):
    w_, h_ = 900, 150
    im = rrect((w_, h_), 34, (255, 255, 255, 250))
    d = ImageDraw.Draw(im)
    im.alpha_composite(make_app_icon(78), (30, 36))
    d.text((128, 26), "DooGo", font=font("SemiBold", 26), fill=TEXT_2)
    d.text((w_ - 80, 26), "now", font=font("Medium", 24), fill=TEXT_2)
    d.text((128, 58), title, font=font("Bold", 34), fill=TEXT)
    d.text((128, 102), body, font=font("Medium", 26), fill=TEXT_2)
    return shadowed(im, blur=22, offset=(0, 14), alpha=90, pad=50)[0]


def logo_rgba():
    im = Image.open(os.path.join(UI, "logo.png")).convert("RGBA")
    a = np.array(im).astype(np.int16)
    rgb = a[..., :3]
    mx, mn = rgb.max(-1), rgb.min(-1)
    # the export sits on a light grey card; key the near-white, low-saturation pixels out
    light = (mn > 222) & ((mx - mn) < 18)
    alpha = np.where(light, 0, 255)
    soft = (mn > 200) & ((mx - mn) < 18) & ~light
    alpha = np.where(soft, ((235 - mn) * 255 / 35).clip(0, 255), alpha)
    a[..., 3] = alpha
    return Image.fromarray(a.astype(np.uint8), "RGBA")


# -------------------------------------------------------------- phone mockup
SCR_W, SCR_H = 402, 874
PH_SCALE = 1.1
BEZEL = 16


def screen(name):
    return Image.open(os.path.join(UI, name + ".png")).convert("RGBA").resize((SCR_W, SCR_H), Image.LANCZOS)


def phone_frame(screen_img, scale=PH_SCALE):
    sw, sh = int(SCR_W * scale), int(SCR_H * scale)
    s = screen_img.resize((sw, sh), Image.LANCZOS)
    mask = Image.new("L", (sw, sh), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, sw - 1, sh - 1], 46, fill=255)
    pw, ph = sw + BEZEL * 2, sh + BEZEL * 2
    body = rrect((pw, ph), 62, (28, 28, 30, 255))
    body.paste(s, (BEZEL, BEZEL), mask)
    d = ImageDraw.Draw(body)
    d.rounded_rectangle([pw / 2 - 58, BEZEL + 12, pw / 2 + 58, BEZEL + 44], 16, fill=(10, 10, 10, 255))
    return body


def chat_base():
    """Prototype CHAT CONVERSATION screen with its sample messages cleared."""
    im = screen("chat")
    d = ImageDraw.Draw(im)
    bg = im.getpixel((200, 140))
    d.rectangle([0, 107, SCR_W, 776], fill=bg)
    return im, bg


def draw_chat(im, msgs, typing=None):
    """msgs: list of (side, text, alpha, rise). side 'me' (crimson, right) or 'them' (tinted, left)."""
    d = ImageDraw.Draw(im)
    f = font("Regular", 15)
    y = 140
    for side, text, a, rise in msgs:
        if a <= 0:
            continue
        lines = wrap(text, f, 220)
        bw = int(max(f.getlength(l) for l in lines) + 28)
        bh = 20 * len(lines) + 40
        x = SCR_W - 20 - bw if side == "me" else 20
        yy = y + int((1 - rise) * 20)
        layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        if side == "me":
            ld.rounded_rectangle([x, yy, x + bw, yy + bh], 12, fill=CRIMSON + (255,))
            col, tcol = SURFACE, (255, 220, 224)
        else:
            ld.rounded_rectangle([x, yy, x + bw, yy + bh], 12, fill=TINT + (255,), outline=BORDER, width=1)
            col, tcol = TEXT, TEXT_2
        for i, l in enumerate(lines):
            ld.text((x + 14, yy + 12 + i * 20), l, font=f, fill=col)
        ld.text((x + bw - 58, yy + bh - 22), "2:31 PM", font=font("Regular", 12), fill=tcol)
        layer.putalpha(layer.split()[3].point(lambda v: int(v * a)))
        im.alpha_composite(layer)
        y += bh + 14
    if typing is not None:
        x, yy = 20, y
        d.rounded_rectangle([x, yy, x + 70, yy + 38], 12, fill=TINT, outline=BORDER, width=1)
        for i in range(3):
            ph = (typing * 3 - i * 0.35) % 1
            r = 4 + 1.5 * max(0, math.sin(ph * math.pi))
            cx = x + 20 + i * 15
            d.ellipse([cx - r, yy + 19 - r, cx + r, yy + 19 + r], fill=(160, 160, 165))
    return im


# ----------------------------------------------------------------- base video
def zoom_frame(img, z, cx, cy):
    if z <= 1.0005:
        return img
    cw, ch = W / z, H / z
    x0 = clamp(cx * W - cw / 2, 0, W - cw)
    y0 = clamp(cy * H - ch / 2, 0, H - ch)
    return img.resize((W, H), Image.BICUBIC, box=(x0, y0, x0 + cw, y0 + ch))


def seg_zoom(seg, lt):
    z0, z1, cx, cy = seg.get("zoom", (1, 1, 0.5, 0.5))
    z = z0 + (z1 - z0) * ease_io(lt / seg["dur"])
    if "punch" in seg:
        pt, amt = seg["punch"]
        lp = seg["start"] + lt - pt
        if lp > 0:
            z += amt * ease_out(lp / 0.25)
    return z, cx, cy


def map_anchor(seg, lt, ax, ay):
    z, cx, cy = seg_zoom(seg, lt)
    cw, ch = W / z, H / z
    x0 = clamp(cx * W - cw / 2, 0, W - cw)
    y0 = clamp(cy * H - ch / 2, 0, H - ch)
    return (ax * W - x0) * z, (ay * H - y0) * z


class ClipReader:
    def __init__(self, seg):
        speed = seg.get("speed", 1.0)
        src_dur = seg["dur"] * speed
        vf = (f"setpts=PTS/{speed},fps={FPS},scale={W}:{H}:flags=bicubic,"
              "eq=contrast=1.06:saturation=1.1:gamma=0.98,colorbalance=rm=0.03:bm=-0.03:rh=0.02")
        cmd = ["ffmpeg", "-v", "error", "-ss", str(seg["t_in"]), "-t", f"{src_dur + 0.5:.3f}", "-i", clip(seg["src"]),
               "-an", "-vf", vf, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
        self.p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
        self.last = None

    def read(self):
        buf = self.p.stdout.read(W * H * 3)
        if len(buf) == W * H * 3:
            self.last = Image.frombuffer("RGB", (W, H), buf, "raw", "RGB", 0, 1)
        return self.last

    def close(self):
        self.p.stdout.close()
        self.p.wait()


# ----------------------------------------------------------------- UI scenes
def soft_bg():
    bg = Image.new("RGB", (W, H), APP_BG)
    blob = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(blob)
    d.ellipse([-300, -350, 900, 700], fill=ICON_BG + (200,))
    d.ellipse([1300, 500, 2300, 1400], fill=ICON_BG + (170,))
    d.ellipse([1150, -250, 1650, 250], fill=(255, 238, 238, 140))
    blob = blob.filter(ImageFilter.GaussianBlur(120))
    bg = bg.convert("RGBA")
    bg.alpha_composite(blob)
    return bg


class UIScenes:
    def __init__(self):
        self.bg = soft_bg()
        self.logo = logo_rgba()
        self.scr = {n: screen(n) for n in ["received_requests", "request_details", "request_accepted", "messages"]}
        self.chat, self.chat_bg = chat_base()
        self.tag_cache = {}

    def phone_at(self, base, scr_img, cx, cy, enter=1.0):
        ph = phone_frame(scr_img)
        ph, pad = shadowed(ph, blur=30, offset=(0, 24), alpha=80, pad=60)
        y = cy + (1 - ease_out(enter)) * 120
        paste_center(base, ph, cx, y, alpha=ease_out(enter))
        return cx - ph.width / 2 + pad + BEZEL, y - ph.height / 2 + pad + BEZEL  # screen origin

    @staticmethod
    def slide(a, b, p):
        """Push transition inside the phone: b slides in from the right."""
        p = ease_io(p)
        out = Image.new("RGBA", (SCR_W, SCR_H), APP_BG + (255,))
        out.alpha_composite(a, (int(-p * SCR_W * 0.35), 0))
        shade = b.copy()
        out.alpha_composite(shade, (int((1 - p) * SCR_W), 0))
        return out

    @staticmethod
    def ripple(scr_img, x, y, p):
        if not 0 <= p <= 1:
            return scr_img
        im = scr_img.copy()
        lay = Image.new("RGBA", im.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(lay)
        r = 10 + 40 * ease_out(p)
        a = int(120 * (1 - p))
        d.ellipse([x - r, y - r, x + r, y + r], fill=CRIMSON + (a,))
        d.ellipse([x - 11, y - 11, x + 11, y + 11], fill=(255, 255, 255, int(200 * (1 - p))),
                  outline=CRIMSON + (int(220 * (1 - p)),), width=3)
        im.alpha_composite(lay)
        return im

    def label(self, base, text, sub, t, x=1120, y=250):
        a = ease_out(t / 0.5)
        if a <= 0:
            return
        f1, f2 = font("ExtraBold", 64), font("Medium", 34)
        lay = Image.new("RGBA", (760, 200), (0, 0, 0, 0))
        d = ImageDraw.Draw(lay)
        d.text((0, 0), text, font=f1, fill=TEXT)
        d.text((2, 92), sub, font=f2, fill=TEXT_2)
        d.rounded_rectangle([2, 150, 92, 158], 4, fill=CRIMSON)
        paste_center(base, lay, x + 380 + (1 - a) * 40, y + 100, alpha=a)

    # --- Scene 3 brand moment
    def logo_scene(self, lt, dur):
        base = self.bg.copy()
        p = back_out(lt / 0.7)
        lg = self.logo.resize((int(self.logo.width * 1.7), int(self.logo.height * 1.7)), Image.LANCZOS)
        paste_center(base, lg, W / 2, H / 2 - 90, scale=0.6 + 0.4 * p, alpha=clamp(lt / 0.35))
        feats = ["Request Blood", "Find Donors", "Message & Connect"]
        chips = [make_chip(f) for f in feats]
        total = sum(c.width for c in chips) - 60 * 2
        x = W / 2 - total / 2
        for i, c in enumerate(chips):
            a = ease_out((lt - 0.7 - i * 0.18) / 0.4)
            paste_center(base, c, x + c.width / 2 - 30, H / 2 + 230 + (1 - a) * 30, alpha=a)
            x += c.width - 60
        return base

    # --- Scene 5 donor flow on the prototype
    def donor_scene(self, lt, dur):
        base = self.bg.copy()
        s_rr, s_rd, s_ra = self.scr["received_requests"], self.scr["request_details"], self.scr["request_accepted"]
        if lt < 2.2:
            sc = self.ripple(s_rr, 319, 236, (lt - 1.75) / 0.45)
        elif lt < 2.55:
            sc = self.slide(s_rr, s_rd, (lt - 2.2) / 0.35)
        elif lt < 9.2:
            sc = s_rd.copy()
            # highlight the blood type row (O+)
            g = clamp((lt - 2.6) / 0.3) * clamp((5.2 - lt) / 0.4)
            if g > 0:
                lay = Image.new("RGBA", sc.size, (0, 0, 0, 0))
                ImageDraw.Draw(lay).rounded_rectangle([30, 230, 372, 278], 12, outline=CRIMSON + (int(255 * g),),
                                                      width=3, fill=CRIMSON + (int(28 * g),))
                sc.alpha_composite(lay)
            sc = self.ripple(sc, 201, 600, (lt - 8.85) / 0.45)
        elif lt < 9.55:
            sc = self.slide(s_rd, s_ra, (lt - 9.2) / 0.35)
        else:
            sc = s_ra
        enter = lt / 0.6
        self.phone_at(base, sc, 640, H / 2 + 10, enter)
        if lt < 2.4:
            self.label(base, "New request", "A student nearby needs O+ blood.", lt - 0.3)
        elif lt < 9.3:
            self.label(base, "Request Details", "Blood type, quantity, location, reason.", lt - 2.4)
        else:
            self.label(base, "Request Accepted", "The student is notified right away.", lt - 9.3)
        return base

    # --- Scene 7 messaging
    def chat_scene(self, lt, dur):
        base = self.bg.copy()
        msgs = []
        t_me, t_them = 1.6, 4.3
        if lt >= t_me:
            p = ease_out((lt - t_me) / 0.35)
            msgs.append(("me", "Thank you so much. You really helped us.", p, p))
        if lt >= t_them:
            p = ease_out((lt - t_them) / 0.35)
            msgs.append(("them", "Of course. I'm glad I could help.", p, p))
        typing = (lt - 3.3) if 3.3 <= lt < t_them else None
        ch = draw_chat(self.chat.copy(), msgs, typing)
        if lt < 1.2:
            sc = self.ripple(self.scr["messages"], 200, 150, (lt - 0.8) / 0.4)
        elif lt < 1.5:
            sc = self.slide(self.scr["messages"], ch, (lt - 1.2) / 0.3)
        else:
            sc = ch
        self.phone_at(base, sc, 640, H / 2 + 10, lt / 0.5)
        self.label(base, "Messages", "Seekers and donors connect directly.", lt - 0.2)
        return base

    # --- Scene 8 end card
    def end_scene(self, lt, dur):
        base = Image.new("RGBA", (W, H), APP_BG + (255,))
        base.alpha_composite(self.bg)
        p = back_out(lt / 0.8)
        lg = self.logo.resize((int(self.logo.width * 2.0), int(self.logo.height * 2.0)), Image.LANCZOS)
        paste_center(base, lg, W / 2, H / 2 - 80, scale=0.7 + 0.3 * p, alpha=clamp(lt / 0.4))
        a = ease_out((lt - 0.7) / 0.6)
        f = font("Bold", 58)
        txt = "Connecting Donors, Saving Lives."
        lay = Image.new("RGBA", (int(f.getlength(txt)) + 10, 90), (0, 0, 0, 0))
        ImageDraw.Draw(lay).text((0, 0), txt, font=f, fill=CRIMSON)
        paste_center(base, lay, W / 2, H / 2 + 210 + (1 - a) * 20, alpha=a)
        lw = 220 * ease_out((lt - 1.0) / 0.6)
        if lw > 1:
            ImageDraw.Draw(base).rounded_rectangle([W / 2 - lw / 2, H / 2 + 275, W / 2 + lw / 2, H / 2 + 283], 4,
                                                   fill=CRIMSON)
        return base

    def render(self, scene, lt, dur):
        return getattr(self, scene + "_scene")(lt, dur)


# ------------------------------------------------------------ overlay layers
class Overlays:
    def __init__(self):
        self.bubbles = {}
        for ln in LINES:
            if ln["who"] == "narrator" or not ln.get("bubble", True):
                continue
            who, text, d = VO[ln["key"]]
            text = ln.get("text", text)
            d = ln.get("show", ln.get("fit", d))
            tail = "down" if ln.get("seg") is not None else "left"
            role = "" if ln["who"] == "seeker" else ROLE[ln["who"]]
            img, tip = make_bubble(text, role, tail=tail, dark=(ln["who"] == "seeker"))
            sh, pad = shadowed(img, blur=16, offset=(0, 8), alpha=70, pad=40)
            self.bubbles[ln["key"]] = (sh, (tip[0] + pad, tip[1] + pad), d)
        self.chips = {c[2]: make_chip(c[2]) for c in CHIPS}
        self.banners = [make_banner(b["title"], b["body"]) for b in BANNERS]
        yy, xx = np.mgrid[0:H, 0:W]
        r = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
        self.vig = (clamp_arr((r - 0.55) / 0.75) ** 1.6)[..., None].astype(np.float32)
        self.title_font = font("ExtraBold", 60)
        self.cap_font = font("Medium", 40)

    # chat bubble pinned to the speaker
    def bubble(self, base, ln, t, seg_lookup):
        sh, tip, d = self.bubbles[ln["key"]]
        t0, t1 = ln["t"] - 0.12, ln["t"] + max(d, 1.1) + 0.45
        if not (t0 <= t <= t1):
            return
        p_in = back_out((t - t0) / 0.28)
        a = clamp((t - t0) / 0.15) * clamp((t1 - t) / 0.22)
        if ln.get("seg") is not None:
            seg = SEGMENTS[ln["seg"]]
            ax, ay = map_anchor(seg, t - seg["start"], *ln["anchor"])
            ay -= 70  # keep the tail just above the head
            x0, y0 = ax - tip[0], ay - tip[1]
            x0 = clamp(x0, 30 - 40, W - sh.width + 10)
            y0 = clamp(y0, 10, H - sh.height - 150)
            s = 0.75 + 0.25 * p_in
            img = sh.resize((int(sh.width * s), int(sh.height * s)), Image.BICUBIC) if s != 1 else sh
            ox = x0 + tip[0] * (1 - s)
            oy = y0 + tip[1] * (1 - s)
        else:  # UI scenes: bubble to the right of the phone, tail pointing at it
            x0, y0 = 1020, 470 if ln["key"] in ("s5_type", "s7_thanks") else 600
            s = 0.75 + 0.25 * p_in
            img = sh.resize((int(sh.width * s), int(sh.height * s)), Image.BICUBIC)
            ox, oy = x0 + tip[0] * (1 - s), y0 + tip[1] * (1 - s)
        if a < 1:
            img = img.copy()
            img.putalpha(img.split()[3].point(lambda v: int(v * a)))
        base.alpha_composite(img, (int(ox), int(oy)))

    def caption(self, base, ln, t):
        who, text, d = VO[ln["key"]]
        t0, t1 = ln["t"] - 0.1, ln["t"] + d + 0.5
        if not (t0 <= t <= t1):
            return
        a = clamp((t - t0) / 0.2) * clamp((t1 - t) / 0.25)
        f = self.cap_font
        seg = SEGMENTS[max(i for i, s in enumerate(SEGMENTS) if s["start"] <= t + 1e-6)]
        in_ui = seg.get("scene") in ("donor", "chat")
        lines = wrap(text, f, 760 if in_ui else 1250)
        words_total = len(text.split())
        shown = int(clamp((t - ln["t"]) / max(d * 0.92, 0.1)) * words_total + 0.999)
        lh = 54
        bw = int(max(f.getlength(l) for l in lines) + 80)
        bh = lh * len(lines) + 40
        lay = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
        dd = ImageDraw.Draw(lay)
        dd.rounded_rectangle([0, 0, bw - 1, bh - 1], 26, fill=(24, 18, 20, 200))
        k = 0
        for i, l in enumerate(lines):
            x = 40
            for wd in l.split():
                col = (255, 255, 255) if k < shown else (255, 255, 255, 90)
                dd.text((x, 18 + i * lh), wd, font=f, fill=col)
                x += f.getlength(wd + " ")
                k += 1
        cx = 1430 if in_ui else W / 2
        paste_center(base, lay, cx, H - 60 - bh / 2 + (1 - ease_out((t - t0) / 0.3)) * 16, alpha=a)

    def title(self, base, tt, t):
        if not (tt["t0"] <= t <= tt["t1"]):
            return
        a = clamp((t - tt["t0"]) / 0.4) * clamp((tt["t1"] - t) / 0.3)
        f = self.title_font
        txt = tt["text"]
        # typewriter reveal
        n = int(len(txt) * clamp((t - tt["t0"]) / 1.1))
        lay = Image.new("RGBA", (int(f.getlength(txt)) + 60, 110), (0, 0, 0, 0))
        dd = ImageDraw.Draw(lay)
        for dx, dy in ((0, 4), (2, 5)):
            dd.text((30 + dx, 20 + dy), txt[:n], font=f, fill=(0, 0, 0, 150))
        lay = lay.filter(ImageFilter.GaussianBlur(4))
        ImageDraw.Draw(lay).text((30, 20), txt[:n], font=f, fill=(255, 255, 255))
        paste_center(base, lay, W / 2, H - 150, alpha=a)

    def chip(self, base, t):
        for t0, t1, text in CHIPS:
            if t0 <= t <= t1:
                im = self.chips[text]
                p = ease_out((t - t0) / 0.35)
                a = clamp((t - t0) / 0.2) * clamp((t1 - t) / 0.18)
                base.alpha_composite(_alpha(im, a), (int(60 - (1 - p) * 60), 50))

    def banner(self, base, t):
        for b, im in zip(BANNERS, self.banners):
            if b["t0"] <= t <= b["t1"]:
                p = back_out((t - b["t0"]) / 0.45)
                out = clamp((b["t1"] - t) / 0.3)
                y = -im.height + (im.height + 10) * p
                base.alpha_composite(_alpha(im, out), (int(W / 2 - im.width / 2), int(y)))

    def pulse(self, arr, t):
        """Red heartbeat vignette for the tense opening."""
        if not (BEATS[0] - 0.1 <= t <= BEATS[-1] + 0.8):
            return arr
        p = 0.0
        for b in BEATS:
            dt = t - b
            if 0 <= dt < 0.7:
                p = max(p, math.exp(-dt * 6))
        k = 0.35 + 0.35 * p
        fade = clamp((t - BEATS[0] + 0.1) / 0.5) * clamp((BEATS[-1] + 0.8 - t) / 0.6)
        k *= fade
        red = np.array([90, 0, 10], np.float32)
        m = self.vig * k
        return arr * (1 - m) + red * m


def clamp_arr(x):
    return np.clip(x, 0, 1)


def _alpha(im, a):
    if a >= 0.999:
        return im
    im = im.copy()
    im.putalpha(im.split()[3].point(lambda v: int(v * a)))
    return im


# --------------------------------------------------------------------- main
def main():
    os.makedirs(OUT, exist_ok=True)
    out_path = os.path.join(OUT, "picture.mp4")
    only = None
    if len(sys.argv) > 1:  # preview stills: render.py 12.8 30 ...
        only = [float(x) for x in sys.argv[1:]]
    ui = UIScenes()
    ov = Overlays()
    n_frames = int(round(TOTAL * FPS))
    enc = None
    if only is None:
        enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                                "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                                "-pix_fmt", "yuv420p", out_path], stdin=subprocess.PIPE)
    frames = [int(round(x * FPS)) for x in only] if only else range(n_frames)
    reader, reader_seg, prev_last, hold = None, None, None, None
    for fi in frames:
        t = fi / FPS
        si = max(i for i, s in enumerate(SEGMENTS) if s["start"] <= t + 1e-6)
        seg = SEGMENTS[si]
        lt = t - seg["start"]
        if seg["kind"] == "clip":
            if only:
                r = ClipReader(dict(seg, t_in=seg["t_in"] + lt * seg.get("speed", 1.0)))
                img = r.read()
                r.close()
            else:
                if reader_seg != si:
                    if reader:
                        reader.close()
                    reader, reader_seg = ClipReader(seg), si
                img = reader.read()
            z, cx, cy = seg_zoom(seg, lt)
            frame = zoom_frame(img, z, cx, cy).convert("RGBA")
        else:
            frame = ui.render(seg["scene"], lt, seg["dur"])
        # crossfade into UI scenes from the last frame of the shot before
        if not only and seg["kind"] == "ui":
            if lt < 0.5 / FPS:
                hold = prev_last
            if lt < 0.3 and hold is not None:
                frame = Image.blend(hold, frame, ease_io(lt / 0.3))
        prev_last = frame
        # fades: in from black at the very start, out to black at the end
        rgb = np.asarray(frame.convert("RGB")).astype(np.float32)
        rgb = ov.pulse(rgb, t)
        fb = clamp(t / 0.5) * clamp((TOTAL - t) / 0.7)
        if fb < 1:
            rgb = rgb * fb
        frame = Image.fromarray(rgb.clip(0, 255).astype(np.uint8)).convert("RGBA")
        for tt in TITLES:
            ov.title(frame, tt, t)
        ov.chip(frame, t)
        ov.banner(frame, t)
        for ln in LINES:
            if ln["who"] == "narrator":
                if ln.get("caption", True):
                    ov.caption(frame, ln, t)
            elif ln.get("bubble", True):
                ov.bubble(frame, ln, t, None)
        out = frame.convert("RGB")
        if only:
            p = os.path.join(OUT, f"still_{t:05.1f}.jpg")
            out.save(p, quality=88)
            print(p)
        else:
            enc.stdin.write(out.tobytes())
            if fi % 150 == 0:
                print(f"{t:5.1f}s / {TOTAL:.1f}s", flush=True)
    if reader:
        reader.close()
    if enc:
        enc.stdin.close()
        enc.wait()
        print("wrote", out_path)


if __name__ == "__main__":
    main()
