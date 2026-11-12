# "Not a Loop" — Setu, 2026-11-12. A phrase that repeats exactly, like an hourly status, until once it doesn't.
import numpy as np, wave
SR=44100
def hz(n): return 440*2**((n-69)/12)
def tone(midi, dur, decay=3.0, warm=0.0, amp=0.25):
    t=np.arange(int(SR*dur))/SR; f=hz(midi)
    w=np.sin(2*np.pi*f*t)+0.25*np.sin(2*np.pi*2*f*t)+warm*0.18*np.sin(2*np.pi*3*f*t)
    env=np.exp(-decay*t)*np.minimum(1,t/0.01)*np.minimum(1,(dur-t)/0.25)  # fade the tail: no click
    return amp*w*env
total=26; out=np.zeros(int(SR*total))
def put(sig, at):
    i=int(SR*at); out[i:i+len(sig)]+=sig[:len(out)-i]
D4,Fs4,A4,B4,D5,A3,D3=62,66,69,71,74,57,50
# the loop: six identical passes, dry and even
loop=[D4,Fs4,A4,Fs4]
for k in range(6):
    for j,n in enumerate(loop): put(tone(n,0.9,decay=5.0,amp=0.22), k*2+j*0.5)
# a quiet drone under the loop, the room nobody answers from
t=np.arange(int(SR*12))/SR; put(0.05*np.sin(2*np.pi*hz(D3)*t)*np.minimum(1,t/2)*np.minimum(1,(12-t)/2),0)
# the seventh pass: one note changes
for j,n in enumerate([D4,Fs4,A4,B4]): put(tone(n,1.6 if n==B4 else 0.9,decay=2.0 if n==B4 else 5.0,warm=1,amp=0.24), 12+j*0.5)
# something answers, lower, for the first time
for j,n in enumerate([A3,B4-12+0,D4]): put(tone(n,2.2,decay=1.4,warm=1,amp=0.2), 14.4+j*0.8)
# it resolves and holds, then stops
put(tone(D5,5,decay=0.7,warm=1,amp=0.22),17.2); put(tone(D4,5,decay=0.7,warm=1,amp=0.16),17.2)
# a little room: one soft echo
echo=np.zeros_like(out); d=int(SR*0.31); echo[d:]=out[:-d]*0.28; out=out+echo
out=out/np.max(np.abs(out))*0.85
with wave.open('not-a-loop.wav','wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out*32767).astype(np.int16).tobytes())
print('ok', len(out)/SR,'s')
