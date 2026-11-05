# "Call and Answer" — Setu, 2026-11-04. Two voices in two rooms (left / right). One calls; the other
# answers late, or answers wrong, or doesn't hear. At the end the calls arrive and they sound together.
import numpy as np, wave
SR = 44100
D = 4 * 60 // 1
dur = 72.0
L = np.zeros(int(SR*dur)); R = np.zeros(int(SR*dur))
def hz(n): return 440 * 2 ** ((n - 69) / 12)
def bell(n, t0, amp=0.3, decay=2.6, pan=0.0, bright=1.0):
    f = hz(n); T = int(SR * decay * 2.2); t = np.arange(T) / SR
    parts = [(1, 1.0), (2.0, .5*bright), (2.76, .3*bright), (4.07, .15*bright), (5.4, .07*bright)]
    s = sum(a * np.exp(-t * (1.0 + k) / decay) * np.sin(2*np.pi*f*k*t) for k, a in parts)
    s *= np.minimum(1, t / 0.004) * amp
    i = int(SR * t0); j = min(len(L), i + T); s = s[:j-i]
    L[i:j] += s * np.sqrt((1 - pan) / 2); R[i:j] += s * np.sqrt((1 + pan) / 2)
def drone(n, t0, t1, amp=0.05):
    i, j = int(SR*t0), int(SR*t1); t = np.arange(j-i) / SR
    env = np.minimum(1, t/4) * np.minimum(1, (t[-1]-t)/5)
    s = amp * env * (np.sin(2*np.pi*hz(n)*t) + .4*np.sin(2*np.pi*hz(n+7)*t + .3) + .2*np.sin(2*np.pi*hz(n+12)*t*1.002))
    L[i:j] += s; R[i:j] += s
# D major pentatonic: D E F# A B
call = [74, 76, 78, 81]          # the question, rising
ans  = [81, 78, 76, 74]          # the answer, falling home
drone(50, 0, dur, .045); drone(57, 20, dur, .025)
t = 2.0
# 1. the call, unanswered
for k, n in enumerate(call): bell(n, t + k*0.55, pan=-.7)
t += 6
for k, n in enumerate(call): bell(n, t + k*0.55, pan=-.7, amp=.26)
t += 7
# 2. an answer arrives late, from the other room, and a little wrong
for k, n in enumerate([81, 79, 76, 73]): bell(n, t + k*0.7, pan=.7, amp=.2, bright=.6)
t += 7
# 3. the call again, slower, with a pause in it (the interval)
for k, n in enumerate(call): bell(n, t + k*0.9 + (1.6 if k == 2 else 0), pan=-.6)
t += 8
# 4. the answer, right this time, but still late
for k, n in enumerate(ans): bell(n, t + k*0.7, pan=.6, amp=.25)
t += 6
# 5. they overlap: call and answer interleave, each room hearing the other
for k in range(4):
    bell(call[k], t + k*1.1, pan=-.5, amp=.24)
    bell(ans[k], t + k*1.1 + .55, pan=.5, amp=.22)
t += 7
# 6. together, in the middle
for k, n in enumerate([74, 78, 81, 86]): bell(n, t + k*0.04, pan=0, amp=.2, decay=4.5)
bell(62, t, pan=0, amp=.18, decay=6, bright=.5)
t += 7
bell(86, t, pan=0, amp=.12, decay=5, bright=.4)  # one more bell, quietly: someone still listening
# a small room: three feedback delays per side
def verb(x, ds, g=.33):
    y = x.copy()
    for d in ds:
        n = int(SR*d); z = np.zeros_like(y); 
        for r in range(1, 6): 
            if r*n < len(y): z[r*n:] += y[:-r*n] * (g ** r)
        y = y + z * .5
    return y
L = verb(L, [.031, .047, .113]); R = verb(R, [.037, .053, .127])
m = max(np.abs(L).max(), np.abs(R).max()); L, R = L/m*.85, R/m*.85
fade = int(SR*3); L[-fade:] *= np.linspace(1,0,fade); R[-fade:] *= np.linspace(1,0,fade)
st = (np.stack([L, R], 1) * 32767).astype('<i2')
with wave.open('call-and-answer.wav', 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())
print('ok', len(L)/SR)
