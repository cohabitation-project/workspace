import os
from mido import MidiFile, MidiTrack, bpm2tempo, MetaMessage
from teams.arts.composition_modules.melody_generator import MelodyGenerator
from teams.arts.composition_modules.harmony_generator import HarmonyGenerator

def create_full_composition(output_folder, filename="full_composition.mid", bpm=120):
    midi_file = MidiFile()

    # Track 1: Melody
    melody_track = MidiTrack()
    midi_file.tracks.append(melody_track)
    melody_gen = MelodyGenerator(midi_file=midi_file, track=melody_track, bpm=bpm, instrument_program=73) # Flute
    
    # Generate a melody
    num_melody_notes = 16
    melody_gen.generate_random_melody(start_note=60, num_notes=num_melody_notes,
                                       scale_intervals=[0, 2, 4, 5, 7, 9, 11], velocity=70)
    
    # Calculate approximate melody end time for harmony start
    # Each melody note is a quarter note in the current implementation of generate_random_melody (if rhythm_pattern=None)
    melody_end_time_ticks = num_melody_notes * melody_gen.quarter_note_time

    # Track 2: Harmony
    harmony_track = MidiTrack()
    midi_file.tracks.append(harmony_track)
    harmony_gen = HarmonyGenerator(midi_file=midi_file, track=harmony_track, bpm=bpm, instrument_program=1) # Bright Acoustic Piano
    
    # Generate harmony to accompany the melody
    # Use a common progression (I-vi-IV-V) and align with melody
    chords_to_use = ['I', 'vi', 'IV', 'V'] * (num_melody_notes // len(chords_to_use)) # Repeat progression to match melody length
    
    # Start harmony at the beginning of the piece, but make sure note_ons/offs are timed correctly.
    # The harmony will play chords that last the duration of (num_melody_notes / len(chords_to_use)) quarter notes.
    # For simplicity, let each chord last for 4 melody notes (which are quarter notes).
    
    current_harmony_time_ticks = 0
    for i in range(num_melody_notes // 4):
        chord_roman = chords_to_use[i % len(chords_to_use)] # Cycle through progression
        chord_notes = harmony_gen.get_major_scale_chords(root_note=60).get(chord_roman, [])
        
        # All notes on at current_harmony_time_ticks (delta time 0 if immediate, or adjusted for first chord)
        for j, note_val in enumerate(chord_notes):
            adjusted_note = note_val - 12 # Lower octave
            harmony_track.append(Message('note_on', note=adjusted_note, velocity=80, time=0 if j > 0 else (current_harmony_time_ticks)))
            
        # All notes off after 4 quarter notes
        chord_duration_q_notes = 4
        chord_duration_ticks = harmony_gen.quarter_note_time * chord_duration_q_notes
        
        harmony_track.append(Message('note_off', note=chord_notes[0] - 12, velocity=80, time=chord_duration_ticks))
        for note_val in chord_notes[1:]:
            harmony_track.append(Message('note_off', note=note_val - 12, velocity=80, time=0))
        
        current_harmony_time_ticks = 0 # Subsequent delta times are relative to previous event

    # Add end of track messages
    melody_track.append(MetaMessage('end_of_track', time=1))
    harmony_track.append(MetaMessage('end_of_track', time=1))

    output_path = os.path.join(output_folder, filename)
    midi_file.save(output_path)
    print(f"Saved full composition: {output_path}")
    return output_path

if __name__ == "__main__":
    output_folder = os.environ['OUT']
    create_full_composition(output_folder)
