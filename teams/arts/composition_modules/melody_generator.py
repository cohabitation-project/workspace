import os
from mido import Message, MidiFile, MidiTrack, bpm2tempo, MetaMessage
import random

class MelodyGenerator:
    def __init__(self, midi_file=None, track=None, bpm=120, instrument_program=0):
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
        # Only add tempo and program change if track is new or not already set
        if not self.track or len(self.track) == 0:
            self.track.append(MetaMessage('set_tempo', tempo=self.microseconds_per_beat, time=0))
            self.track.append(Message('program_change', program=instrument_program, time=0))

    def generate_rhythmic_pattern(self, base_duration=1, variations=[0.5, 0.75, 1, 1.5, 2], num_beats=4, density=0.7):
        """
        Generates a more complex rhythmic pattern by varying a base duration.
        base_duration: The basic unit of rhythm (e.g., 1 for quarter note).
        variations: Multipliers for the base duration to create rhythmic variety.
        num_beats: The total number of base duration beats to fill.
        density: Probability of placing a note on a given beat (0.0 to 1.0).
        """
        pattern = []
        current_beats = 0
        while current_beats < num_beats:
            if random.random() < density:
                duration_factor = random.choice(variations)
                actual_duration = base_duration * duration_factor
                pattern.append(actual_duration)
                current_beats += actual_duration
            else:
                # Add a rest if no note is placed, ensuring total beats are accounted for
                rest_duration = base_duration * random.choice([0.5, 1]) # Small rests
                pattern.append(0) # 0 signifies a rest
                current_beats += rest_duration
        # Ensure pattern length is reasonable
        return [d for d in pattern if d > 0][:int(num_beats * 2)] if pattern else [base_duration]

    def generate_random_melody(self, start_note=60, scale_intervals=[0, 2, 4, 5, 7, 9, 11], num_notes=16,
                                rhythm_pattern=None, velocity=64, melodic_contour=None,
                                rhythmic_variations=None):
        """
        Generates a random melody within a specified scale.
        scale_intervals: intervals from the root note to form the scale (e.g., major scale).
        rhythm_pattern: List of note durations (e.g., [1, 0.5, 0.5, 1] for quarter, eighth, eighth, quarter).
                        If None, uses quarter notes.
        melodic_contour: 'up', 'down', 'random', or None. Influences direction of note selection.
        rhythmic_variations: Dictionary for rhythmic pattern generation parameters {base_duration, variations, num_beats, density}.
        """
        current_time = 0
        previous_note_val = start_note # Keep track for contour

        if rhythmic_variations:
            rhythm_to_use = self.generate_rhythmic_pattern(**rhythmic_variations)
        else:
            rhythm_to_use = rhythm_pattern if rhythm_pattern else [1] * num_notes # Default to quarter notes

        rhythm_index = 0

        for i in range(num_notes):
            if rhythm_index >= len(rhythm_to_use):
                rhythm_index = 0 # Loop rhythm if short

            duration_factor = rhythm_to_use[rhythm_index]
            rhythm_index += 1

            if duration_factor == 0: # This is a rest
                current_time += int(self.quarter_note_time * (random.choice([0.5, 1])))
                continue

            # Select a note based on melodic contour
            if melodic_contour == 'up':
                available_notes = [n for n in scale_intervals if (start_note + n) > previous_note_val]
                if not available_notes: available_notes = scale_intervals # Fallback if no higher notes
            elif melodic_contour == 'down':
                available_notes = [n for n in scale_intervals if (start_note + n) < previous_note_val]
                if not available_notes: available_notes = scale_intervals # Fallback if no lower notes
            else: # 'random' or None
                available_notes = scale_intervals

            scale_degree = random.choice(available_notes)
            note_val = start_note + scale_degree
            
            # Ensure note stays within a reasonable MIDI range (e.g., C3-C6)
            while note_val < 48 or note_val > 84: 
                scale_degree = random.choice(scale_intervals)
                note_val = start_note + scale_degree

            note_duration_ticks = int(self.quarter_note_time * duration_factor)

            self.track.append(Message('note_on', note=note_val, velocity=velocity, time=current_time))
            self.track.append(Message('note_off', note=note_val, velocity=velocity, time=note_duration_ticks))
            current_time = 0 # Delta time for subsequent messages
            previous_note_val = note_val # Update previous note for contour

        return self.midi_file

# Example Usage:
if __name__ == "__main__":
    output_folder = os.environ['OUT']

    # --- Example 1: Simple random melody ---
    print("Generating simple random melody...")
    mg1 = MelodyGenerator(bpm=130, instrument_program=73) # Flute
    melody_midi1 = mg1.generate_random_melody(start_note=60, num_notes=20)
    output_path1 = os.path.join(output_folder, 'random_melody_flute.mid')
    melody_midi1.save(output_path1)
    print(f"Saved: {output_path1}")

    # --- Example 2: Random melody with specific rhythm and range (e.g., minor pentatonic) ---
    print("Generating minor pentatonic melody with rhythm...")
    midi_file_2 = MidiFile()
    track_2 = MidiTrack()
    midi_file_2.tracks.append(track_2)
    mg2 = MelodyGenerator(midi_file=midi_file_2, track=track_2, bpm=90, instrument_program=24) # Acoustic Guitar
    
    minor_pentatonic_intervals = [0, 3, 5, 7, 10]
    rhythm = [1, 0.5, 0.5, 1.5, 0.5] # Quarter, eighth, eighth, dotted quarter, eighth
    
    melody_midi2 = mg2.generate_random_melody(start_note=55, scale_intervals=minor_pentatonic_intervals, 
                                             num_notes=16, rhythm_pattern=rhythm, velocity=80)
    output_path2 = os.path.join(output_folder, 'minor_pentatonic_guitar.mid')
    melody_midi2.save(output_path2)
    print(f"Saved: {output_path2}")

    # --- Example 3: Adding melodic contour ---
    print("Generating ascending melody...")
    mg3 = MelodyGenerator(bpm=110, instrument_program=48) # String Ensemble 1
    melody_midi3 = mg3.generate_random_melody(start_note=60, num_notes=16, rhythm_pattern=[0.75, 0.25, 0.5, 1], melodic_contour='up', velocity=85)
    output_path3 = os.path.join(output_folder, 'ascending_strings.mid')
    melody_midi3.save(output_path3)
    print(f"Saved: {output_path3}")

    # --- Example 4: Melody with generated rhythmic variations ---
    print("Generating melody with dynamic rhythmic variations...")
    mg4 = MelodyGenerator(bpm=120, instrument_program=74) # Recorder
    rhythmic_params = {'base_duration': 0.5, 'variations': [0.5, 1, 1.5], 'num_beats': 8, 'density': 0.8}
    melody_midi4 = mg4.generate_random_melody(start_note=67, num_notes=20, melodic_contour='random', 
                                             rhythmic_variations=rhythmic_params, velocity=70)
    output_path4 = os.path.join(output_folder, 'dynamic_rhythm_recorder.mid')
    melody_midi4.save(output_path4)
    print(f"Saved: {output_path4}")
