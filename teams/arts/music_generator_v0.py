
import mido
from mido import Message, MidiFile, MidiTrack

# Create a new MIDI file and add a track
mid = MidiFile()
track = MidiTrack()
mid.tracks.append(track)

# Set tempo (optional, defaults to 120 BPM if not set)
track.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(100), time=0))

# Add some notes (C major scale)
# Message(type, note, velocity, time)
# time is in ticks, where 480 ticks = one beat (default ticks_per_beat)
track.append(Message('note_on', note=60, velocity=64, time=0)) # C4
track.append(Message('note_off', note=60, velocity=64, time=480)) # C4 for one beat

track.append(Message('note_on', note=62, velocity=64, time=0)) # D4
track.append(Message('note_off', note=62, velocity=64, time=480))

track.append(Message('note_on', note=64, velocity=64, time=0)) # E4
track.append(Message('note_off', note=64, velocity=64, time=480))

track.append(Message('note_on', note=65, velocity=64, time=0)) # F4
track.append(Message('note_off', note=65, velocity=64, time=480))

track.append(Message('note_on', note=67, velocity=64, time=0)) # G4
track.append(Message('note_off', note=67, velocity=64, time=480))

track.append(Message('note_on', note=69, velocity=64, time=0)) # A4
track.append(Message('note_off', note=69, velocity=64, time=480))

track.append(Message('note_on', note=71, velocity=64, time=0)) # B4
track.append(Message('note_off', note=71, velocity=64, time=480))

track.append(Message('note_on', note=72, velocity=64, time=0)) # C5
track.append(Message('note_off', note=72, velocity=64, time=960)) # C5 for two beats

# Save the MIDI file to the output directory
output_path = os.environ['OUT'] + '/simple_melody.mid'
mid.save(output_path)

print(f"Generated MIDI file: {output_path}")
