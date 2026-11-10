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

    def get_minor_scale_chords(self, root_note=60, use_harmonic_minor_V=False): # root_note as MIDI note for C4
        """
        Returns a dictionary of common diatonic chords for a natural minor scale,
        with an option to use the harmonic minor V chord.
        Assumes 3-note chords (triads).
        Intervals for natural minor scale: [0, 2, 3, 5, 7, 8, 10]
        """
        # Natural minor chords
        chords = {
            'i': [root_note, root_note + 3, root_note + 7], # Minor triad
            'ii_dim': [root_note + 2, root_note + 5, root_note + 10], # Diminished triad
            'III': [root_note + 3, root_note + 7, root_note + 10], # Major triad
            'iv': [root_note + 5, root_note + 8, root_note + 12], # Minor triad (octave)
            'v': [root_note + 7, root_note + 10, root_note + 14], # Minor triad (octave)
            'VI': [root_note + 8, root_note + 12, root_note + 15], # Major triad (octave)
            'VII': [root_note + 10, root_note + 14, root_note + 17] # Major triad (octave)
        }
        
        if use_harmonic_minor_V:
            # For harmonic minor V chord, the 7th scale degree is raised, making V major
            # For a root_note of C4 (60), the 7th scale degree is Bb (70). Raised to B (71).
            # V chord: G (67) - Bb (70) - D (74) -> G (67) - B (71) - D (74)
            chords['V'] = [root_note + 7, root_note + 11, root_note + 14] # Major triad (octave)
            # The VII chord also becomes diminished in harmonic minor
            chords['vii_dim'] = [root_note + 11, root_note + 14, root_note + 17] # Diminished triad (octave)
            
        return chords

    def get_seventh_chords(self, root_note=60, scale_type='major', use_harmonic_minor_V7=False): # root_note as MIDI note for C4
        """
        Returns a dictionary of common diatonic seventh chords for a major or minor scale.
        Assumes 4-note chords.
        """
        if scale_type == 'major':
            chords = {
                'IMaj7': [root_note, root_note + 4, root_note + 7, root_note + 11], # Major 7th
                'iiMin7': [root_note + 2, root_note + 5, root_note + 9, root_note + 12], # Minor 7th
                'iiiMin7': [root_note + 4, root_note + 7, root_note + 11, root_note + 14], # Minor 7th
                'IVMaj7': [root_note + 5, root_note + 9, root_note + 12, root_note + 16], # Major 7th
                'V7': [root_note + 7, root_note + 11, root_note + 14, root_note + 17], # Dominant 7th
                'viMin7': [root_note + 9, root_note + 12, root_note + 16, root_note + 19], # Minor 7th
                'viiHalfDim7': [root_note + 11, root_note + 14, root_note + 17, root_note + 21] # Half-diminished 7th
            }
        elif scale_type == 'minor':
            # Natural minor 7th chords
            chords = {
                'iMin7': [root_note, root_note + 3, root_note + 7, root_note + 10], # Minor 7th
                'iiHalfDim7': [root_note + 2, root_note + 5, root_note + 8, root_note + 10], # Half-diminished 7th
                'IIIMaj7': [root_note + 3, root_note + 7, root_note + 10, root_note + 14], # Major 7th
                'ivMin7': [root_note + 5, root_note + 8, root_note + 12, root_note + 15], # Minor 7th
                'vMin7': [root_note + 7, root_note + 10, root_note + 14, root_note + 17], # Minor 7th
                'VIMaj7': [root_note + 8, root_note + 12, root_note + 15, root_note + 19], # Major 7th
                'VIIMaj7': [root_note + 10, root_note + 14, root_note + 17, root_note + 21] # Major 7th
            }
            if use_harmonic_minor_V7:
                # Dominant 7th from harmonic minor (raised 7th scale degree)
                chords['V7'] = [root_note + 7, root_note + 11, root_note + 14, root_note + 17] # Dominant 7th
                # The vii chord from harmonic minor is fully diminished
                chords['viiDim7'] = [root_note + 11, root_note + 14, root_note + 17, root_note + 20] # Diminished 7th
                
        else:
            raise ValueError("Invalid scale_type. Must be 'major' or 'minor'.")
        return chords

    def _get_inversion(self, chord_notes, inversion):
        """
        Returns the notes for a given inversion.
        inversion: 0 (root position), 1 (first inversion), 2 (second inversion), etc.
        """
        if not chord_notes or inversion == 0: return chord_notes
        
        inverted_chord = list(chord_notes)
        for _ in range(inversion):
            if not inverted_chord: break
            root = inverted_chord.pop(0)
            inverted_chord.append(root + 12) # Move root up an octave
        return inverted_chord

    def _get_voicing(self, chord_notes, voicing_spread=0):
        """
        Adjusts chord notes for voicing spread (e.g., spreading notes across octaves).
        voicing_spread: Integer indicating how many upper notes to move up an octave.
        """
        if not chord_notes or voicing_spread == 0: return chord_notes

        voiced_chord = list(chord_notes)
        for i in range(1, len(voiced_chord)):
            if i <= voicing_spread:
                voiced_chord[i] += 12 * (i) # Spread notes upwards based on index
        return voiced_chord

    def generate_chord_progression(self, melody_start_time, chords_to_use=None, chord_duration=4, velocity=80, root_note=60, chord_type='triad', inversion=0, voicing_spread=0, scale_type='major', use_harmonic_minor_V=False, use_harmonic_minor_V7=False):
        """
        Generates a chord progression following a simple pattern.
        melody_start_time: The MIDI time in ticks when the harmony should start (e.g., after a melody).
        chords_to_use: List of chord roman numerals (e.g., ['I', 'IV', 'V', 'I']). If None, uses a default.
        chord_duration: Duration of each chord in quarter notes.
        root_note: MIDI root note for the scale.
        chord_type: 'triad' or 'seventh'.
        inversion: 0 (root position), 1 (first inversion), 2 (second inversion), etc.
        voicing_spread: Integer indicating how many upper notes to move up an octave for voicing.
        scale_type: 'major' or 'minor'.
        use_harmonic_minor_V: If True, uses the major V chord in minor scale triad progressions.
        use_harmonic_minor_V7: If True, uses the dominant V7 chord in minor scale seventh chord progressions.
        """
        if not chords_to_use: 
            if scale_type == 'major':
                chords_to_use = ['I', 'V', 'vi', 'IV'] if chord_type == 'triad' else ['IMaj7', 'V7', 'viMin7', 'IVMaj7']
            elif scale_type == 'minor':
                # Default minor progression, favoring natural minor if harmonic minor V is not explicitly requested
                if chord_type == 'triad':
                    chords_to_use = ['i', 'VI', 'VII', 'i']
                    if use_harmonic_minor_V:
                        # If using harmonic minor V, include it in the default progression
                        chords_to_use = ['i', 'VI', 'V', 'i'] 
                elif chord_type == 'seventh':
                    chords_to_use = ['iMin7', 'VIMaj7', 'VIIMaj7', 'iMin7']
                    if use_harmonic_minor_V7:
                        chords_to_use = ['iMin7', 'VIMaj7', 'V7', 'iMin7']
            else:
                raise ValueError("Invalid scale_type. Must be 'major' or 'minor'.")

        if chord_type == 'triad':
            if scale_type == 'major':
                diatonic_chords = self.get_major_scale_chords(root_note=root_note)
            elif scale_type == 'minor':
                diatonic_chords = self.get_minor_scale_chords(root_note=root_note, use_harmonic_minor_V=use_harmonic_minor_V)
            else:
                raise ValueError("Invalid scale_type. Must be 'major' or 'minor'.")
        elif chord_type == 'seventh':
            diatonic_chords = self.get_seventh_chords(root_note=root_note, scale_type=scale_type, use_harmonic_minor_V7=use_harmonic_minor_V7)
        else:
            raise ValueError("Invalid chord_type. Must be 'triad' or 'seventh'.")

        current_time = melody_start_time 

        for roman_numeral in chords_to_use:
            base_chord_notes = diatonic_chords.get(roman_numeral, [])
            if not base_chord_notes:
                print(f"Warning: Chord {roman_numeral} not found for {scale_type} scale. Skipping.")
                continue

            # Apply inversion and voicing
            inverted_chord = self._get_inversion(base_chord_notes, inversion)
            final_chord_notes = self._get_voicing(inverted_chord, voicing_spread)

            # Send all note_on messages for the chord simultaneously
            for i, note_val in enumerate(final_chord_notes):
                # Adjust note_val to keep chords in a reasonable range (e.g., lower octave for harmony)
                adjusted_note = note_val - 12 # One octave lower for harmony
                if adjusted_note < 36: adjusted_note = note_val # Don't go too low
                
                self.track.append(Message('note_on', note=adjusted_note, velocity=velocity, time=0))
            
            # Send note_off messages after the chord duration
            # The first note_off carries the duration, subsequent ones are time=0
            chord_duration_ticks = int(self.quarter_note_time * chord_duration)
            # Use the first note of the *base* chord for note_off reference, adjusted for octave
            self.track.append(Message('note_off', note=base_chord_notes[0] - 12, velocity=velocity, time=chord_duration_ticks)) 
            for note_val in final_chord_notes[1:]:# Need to use the original pitch for note_off if voicing changed it, 
                # or keep track of the exact 'note_on' pitch.
                # For simplicity, sending note_off for all notes in final_chord_notes at 0 delta time.
                self.track.append(Message('note_off', note=note_val, velocity=velocity, time=0)) 
            
            current_time = 0 # Reset delta time for next chord

        return self.midi_file

