"""Edit decision list for the DooGo commercial (1920x1080, 30fps, <= 1:30).

All times are in seconds on the final timeline unless marked as clip time.
Anchors are normalized (x, y) positions inside the *source* clip frame; they are
mapped through each segment's zoom so bubbles stay pinned to the speaker.
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLIPS = os.path.join(ROOT, "clips")
ASSETS = os.path.join(ROOT, "assets")
OUT = os.path.join(ROOT, "out")

W, H, FPS = 1920, 1080, 30

# --- brand (DooGo UI Guidelines) ---
CRIMSON = (166, 27, 43)
CRIMSON_DARK = (140, 22, 34)
TEXT = (31, 31, 31)
TEXT_2 = (107, 114, 128)
SURFACE = (255, 255, 255)
TINT = (255, 247, 247)
ICON_BG = (252, 231, 231)
APP_BG = (248, 245, 242)
BORDER = (231, 226, 221)


def clip(name):
    return os.path.join(CLIPS, name)


# Each segment: kind, start, dur, plus kind-specific fields.
# zoom: (z0, z1, cx, cy) -> zoom eases from z0 to z1 around the point (cx, cy).
SEGMENTS = [
    # Scene 1 - The Call
    dict(kind="clip", src="phone_rings.mp4", t_in=1.0, start=0.0, dur=8.6, zoom=(1.0, 1.08, 0.66, 0.5),
         punch=(5.3, 0.10)),
    dict(kind="clip", src="family_call.mp4", t_in=0.3, start=8.6, dur=4.0, zoom=(1.12, 1.0, 0.42, 0.45)),
    dict(kind="clip", src="phone_rings.mp4", t_in=14.3, start=12.6, dur=2.7, zoom=(1.12, 1.18, 0.66, 0.55)),
    # Scene 2 - The Problem
    dict(kind="clip", src="friends_scrolling.mp4", t_in=0.0, start=15.3, dur=8.9, zoom=(1.0, 1.06, 0.5, 0.4)),
    # Scene 3 - Introducing DooGo
    dict(kind="clip", src="friends_scrolling.mp4", t_in=8.9, start=24.2, dur=4.1, zoom=(1.04, 1.1, 0.5, 0.35)),
    dict(kind="clip", src="seeker_request.mp4", t_in=0.0, start=28.3, dur=2.9, zoom=(1.0, 1.45, 0.53, 0.47)),
    dict(kind="ui", scene="logo", start=31.2, dur=2.6),
    # Scene 4 - Request Blood
    dict(kind="clip", src="seeker_request.mp4", t_in=3.0, start=33.8, dur=10.5, zoom=(1.18, 1.18, 0.55, 0.55)),
    dict(kind="clip", src="donor_settings.mp4", t_in=0.0, start=44.3, dur=3.0, speed=0.5, zoom=(1.1, 1.2, 0.78, 0.3)),
    # Scene 5 - Finding a Donor (prototype)
    dict(kind="ui", scene="donor", start=47.3, dur=11.2),
    # Scene 6 - Donor Availability
    dict(kind="clip", src="donor_settings.mp4", t_in=2.0, start=58.5, dur=5.2, zoom=(1.12, 1.12, 0.78, 0.38)),
    dict(kind="clip", src="donor_settings.mp4", t_in=8.0, start=63.7, dur=6.5, zoom=(1.12, 1.16, 0.74, 0.45)),
    # Scene 7 - Connecting
    dict(kind="clip", src="seeker_request.mp4", t_in=11.0, start=70.2, dur=2.5, zoom=(1.2, 1.3, 0.55, 0.5)),
    dict(kind="ui", scene="chat", start=72.7, dur=7.8),
    # Scene 8 - The Message
    dict(kind="clip", src="meet_handshake.mp4", t_in=0.6, start=80.5, dur=5.8, zoom=(1.0, 1.1, 0.42, 0.5)),
    dict(kind="ui", scene="end", start=86.3, dur=3.4),
]
TOTAL = SEGMENTS[-1]["start"] + SEGMENTS[-1]["dur"]  # 89.7s

ROLE = {"seeker": "Student", "friend1": "Friend", "friend2": "Friend", "family": "Family", "donor": "Donor"}

# Spoken lines. seg = index into SEGMENTS for anchor mapping (None = UI layout / narrator).
# t = when the line starts; fit = stretch the AI voice to this many seconds so it
# matches how long the actor's mouth moves (measured with face tracking);
# text/show override the bubble text and how long it stays up.
LINES = [
    dict(key="s1_hello", who="seeker", t=5.0, seg=0, anchor=(0.70, 0.47)),
    dict(key="s1_what", who="seeker", t=6.0, seg=0, anchor=(0.70, 0.47), show=0.85),
    dict(key="s1_need", who="seeker", t=7.0, fit=1.35, seg=0, anchor=(0.70, 0.47)),
    dict(key="s1_family", who="family", t=8.85, fit=3.45, seg=1, anchor=(0.43, 0.40)),
    dict(key="s1_anyone", who="seeker", t=12.9, fit=2.1, seg=2, anchor=(0.69, 0.50)),
    dict(key="n0", who="narrator", t=15.7),
    dict(key="s2_maybe", who="friend1", t=20.0, seg=3, anchor=(0.50, 0.20)),
    dict(key="s2_time", who="seeker", t=23.3, seg=3, anchor=(0.71, 0.36)),
    dict(key="s3_wait", who="friend2", t=24.7, seg=4, anchor=(0.22, 0.16)),
    dict(key="s3_doogo", who="seeker", t=26.9, seg=4, anchor=(0.70, 0.34)),
    dict(key="n1", who="narrator", t=28.6),
    dict(key="s4_sent", who="seeker", t=42.3, seg=7, anchor=(0.10, 0.80)),
    dict(key="s5_type", who="donor", t=49.9, seg=None),
    dict(key="n2", who="narrator", t=51.2),
    dict(key="s5_help", who="donor", t=56.4, seg=None),
    dict(key="n3", who="narrator", t=59.0),
    dict(key="s7_thanks", who="seeker", t=74.3, seg=None),
    dict(key="s7_course", who="donor", t=77.0, seg=None),
    dict(key="n4", who="narrator", t=80.9),
    dict(key="n5", who="narrator", t=86.6, caption=False),
]

# On-screen text from the script
TITLES = [
    dict(text="In an emergency, finding a donor can be difficult.", t0=9.4, t1=12.5),
]

# Prototype step chips over the phone footage (absolute times)
CHIPS = [
    (33.8, 35.2, "Sign In"),
    (35.2, 36.4, "Dashboard  →  Request Blood"),
    (36.4, 38.7, "Blood Type  →  Location  →  Request Details"),
    (38.7, 40.6, "Compatible Donors"),
    (40.6, 41.6, "Send Request"),
    (41.6, 44.3, "Request Sent!"),
    (58.5, 59.9, "Donate Blood"),
    (59.9, 61.5, "Set Up / Update Donation  ·  O+"),
    (61.5, 63.7, "Information Saved"),
    (63.7, 65.0, "Manage Status"),
    (65.0, 67.6, "Set as Available  ·  Turn Off for Now"),
    (67.6, 70.2, "You're Available"),
]

# Push notifications
BANNERS = [
    dict(t0=44.55, t1=47.3, title="Someone needs a blood donor.", body="O+  ·  2 bags  ·  Iloilo City  ·  Tap to view"),
    dict(t0=70.4, t1=72.7, title="A donor has responded to your request.", body="Carl T. accepted your blood request"),
]

# Scene 2: floating chats from other apps - messages sent, seen, no reply
FLOAT_CHATS = (15.1, 19.9)
CHATS = [
    dict(name="Tita Grace", init="TG", msg="Tita, do you know anyone with O+ blood? It's urgent.", pos=(70, 380), t=15.25),
    dict(name="BSIT 3A Group", init="3A", msg="Does anyone know a blood donor? Please, we need one now.", pos=(560, 560), t=15.85),
    dict(name="Kuya Mark", init="KM", msg="Kuya, are you free to donate blood? Please reply.", pos=(1400, 560), t=16.45),
]

# Heartbeat (Scene 1-2 tension): beat times drive both the SFX and the red pulse
def _beats():
    out, t, gap = [], 8.6, 0.86
    while t < 24.0:
        out.append(round(t, 3))
        if not (20.9 < t < 22.0):
            pass
        t += gap
        gap = max(0.6, gap * 0.985)
    return out


BEATS = _beats()
RING = (0.8, 3.9)  # phone ringing (absolute)
MUSIC_PAUSE = (21.0, 24.3)
