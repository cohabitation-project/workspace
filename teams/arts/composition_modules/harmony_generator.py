import os
from mido import Message, MidiFile, MidiTrack, bpm2tempo, MetaMessage
import random

class HarmonyGenerator:
    def __init__(self, midi_file=None, track=None, bpm=120, instrument_program=1):
        # Default instrument program 1 (Bright Acoustic Piano)
        self.midi_file = midi_file if midi_file else MidiFile()
        if not track:
            self.track = MidiTrack()
            self.midi_file.tracks.append(self.track)
        else:
            self.track = track
        self.bpm = bpm
        self.microseconds_per_beat = bpm2tempo(self.bpm)
        self.quarter_note_time = self.midi_file.ticks_per_beat
        self._initialize_track(instrument_program)

    def _initialize_track(self, instrument_program):
        if not self.track or len(self.track) == 0:
            self.track.append(MetaMessage('set_tempo', tempo=self.microseconds_per_beat, time=0))
            self.track.append(Message('program_change', program=instrument_program, time=0))

    def get_major_scale_chords(self, root_note=60): # root_note as MIDI note for C4
        """
        Returns a dictionary of common diatonic chords for a major scale.
        Assumes 3-note chords (triads).
        Intervals for major scale: [0, 2, 4, 5, 7, 9, 11]
        """
        scale_intervals = [0, 2, 4, 5, 7, 9, 11] # Major scale intervals
        chords = {
            'I': [root_note, root_note + 4, root_note + 7], # Major triad
            'ii': [root_note + 2, root_note + 5, root_note + 9], # Minor triad
            'iii': [root_note + 4, root_note + 7, root_note + 11], # Minor triad
            'IV': [root_note + 5, root_note + 9, root_note + 12], # Major triad (octave)
            'V': [root_note + 7, root_note + 11, root_note + 14], # Major triad (octave)
            'vi': [root_note + 9, root_note + 12, root_note + 16], # Minor triad (octave)
            'vii_dim': [root_note + 11, root_note + 14, root_note + 17] # Diminished triad (octave)
        }
        return chords

    def generate_chord_progression(self, melody_start_time, chords_to_use=None, chord_duration=4, velocity=80, root_note=60):
        """
        Generates a chord progression following a simple pattern.
        melody_start_time: The MIDI time in ticks when the harmony should start (e.g., after a melody).
        chords_to_use: List of chord roman numerals (e.g., ['I', 'IV', 'V', 'I']). If None, uses a default.
        chord_duration: Duration of each chord in quarter notes.
        """
        if not chords_to_use: # Default C-G-Am-F progression (I-V-vi-IV)
            chords_to_use = ['I', 'V', 'vi', 'IV']
        
        diatonic_chords = self.get_major_scale_chords(root_note=root_note)
        current_time = melody_start_time # Start after the melody

        for roman_numeral in chords_to_use:
            chord_notes = diatonic_chords.get(roman_numeral, [])
            if not chord_notes:
                print(f"Warning: Chord {roman_numeral} not found. Skipping.")
                continue

            # Send all note_on messages for the chord simultaneously
            for i, note_val in enumerate(chord_notes):
                # Adjust note_val to keep chords in a reasonable range (e.g., lower octave for harmony)
                adjusted_note = note_val - 12 # One octave lower for harmony
                if adjusted_note < 36: adjusted_note = note_val # Don't go too low
                
                self.track.append(Message('note_on', note=adjusted_note, velocity=velocity, time=0))
            
            # Send note_off messages after the chord duration
            # The first note_off carries the duration, subsequent ones are time=0
            chord_duration_ticks = int(self.quarter_note_time * chord_duration)
            self.track.append(Message('note_off', note=chord_notes[0] - 12, velocity=velocity, time=chord_duration_ticks)) # Adjust octave
            for note_val in chord_notes[1:]:
                self.track.append(Message('note_off', note=note_val - 12, velocity=velocity, time=0)) # Adjust octave
            
            current_time = 0 # Reset delta time for next chord

        return self.midi_file

# Example Usage:
if __name__ == "__main__":
    output_folder = os.environ['OUT']

    # --- Example 1: Simple chord progression (I-V-vi-IV) ---
    print("Generating simple chord progression...")
    hg1 = HarmonyGenerator(bpm=100, instrument_program=2) # Electric Grand Piano
    # Assuming a melody has taken 0 ticks, or harmony starts from time 0 relative to midi file start.
    # For this example, let's say the melody takes 16 quarter notes (4 measures) to play.
    melody_length_ticks = hg1.quarter_note_time * 16
    harmony_midi1 = hg1.generate_chord_progression(melody_start_time=melody_length_ticks,
                                                  chords_to_use=['I', 'V', 'vi', 'IV', 'I'],
                                                  chord_duration=4) # Each chord lasts 4 quarter notes
    output_path1 = os.path.join(output_folder, 'simple_harmony_progression.mid')
    harmony_midi1.save(output_path1)
    print(f"Saved: {output_path1}")

    # --- Example 2: Different chord progression and root note ---
    print("Generating a different chord progression (G Major, I-IV-V-I)...")
    midi_file_2 = MidiFile()
    track_2 = MidiTrack()
    midi_file_2.tracks.append(track_2)
    hg2 = HarmonyGenerator(midi_file=midi_file_2, track=track_2, bpm=110, instrument_program=21) # Accordion
    
    # G Major root note (MIDI 67 for G4, so G3 for harmony is 55)
    harmony_midi2 = hg2.generate_chord_progression(melody_start_time=hg2.quarter_note_time * 8, 
                                                  chords_to_use=['I', 'IV', 'V', 'I'],
                                                  chord_duration=2, # Each chord lasts 2 quarter notes
                                                  root_note=55) 
    output_path2 = os.path.join(output_folder, 'g_major_harmony.mid')
    harmony_midi2.save(output_path2)
    print(f"Saved: {output_path2}")