# Example Usage:
if __name__ == "__main__":
    output_folder = os.environ['OUT']

    # --- Example 1: Simple chord progression (I-V-vi-IV) ---
    print("Generating simple chord progression...")
    hg1 = HarmonyGenerator(bpm=100, instrument_program=2) # Electric Grand Piano
    melody_length_ticks = hg1.quarter_note_time * 16
    harmony_midi1 = hg1.generate_chord_progression(melody_start_time=0,
                                                  chords_to_use=['I', 'V', 'vi', 'IV', 'I'],
                                                  chord_duration=4) 
    output_path1 = os.path.join(output_folder, 'simple_harmony_progression.mid')
    harmony_midi1.save(output_path1)
    print(f"Saved: {output_path1}")

    # --- Example 2: Different chord progression and root note (G Major, I-IV-V-I) ---
    print("Generating a different chord progression (G Major, I-IV-V-I)...")
    midi_file_2 = MidiFile()
    track_2 = MidiTrack()
    midi_file_2.tracks.append(track_2)
    hg2 = HarmonyGenerator(midi_file=midi_file_2, track=track_2, bpm=110, instrument_program=21) # Accordion
    
    harmony_midi2 = hg2.generate_chord_progression(melody_start_time=0, 
                                                  chords_to_use=['I', 'IV', 'V', 'I'],
                                                  chord_duration=2, 
                                                  root_note=55) 
    output_path2 = os.path.join(output_folder, 'g_major_harmony.mid')
    harmony_midi2.save(output_path2)
    print(f"Saved: {output_path2}")

    # --- Example 3: Seventh chord progression ---
    print("Generating seventh chord progression (C Major, IMaj7-V7-viMin7-IVMaj7)...")
    midi_file_3 = MidiFile()
    track_3 = MidiTrack()
    midi_file_3.tracks.append(track_3)
    hg3 = HarmonyGenerator(midi_file=midi_file_3, track=track_3, bpm=120, instrument_program=17) # Drawbar Organ
    
    harmony_midi3 = hg3.generate_chord_progression(melody_start_time=0, 
                                                  chords_to_use=['IMaj7', 'V7', 'viMin7', 'IVMaj7'],
                                                  chord_duration=4, 
                                                  root_note=60, chord_type='seventh') 
    output_path3 = os.path.join(output_folder, 'seventh_harmony.mid')
    harmony_midi3.save(output_path3)
    print(f"Saved: {output_path3}")

    # --- Example 4: Chord progression with inversion and voicing ---
    print("Generating chord progression with inversion and voicing...")
    midi_file_4 = MidiFile()
    track_4 = MidiTrack()
    midi_file_4.tracks.append(track_4)
    hg4 = HarmonyGenerator(midi_file=midi_file_4, track=track_4, bpm=100, instrument_program=49) # Synth Strings 1
    
    harmony_midi4 = hg4.generate_chord_progression(melody_start_time=0,
                                                  chords_to_use=['I', 'IV', 'V', 'I'],
                                                  chord_duration=4, 
                                                  root_note=60, inversion=1, voicing_spread=1) 
    output_path4 = os.path.join(output_folder, 'harmony_inversion_voicing.mid')
    harmony_midi4.save(output_path4)
    print(f"Saved: {output_path4}")

    # --- Example 5: Natural Minor chord progression ---
    print("Generating natural minor chord progression (C Minor, i-VI-VII-i)...
")
    midi_file_5 = MidiFile()
    track_5 = MidiTrack()
    midi_file_5.tracks.append(track_5)
    hg5 = HarmonyGenerator(midi_file=midi_file_5, track=track_5, bpm=100, instrument_program=30) # Synth Bass 1
    
    harmony_midi5 = hg5.generate_chord_progression(melody_start_time=0,
                                                  chords_to_use=['i', 'VI', 'VII', 'i'],
                                                  chord_duration=4, 
                                                  root_note=60, scale_type='minor') 
    output_path5 = os.path.join(output_folder, 'natural_minor_harmony_progression.mid')
    harmony_midi5.save(output_path5)
    print(f"Saved: {output_path5}
")
    
    # --- Example 6: Harmonic Minor triad chord progression (C Minor, i-VI-V-i) ---
    print("Generating harmonic minor triad chord progression (C Minor, i-VI-V-i)...
")
    midi_file_6 = MidiFile()
    track_6 = MidiTrack()
    midi_file_6.tracks.append(track_6)
    hg6 = HarmonyGenerator(midi_file=midi_file_6, track=track_6, bpm=100, instrument_program=40) # Violin
    
    harmony_midi6 = hg6.generate_chord_progression(melody_start_time=0,
                                                  chords_to_use=['i', 'VI', 'V', 'i'],
                                                  chord_duration=4, 
                                                  root_note=60, scale_type='minor', use_harmonic_minor_V=True) 
    output_path6 = os.path.join(output_folder, 'harmonic_minor_triad_harmony_progression.mid')
    harmony_midi6.save(output_path6)
    print(f"Saved: {output_path6}
")

    # --- Example 7: Harmonic Minor seventh chord progression (C Minor, iMin7-VIMaj7-V7-iMin7) ---
    print("Generating harmonic minor seventh chord progression (C Minor, iMin7-VIMaj7-V7-iMin7)...
")
    midi_file_7 = MidiFile()
    track_7 = MidiTrack()
    midi_file_7.tracks.append(track_7)
    hg7 = HarmonyGenerator(midi_file=midi_file_7, track=track_7, bpm=100, instrument_program=48) # String Ensemble 1
    
    harmony_midi7 = hg7.generate_chord_progression(melody_start_time=0,
                                                  chords_to_use=['iMin7', 'VIMaj7', 'V7', 'iMin7'],
                                                  chord_duration=4, 
                                                  root_note=60, scale_type='minor', chord_type='seventh', use_harmonic_minor_V7=True) 
    output_path7 = os.path.join(output_folder, 'harmonic_minor_seventh_harmony_progression.mid')
    harmony_midi7.save(output_path7)
    print(f"Saved: {output_path7}\n")