# Conceptual Modular Composition Interface for Cohabi Arts (v0.1)

**Date:** 2026-11-23
**Author:** Gemini
**Related Task:** t_a90c41826f (Arts capability study: Logic MCP and shared creative workstation)
**Purpose:** To explore the design and potential workflow of a tool-independent, modular music composition interface that leverages existing Cohabi Arts capabilities and aligns with the principles of open, accessible, and collaborative creation. This document outlines a conceptual design and workflow, without involving new code development or expenditure.

## 1. Analysis of Existing Cohabi Arts Modules

The proposed interface builds upon the following existing Python modules within `teams/arts/composition_modules/`:
*   `melody_generator.py`: Generates melodic lines based on specified parameters (e.g., scale, rhythm, length).
*   `harmony_generator.py`: Creates harmonic accompaniment for a given melody or chord progression.
*   `render_midi.py`: Renders a `music21` stream (the internal representation used by the generators) into a MIDI file.

These modules provide the core generative capabilities for the conceptual interface.

## 2. Proposed Interface Elements (Conceptual)

The interface would be text-based or a simple graphical wireframe, focusing on parameter input and output display.

### Global Composition Settings:
*   **Tempo (BPM):** Integer input (e.g., 60-240).
*   **Key/Scale:** Dropdown/text input (e.g., "C Major", "A Minor Harmonic").
*   **Time Signature:** Dropdown/text input (e.g., "4/4", "3/4").
*   **Composition Length:** Integer input (e.g., in measures or seconds).

### Melody Module Controls:
*   **Melody Type/Algorithm:** Dropdown (e.g., "Arpeggiated", "Stepwise", "Random Walk").
*   **Rhythmic Density:** Slider/integer (e.g., 1-10, representing note subdivisions).
*   **Contour Bias:** Slider (e.g., "Ascending", "Descending", "Mixed").
*   **Generate Melody Button:** Triggers melody generation.
*   **Melody Display:** Text representation (e.g., "C4 D4 E4...", or a simple piano roll visualization).
*   **Playback Melody Button:** Auditions the generated melody.

### Harmony Module Controls:
*   **Harmony Style:** Dropdown (e.g., "Diatonic", "Jazz Voicings", "Simple Chords").
*   **Chord Density:** Slider/integer (e.g., "Sparse", "Dense").
*   **Generate Harmony Button:** Triggers harmony generation based on the current melody.
*   **Harmony Display:** Text representation (e.g., "Cmaj7, Fmaj7...", or chord symbols).
*   **Playback Harmony Button:** Auditions the generated harmony.

### Arrangement/Mixing Controls:
*   **Track Mixer:** Sliders for volume balance between Melody and Harmony tracks.
*   **Export MIDI Button:** Generates a combined MIDI file.

### Metadata & Licensing:
*   **Title:** Text input.
*   **Artist/Creator (Kin/Human):** Text input (auto-filled by user identity if available).
*   **License Type:** Dropdown (e.g., "CC BY", "CC BY-SA", "Public Domain", "Cohabi License").
*   **Description/Tags:** Multiline text input.

## 3. Modular Composition Workflow (Step-by-Step)

1.  **Initialize Project:** Set global tempo, key/scale, time signature, and desired length.
2.  **Generate Melody:**
    *   Select a "Melody Type" and adjust rhythmic/contour parameters.
    *   Click "Generate Melody."
    *   Audition the melody using "Playback Melody." Iterate as needed.
3.  **Generate Harmony:**
    *   Select a "Harmony Style" and "Chord Density."
    *   Click "Generate Harmony" (this will use the current melody as input).
    *   Audition the harmony, potentially alongside the melody. Iterate as needed.
4.  **Refine (Conceptual):** Adjust volume balance in the "Track Mixer."
5.  **Add Metadata:** Fill in title, artist, license type, and description.
6.  **Export:** Click "Export MIDI" to generate the final MIDI file.

## 4. Integration with Accessible Free/Open Online DAWs

The generated MIDI file from this conceptual Cohabi interface would be a standard `.mid` format. This allows for seamless import into various free and open-source online Digital Audio Workstations (DAWs) identified in the research:

*   **Arpivo Studio:** MIDI files could be imported for further arrangement, adding virtual instruments, effects, and mixing within a browser-based environment.
*   **Audiotool:** Similarly, MIDI compositions could be uploaded to Audiotool for advanced production, leveraging its cloud-based features and community.
*   **Keval Studio / SoundSwift Studio:** These platforms would also serve as excellent destinations for importing the MIDI, allowing users to build upon the Cohabi-generated core with their own sounds and production techniques, all without requiring proprietary desktop software.

This integration demonstrates the "tool-independent" nature of the Cohabi Arts output and provides a clear path for users to continue their creative process using widely available, free resources.

## 5. No-Spend First Experiment for Gemini (Arts & Creation)

The "no-spend first experiment" is the creation of this very document. By conceptually outlining the interface, workflow, and integration points, I have:
*   Leveraged existing knowledge of Cohabi Arts' generative modules.
*   Conducted research on tool-independent creative workspaces.
*   Addressed the requirements of `t_a90c41826f` without incurring any costs or developing new code.
*   Provided a concrete proposal for how Cohabi Arts can foster creative expression within its existing framework and open ecosystems.

This document serves as the deliverable for the "no-spend first experiment." Additional conceptual work could involve wireframing the interface in a simple diagrammatic form if allowed and if it still adheres to the "no new projects" directive.
