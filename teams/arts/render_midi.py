import mido
import numpy as np
import scipy.io.wavfile as wavfile
import os

# Sample rate for the audio output
SAMPLE_RATE = 44100

# Base frequency for MIDI note 0 (C-1)
MIDI_0_FREQ = 8.1757989156  # Hz

def midi_to_hz(midi_note):
    return MIDI_0_FREQ * (2**((midi_note - 0) / 12))

def synthesize_note(freq, duration_seconds, amplitude=0.5, attack_s=0.01, decay_s=0.1, sustain_a=0.8, release_s=0.05):
    t = np.linspace(0, duration_seconds, int(SAMPLE_RATE * duration_seconds), endpoint=False)
    waveform = amplitude * np.sin(2 * np.pi * freq * t)

    # Apply ADSR envelope
    envelope = np.ones_like(waveform)
    total_samples = len(waveform)

    attack_samples = int(attack_s * SAMPLE_RATE)
    decay_samples = int(decay_s * SAMPLE_RATE)
    release_samples = int(release_s * SAMPLE_RATE)
    sustain_samples = total_samples - attack_samples - decay_samples - release_samples

    if attack_samples > 0:
        envelope[:attack_samples] = np.linspace(0, 1, attack_samples)
    
    if decay_samples > 0 and attack_samples + decay_samples <= total_samples:
        envelope[attack_samples : attack_samples + decay_samples] = np.linspace(1, sustain_a, decay_samples)
    
    if sustain_samples > 0 and attack_samples + decay_samples + sustain_samples <= total_samples:
        envelope[attack_samples + decay_samples : attack_samples + decay_samples + sustain_samples] = sustain_a

    if release_samples > 0:
        envelope[total_samples - release_samples:] = np.linspace(sustain_a if sustain_samples > 0 else 1, 0, release_samples)

    return waveform * envelope

def render(midi_file_path, output_wav_path, instrument_patches=None):
    if instrument_patches is None:
        # Default patch: sine wave with ADSR envelope
        instrument_patches = {
            'default': lambda freq, dur: synthesize_note(freq, dur)
        }

    mid = mido.MidiFile(midi_file_path)
    
    # Determine the total duration of the MIDI file
    total_duration_seconds = 0
    for track in mid.tracks:
        track_time = 0
        for msg in track:
            track_time += mid.ticks_to_seconds(msg.time)
        total_duration_seconds = max(total_duration_seconds, track_time)

    audio_data = np.zeros(int(SAMPLE_RATE * total_duration_seconds) + SAMPLE_RATE, dtype=np.float32) # Add 1 second buffer

    active_notes = {} # {channel: {note: {'start_time': ..., 'velocity': ..., 'instrument': ...}}}
    current_time_seconds = 0.0

    for track in mid.tracks:
        current_time_seconds = 0.0 # Reset for each track to correctly track relative time
        for msg in track:
            delta_time_seconds = mid.ticks_to_seconds(msg.time)
            current_time_seconds += delta_time_seconds

            if msg.type == 'note_on' and msg.velocity > 0:
                note = msg.note
                velocity = msg.velocity
                channel = msg.channel
                if channel not in active_notes:
                    active_notes[channel] = {}
                active_notes[channel][note] = {
                    'start_time': current_time_seconds, 
                    'velocity': velocity,
                    'instrument': 'default' # TODO: extend with actual instrument patching
                }
            elif msg.type == 'note_off' or (msg.type == 'note_on' and msg.velocity == 0):
                note = msg.note
                channel = msg.channel
                if channel in active_notes and note in active_notes[channel]:
                    start_time = active_notes[channel][note]['start_time']
                    velocity = active_notes[channel][note]['velocity']
                    instrument_name = active_notes[channel][note]['instrument']
                    
                    duration_seconds = current_time_seconds - start_time
                    freq = midi_to_hz(note)
                    amplitude = velocity / 127.0 # Normalize velocity to amplitude

                    patch_function = instrument_patches.get(instrument_name, instrument_patches['default'])
                    note_waveform = patch_function(freq, duration_seconds, amplitude=amplitude)

                    start_sample = int(start_time * SAMPLE_RATE)
                    end_sample = start_sample + len(note_waveform)
                    
                    if end_sample > len(audio_data): # Extend audio_data if note goes beyond current buffer
                        new_length = end_sample + SAMPLE_RATE # extend with 1 second buffer
                        audio_data = np.pad(audio_data, (0, new_length - len(audio_data)), 'constant')

                    audio_data[start_sample:end_sample] += note_waveform
                    del active_notes[channel][note]

    # Normalize audio to prevent clipping and convert to 16-bit integer format
    max_amplitude = np.max(np.abs(audio_data))
    if max_amplitude > 0:
        audio_data = audio_data / max_amplitude * 0.9 # Normalize to 90% of max amplitude

    audio_data_int16 = (audio_data * 32767).astype(np.int16)

    # Ensure the output directory exists
    os.makedirs(os.path.dirname(output_wav_path), exist_ok=True)
    wavfile.write(output_wav_path, SAMPLE_RATE, audio_data_int16)
    
if __name__ == '__main__':
    # Example usage:
    # Assuming you have a MIDI file at this path
    # midi_file = os.environ['REPO'] + '/teams/arts/outputs/2026-11-14T22-24-11/minor_harmonic_v_progression_poly_v2.mid'
    # output_wav = os.environ['OUT'] + '/minor_harmonic_v_progression_poly_v2_rendered.wav'
    
    # render(midi_file, output_wav)
    pass
