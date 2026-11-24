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

    def generate_rhythmic_pattern(self, base_duration=1, variations=[0.5, 0.75, 1, 1.5, 2], num_beats=4, density=0.7,
                                rhythmic_phrases=None, syncopation_chance=0.1, dynamic_density_profile=None):
        """
        Generates a more complex rhythmic pattern by varying a base duration,
        introducing rhythmic phrases, syncopation, and dynamic density.
        base_duration: The basic unit of rhythm (e.g., 1 for quarter note).
        variations: Multipliers for the base duration to create rhythmic variety.
        num_beats: The total number of base duration beats to fill.
        density: Base probability of placing a note on a given beat (0.0 to 1.0).
        rhythmic_phrases: A list of predefined rhythmic motifs (e.g., [[0.5, 0.5, 1], [1, 0.5, 0.5]]).
        syncopation_chance: Probability of placing an accent on an off-beat (0.0 to 1.0).
        dynamic_density_profile: A list of (beat_start, beat_end, density_modifier) tuples to change density dynamically.
        """
        pattern = []
        current_beats = 0
        
        while current_beats < num_beats:
            current_density = density
            if dynamic_density_profile:
                for start, end, modifier in dynamic_density_profile:
                    if start <= current_beats < end:
                        current_density *= modifier
                        break

            if rhythmic_phrases and random.random() < 0.2: # 20% chance to use a phrase
                phrase = random.choice(rhythmic_phrases)
                phrase_duration = sum(d for d in phrase if d != 0) # Sum of note durations, ignoring rests
                if current_beats + phrase_duration <= num_beats:
                    pattern.extend(phrase)
                    current_beats += phrase_duration
                    continue

            # Apply syncopation logic: try to make the previous note longer or add a rest
            if random.random() < syncopation_chance and pattern and pattern[-1] != 0:
                last_duration = pattern[-1]
                # If the last note was short, extend it by adding a longer duration here
                # Or add a rest before the next note to create a syncopated feel
                if last_duration < base_duration * 1.5:
                    pattern[-1] += base_duration * random.choice([0.5, 1]) # Extend last note
                else:
                    pattern.append(0.5) # Add a short rest for syncopation
                current_beats += 0.5 # Account for the rest in total beats

            if random.random() < current_density:
                duration_factor = random.choice(variations)
                actual_duration = base_duration * duration_factor
                pattern.append(actual_duration)
                current_beats += actual_duration
            else:
                # Add a rest if no note is placed, ensuring total beats are accounted for
                rest_duration = base_duration * random.choice([0.5, 1]) # Small rests
                pattern.append(0) # 0 signifies a rest
                current_beats += rest_duration
        
        # Ensure pattern length is reasonable and total beats are met (can be slightly over due to variations)
        final_pattern = []
        total_actual_beats = 0
        for d in pattern:
            if total_actual_beats + (d if d != 0 else base_duration) <= num_beats * 1.5: # Allow slight overrun
                final_pattern.append(d)
                total_actual_beats += (d if d != 0 else base_duration)
            else:
                break
        
        return final_pattern if final_pattern else [base_duration]

    def generate_random_melody(self, start_note=60, scale_intervals=[0, 2, 4, 5, 7, 9, 11], num_notes=16,
                                rhythm_pattern=None, velocity=64, melodic_contour=None,
                                rhythmic_variations=None, contour_strength=0.7):
        """
        Generates a random melody within a specified scale.
        scale_intervals: intervals from the root note to form the scale (e.g., major scale).
        rhythm_pattern: List of note durations (e.g., [1, 0.5, 0.5, 1] for quarter, eighth, eighth, quarter).
                        If None, uses quarter notes.
        melodic_contour: 'up', 'down', 'arch', 'random', or None. Influences direction of note selection.
        rhythmic_variations: Dictionary for rhythmic pattern generation parameters {base_duration, variations, num_beats, density}.
        contour_strength: How strictly to adhere to the melodic contour (0.0 to 1.0).
        """
        current_time = 0
        previous_note_val = start_note # Keep track for contour
        notes_generated_in_contour = 0
        contour_direction = None # For 'arch' contour

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

            # Determine contour direction for 'arch'
            if melodic_contour == 'arch':
                if notes_generated_in_contour < num_notes / 2: # Ascending phase
                    contour_direction = 'up'
                else: # Descending phase
                    contour_direction = 'down'
            else:
                contour_direction = melodic_contour

            # Select a note based on melodic contour and contour_strength
            available_notes = scale_intervals
            if contour_direction == 'up':
                # More strictly choose an ascending note if random.random() < contour_strength
                if random.random() < contour_strength:
                    potential_notes = [n for n in scale_intervals if (start_note + n) > previous_note_val]
                    if potential_notes: available_notes = potential_notes
            elif contour_direction == 'down':
                # More strictly choose a descending note if random.random() < contour_strength
                if random.random() < contour_strength:
                    potential_notes = [n for n in scale_intervals if (start_note + n) < previous_note_val]
                    if potential_notes: available_notes = potential_notes
            
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
            notes_generated_in_contour += 1 # Increment for arch contour tracking

        return self.midi_file

    def generate_counterpoint(self, main_melody_notes, scale_intervals, rhythm_pattern=None, velocity=60, counterpoint_type='diatonic', interval_preference=None):
        """
        Generates a counterpoint melody based on a main melody.
        main_melody_notes: A list of (note_value, duration_ticks) tuples for the main melody.
        scale_intervals: Intervals from the root note to form the scale.
        rhythm_pattern: Rhythmic pattern for the counterpoint. If None, matches main melody rhythm.
        counterpoint_type: 'diatonic' for strictly scale-based, 'contrary' for contrary motion.
        interval_preference: List of preferred harmonic intervals (e.g., [3, 5, 6, 8, 10, 12] for 3rd, 5th, 6th, octave).
        """
        counterpoint_track = MidiTrack()
        self.midi_file.tracks.append(counterpoint_track)
        counterpoint_track.append(MetaMessage('set_tempo', tempo=self.microseconds_per_beat, time=0))
        counterpoint_track.append(Message('program_change', program=73, time=0)) # Default to Flute for counterpoint

        current_time = 0
        rhythm_index = 0
        if not rhythm_pattern:
            rhythm_pattern = [d for _, d in main_melody_notes] # Match main melody rhythm

        for i, (main_note, main_duration) in enumerate(main_melody_notes):
            if rhythm_index >= len(rhythm_pattern):
                rhythm_index = 0

            duration_ticks = rhythm_pattern[rhythm_index]
            rhythm_index += 1

            possible_counter_notes = []
            for interval in scale_intervals:
                potential_note = main_note + interval # Consider notes above main melody
                if potential_note > 84: # Try notes below if too high
                    potential_note = main_note - interval

                # Ensure note is within a reasonable range
                if 48 <= potential_note <= 84:
                    possible_counter_notes.append(potential_note)

            # Apply counterpoint type and interval preference
            if counterpoint_type == 'contrary' and i > 0:
                # Simple contrary motion: if main melody goes up, counterpoint goes down, and vice-versa
                prev_main_note = main_melody_notes[i-1][0]
                if main_note > prev_main_note: # Main melody ascended
                    # Try to find a lower counterpoint note
                    preferred_notes = [n for n in possible_counter_notes if n < main_note]
                elif main_note < prev_main_note: # Main melody descended
                    # Try to find a higher counterpoint note
                    preferred_notes = [n for n in possible_counter_notes if n > main_note]
                else:
                    preferred_notes = possible_counter_notes
            else:
                preferred_notes = possible_counter_notes

            if interval_preference:
                # Filter notes based on preferred harmonic intervals
                filtered_notes = []
                for cn in preferred_notes:
                    interval_with_main = abs(cn - main_note) % 12 # Harmonic interval
                    if interval_with_main in interval_preference:
                        filtered_notes.append(cn)
                if filtered_notes:
                    possible_counter_notes = filtered_notes
                elif preferred_notes:
                    possible_counter_notes = preferred_notes # Fallback to any valid note

            if possible_counter_notes:
                counter_note = random.choice(possible_counter_notes)
            else:
                counter_note = main_note - 12 # Fallback if no suitable counterpoint found

            counterpoint_track.append(Message('note_on', note=counter_note, velocity=velocity, time=current_time))
            counterpoint_track.append(Message('note_off', note=counter_note, velocity=velocity, time=duration_ticks))
            current_time = 0
        
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

    # --- Example 5: Melody with Counterpoint ---
    print("Generating melody with counterpoint...")
    mg5 = MelodyGenerator(bpm=120, instrument_program=0) # Acoustic Grand Piano for main melody
    main_melody_notes_data = [] # Store notes and durations for counterpoint
    main_melody_midi = MidiFile()
    main_melody_track = MidiTrack()
    main_melody_midi.tracks.append(main_melody_track)
    mg_main = MelodyGenerator(midi_file=main_melody_midi, track=main_melody_track, bpm=120, instrument_program=0)

    # Generate a simple main melody to use for counterpoint
    current_time_main = 0
    scale_c_major = [0, 2, 4, 5, 7, 9, 11]
    num_notes_main = 8
    main_melody_rhythm = [1, 1, 1, 1, 1, 1, 1, 1] # Quarter notes
    start_note_main = 60 # C4
    
    for note_idx in range(num_notes_main):
        note_val = start_note_main + random.choice(scale_c_major)
        duration_factor = main_melody_rhythm[note_idx]
        note_duration_ticks = int(mg_main.quarter_note_time * duration_factor)
        
        main_melody_track.append(Message('note_on', note=note_val, velocity=80, time=current_time_main))
        main_melody_track.append(Message('note_off', note=note_val, velocity=80, time=note_duration_ticks))
        main_melody_notes_data.append((note_val, note_duration_ticks))
        current_time_main = 0

    # Now generate counterpoint for this main melody
    final_composition_with_counterpoint = mg_main.generate_counterpoint(
        main_melody_notes=main_melody_notes_data,
        scale_intervals=scale_c_major,
        counterpoint_type='contrary',
        interval_preference=[3, 5, 8, 10] # Prefer 3rds, 5ths, octaves, 6ths
    )
    output_path5 = os.path.join(output_folder, 'melody_with_counterpoint.mid')
    final_composition_with_counterpoint.save(output_path5)
    print(f"Saved: {output_path5}")
