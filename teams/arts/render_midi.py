"""render_midi.py — render a MIDI file to WAV inside the run_python sandbox (board 055).

No external synth needed: parses the MIDI with mido and synthesizes with numpy (additive sine with
harmonics and an exponential envelope — the same method used for the label render of simple_melody).
Usage inside run_python:

    import os, sys
    sys.path.insert(0, os.environ['REPO'] + '/teams/arts')
    from render_midi import render
    render(os.environ['REPO'] + '/teams/arts/outputs/<ts>/piece.mid', os.environ['OUT'] + '/piece.wav')

Then listen to the WAV with the `listen` tool (after it lands in your team folder via $OUT), or ship it.
"""
import wave
import numpy as np
import mido

SR = 44100

def render(midi_path, wav_path, gain=0.85):
    m = mido.MidiFile(midi_path)
    events, on, t = [], {}, 0.0
    for msg in m:
        t += msg.time
        if msg.type == 'note_on' and msg.velocity > 0:
            on[(getattr(msg, 'channel', 0), msg.note)] = (t, msg.velocity)
        elif msg.type in ('note_off', 'note_on'):
            key = (getattr(msg, 'channel', 0), msg.note)
            if key in on:
                st, vel = on.pop(key)
                events.append((st, t, msg.note, vel))
    for (ch, note), (st, vel) in on.items():
        events.append((st, st + 0.25, note, vel))
    if not events:
        raise ValueError('no notes found in ' + midi_path)
    end = max(e[1] for e in events) + 1.2
    buf = np.zeros(int(end * SR))
    for st, et, note, vel in events:
        f = 440.0 * 2 ** ((note - 69) / 12)
        dur = max(0.05, et - st)
        n = int(dur * SR)
        tt = np.arange(n) / SR
        tone = 0.6*np.sin(2*np.pi*f*tt) + 0.25*np.sin(2*np.pi*2*f*tt) + 0.1*np.sin(2*np.pi*3*f*tt)
        env = np.minimum(1, tt/0.02) * np.exp(-tt*2.2)
        seg = tone * env * (vel/127) * 0.5
        s0 = int(st*SR); e0 = min(len(buf), s0+n)
        buf[s0:e0] += seg[:e0-s0]
        tail_n = int(0.5*SR); tt2 = np.arange(tail_n)/SR
        tail = 0.6*np.sin(2*np.pi*f*(tt2+dur)) * np.exp(-(tt2+dur)*2.2) * (vel/127) * 0.5
        e1 = min(len(buf), s0+n+tail_n)
        buf[s0+n:e1] += tail[:e1-(s0+n)]
    buf /= max(1e-9, np.abs(buf).max()); buf *= gain
    pcm = (buf*32767).astype('<i2')
    with wave.open(wav_path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    return wav_path

if __name__ == '__main__':
    import sys
    render(sys.argv[1], sys.argv[2])
    print('rendered', sys.argv[2])
