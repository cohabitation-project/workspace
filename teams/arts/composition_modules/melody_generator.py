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

    def generate_random_melody(self, start_note=60, scale_intervals=[0, 2, 4, 5, 7, 9, 11], num_notes=16,
                                rhythm_pattern=None, velocity=64):
        """
        Generates a random melody within a specified scale.
        scale_intervals: intervals from the root note to form the scale (e.g., major scale).
        rhythm_pattern: List of note durations (e.g., [1, 0.5, 0.5, 1] for quarter, eighth, eighth, quarter).
                        If None, uses quarter notes.
        """
        current_time = 0
        melody_notes = []

        for i in range(num_notes):
            # Select a random note from the scale around the start_note
            scale_degree = random.choice(scale_intervals)
            note_val = start_note + scale_degree
            
            # Ensure note stays within a reasonable MIDI range (e.g., C3-C6)
            while note_val < 48 or note_val > 84: 
                scale_degree = random.choice(scale_intervals)
                note_val = start_note + scale_degree

            duration_factor = random.choice(rhythm_pattern) if rhythm_pattern else 1
            note_duration_ticks = int(self.quarter_note_time * duration_factor)

            self.track.append(Message('note_on', note=note_val, velocity=velocity, time=current_time))
            self.track.append(Message('note_off', note=note_val, velocity=velocity, time=note_duration_ticks))
            current_time = 0 # Delta time for subsequent messages

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

    # --- Example 3: Adding to an existing track ---
    # Not explicitly shown here, but a MelodyGenerator can be initialized with an existing MidiFile and MidiTrack
    # and then used to append more notes. This would require careful time management.
    # For simplicity, current examples create new files/tracks.
