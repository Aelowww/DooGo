# DooGo commercial video

Final cut: `DooGo_Commercial.mp4` (1920x1080, 30 fps, 1:29.7). It's attached to the repo's draft release, next to the raw clips.

## How it's built
- `src/timeline.py`: the edit. Cuts, timings, chat-bubble positions, step labels, notifications.
- `src/voices.py`: AI voices (Kokoro TTS). One voice per character plus a separate narrator.
- `src/render.py`: picture. Muted clips + zoom/grade + chat bubbles, narrator captions, prototype screens (from Figma), heartbeat vignette, end card.
- `src/audio.py`: soundtrack. Voices + generated music + sound effects, with the music ducked under the dialogue.

## Rebuild
1. Put the raw clips in `clips/` as: phone_rings.mp4, family_call.mp4, friends_scrolling.mp4, seeker_request.mp4, donor_settings.mp4, meet_handshake.mp4.
2. pip install pillow numpy soundfile kokoro-onnx
3. python3 src/render.py && python3 src/audio.py
4. ffmpeg -i out/picture.mp4 -i out/soundtrack.wav -map 0:v -map 1:a -c:v copy -af loudnorm=I=-15:TP=-1.5 -c:a aac -b:a 192k out/DooGo_Commercial.mp4

Preview single frames: `python3 src/render.py 12.8 50` writes stills to out/.

## Voices
| Character | Voice |
|---|---|
| Student (seeker) | af_heart |
| Friend 1 | af_bella |
| Friend 2 | am_puck |
| Family member | bm_george |
| Donor | am_fenrir |
| Narrator | am_michael |
