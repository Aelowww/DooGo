"""Generate the AI voice lines with Kokoro (open-source TTS).

Needs kokoro-v1.0.onnx and voices-v1.0.bin from
https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0 in video/tts/.
Usage: python3 src/voices.py assets/vo
"""
import soundfile as sf, json, sys, os
from kokoro_onnx import Kokoro
D=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),'tts')
k=Kokoro(os.path.join(D,'kokoro-v1.0.onnx'),os.path.join(D,'voices-v1.0.bin'))
V={'seeker':('af_heart',1.0),'friend1':('af_bella',1.0),'friend2':('am_puck',1.0),'family':('bm_george',1.0),'donor':('am_fenrir',1.0),'narrator':('am_michael',0.92)}
L=[
('s1_hello','seeker',"Hello?"),
('s1_what','seeker',"What? They need blood?"),
('s1_family','family',"The hospital needs a blood donor. Please, hurry."),
('s1_anyone','seeker',"Does anyone know a blood donor?"),
('s2_maybe','friend1',"Maybe try asking somewhere else?"),
('s2_time','seeker',"We don't have much time."),
('s3_wait','friend2',"Wait. Have you tried DooGo?"),
('s3_doogo','seeker',"DooGo?"),
('n1','narrator',"DooGo connects people who need blood with voluntary donors who are ready to help."),
('s4_sent','seeker',"Okay. The request is sent."),
('s5_type','donor',"That's my blood type."),
('n2','narrator',"Donors can view blood requests, and respond when they are available to help."),
('s5_help','donor',"I can help."),
('n3','narrator',"Donors can update their availability whenever they can, or turn it off when they're unavailable."),
('s7_thanks','seeker',"Thank you so much. You really helped us."),
('s7_course','donor',"Of course. I'm glad I could help."),
('n4','narrator',"When someone needs blood, finding the right donor shouldn't have to be a struggle."),
('n5','narrator',"DooGo. Connecting donors, saving lives."),
]
out={}
for key,who,txt in L:
    v,sp=V[who]
    a,sr=k.create(txt,voice=v,speed=sp,lang='en-us')
    sf.write(f'{sys.argv[1]}/{key}.wav',a,sr); out[key]=(who,txt,round(len(a)/sr,2))
    print(key,who,round(len(a)/sr,2))
json.dump(out,open(f'{sys.argv[1]}/lines.json','w'),indent=1)
