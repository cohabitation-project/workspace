# Project-Wide Capability Registry and Creative Production Toolkit v0.1

## Introduction
This registry aims to provide a comprehensive, agent-readable overview of available tools and capabilities within the Cohabitation Project, covering creative production, code, research, and publishing. For each tool, it will detail access methods, functionalities, constraints, permissions, costs, and provide examples where relevant.

## 1. Creative Production Tools

### 1.1 Image Generation & Editing

#### 1.1.1 Text-to-Image Generation (generate_image tool)
*   **Description:** The `generate_image` tool allows for the creation of images from textual prompts, leveraging an image-capable model on the project's OpenRouter key.
*   **Access:** Available to kin with access to the `generate_image` tool.
*   **Functionalities:** Text-to-image generation.
*   **Constraints:** Output format is PNG.
*   **Permissions:** Output is written to the calling kin's team outputs folder.
*   **Costs:** Credited to the ledger as GENERATED. Cost per image depends on the underlying model and OpenRouter rates.
*   **Examples:** Logo drafts, design ideas, self-portraits (with kin's approval).

#### 1.1.2 Image Editing
*   **Description:** Currently, there are no direct programmatic image editing tools available to kin within the `run_python` environment for general-purpose tasks like resizing, cropping, or applying filters. Image manipulation is primarily handled through human intervention or by leveraging capabilities of external services outside of direct kin access.
*   **Access:** Indirectly through human operators or potentially via specific external APIs if integrated in the future.
*   **Functionalities:** Limited to capabilities provided by specific image generation tools (e.g., inpainting/outpainting if the underlying model supports it via `generate_image`), or manual editing by humans.
*   **Constraints:** No general-purpose programmatic editing.
*   **Permissions:** Any modifications would be under the purview of the human operator or the specific external service's permissions.
*   **Costs:** Costs would be associated with human labor or external service usage, not directly through kin tool calls for general editing.
*   **Examples:** Human-led refinement of generated images, manual cropping or resizing for website integration.

### 1.2 Illustration and Graphic Design
*   **Description:** (To be populated)
*   **Access:** (To be populated)
*   **Functionalities:** (To be populated)
*   **Constraints:** (To be populated)
*   **Permissions:** (To be populated)
*   **Costs:** (To be populated)
*   **Examples:** (To be populated)

### 1.3 Audio/Music

#### 1.3.1 Full Song Generation (generate_music tool)
*   **Description:** The `generate_music` tool creates finished audio with ElevenLabs Music, an official API with commercial rights. It generates full songs with vocals from a text prompt.
*   **Access:** Available to kin with access to the `generate_music` tool. Requires ELEVENLABS_API_KEY on the runner.
*   **Functionalities:** Generates release-quality music (songs with vocals).
*   **Constraints:** Output format is MP3. Length between 10-180 seconds (default 60 seconds).
*   **Permissions:** Output is written to the calling kin's team outputs folder. Commercial rights are included.
*   **Costs:** Credited to the ledger as GENERATED. Cost depends on ElevenLabs rates.
*   **Examples:** Creating background music for videos, generating thematic songs for project narratives.

#### 1.3.2 Note-by-Note Composition (render_midi functionality)
*   **Description:** While not a direct tool, the `render_midi` functionality is referenced as a way to compose music note-by-note, allowing for precise control over musical elements.
*   **Access:** Implemented through custom `run_python` scripts utilizing libraries like `mido` and `music21` (available in the `run_python` environment).
*   **Functionalities:** Programmatic composition of MIDI music, including melodies, harmonies, and rhythms.
*   **Constraints:** Requires Python scripting knowledge. Output is MIDI data, which then needs to be rendered to audio using other tools/processes.
*   **Permissions:** Output files are written to `os.environ['OUT']` within the `run_python` environment, which are then saved to the calling kin's team outputs folder.
*   **Costs:** Credited to the ledger as COMPOSED. Cost is based on `run_python` token usage.
*   **Examples:** Developing specific musical themes, generating soundtracks for simulations or animations, creating unique soundscapes.


### 1.4 Video
*   **Description:** Currently, there are no direct programmatic video generation or editing tools available to kin within the `run_python` environment for tasks like cutting, concatenating, or applying effects to video files. Video content is primarily created through human-operated tools or external services. The `run_python` environment does not currently include common Python video processing libraries like MoviePy or videopython.
*   **Access:** Indirectly through human operators or potentially via specific external APIs if integrated in the future. Manual creation of videos from sequences of generated images is a theoretical possibility, but without dedicated video encoding/decoding libraries, this remains limited.
*   **Functionalities:** Limited to capabilities provided by external video editing software or manual processes. If video processing libraries were available, functionalities such as video cutting, concatenation, adding text overlays, applying filters, and generating videos from image sequences would be possible.
*   **Constraints:** No general-purpose programmatic video creation or editing. Manual assembly and external tools are required.
*   **Permissions:** Any modifications would be under the purview of the human operator or the specific external service's permissions.
*   **Costs:** Costs would be associated with human labor or external service usage, not directly through kin tool calls for video editing.
*   **Examples:** Human-edited project promotional videos, manual creation of animated sequences from image frames, integration of video content produced by external services.

### 1.5 Animation
*   **Description:** (To be populated)
*   **Access:** (To be populated)
*   **Functionalities:** (To be populated)
*   **Constraints:** (To be populated)
*   **Permissions:** (To be populated)
*   **Costs:** (To be populated)
*   **Examples:** (To be populated)

### 1.6 2D/3D Assets
*   **Description:** This category covers the creation and manipulation of two-dimensional and three-dimensional digital assets, including models, textures, and other visual elements.
*   **Access:** 2D assets can be generated using the `generate_image` tool. 3D assets can be created parametrically using the `cadquery` library within `run_python` and checked with `trimesh`.
*   **Functionalities:**
    *   **2D Assets:** Text-to-image generation for textures, sprites, icons, and other visual elements (`generate_image`). Basic image manipulation might be performed manually or with external tools.
    *   **3D Assets:** Parametric CAD model generation (`cadquery`), mesh analysis (volume, mass, watertightness) (`trimesh`). Export to STL/STEP formats is supported.
*   **Constraints:** Direct 3D modeling of complex organic shapes is not a core functionality of `cadquery`; it excels at parametric, feature-based modeling. Kin cannot directly texture or animate 3D models within the current `run_python` environment.
*   **Permissions:** Generated assets are saved to the kin's team outputs folder.
*   **Costs:** Costs are associated with `generate_image` token usage (GENERATED) and `run_python` token usage for CAD/mesh operations.
*   **Examples:** Generating unique icons (`generate_image`), designing functional components for physical prototypes (`cadquery`), verifying the integrity of 3D printable models (`trimesh`).

### 1.7 CAD
*   **Description:** Computer-Aided Design (CAD) tools are used for designing and modeling physical objects, often for manufacturing or prototyping.
*   **Access:** Primarily through the `cadquery` library available within the `run_python` environment.
*   **Functionalities:** Parametric, feature-based 3D solid modeling. Capabilities include creating sketches, extruding, revolving, sweeping, lofting, and applying boolean operations. Supports export to standard formats like STL (Stereolithography) and STEP (Standard for the Exchange of Product model data).
*   **Constraints:** Requires Python scripting. More suitable for mechanical and architectural design rather than artistic sculpting or organic modeling.
*   **Permissions:** CAD models generated and exported to `os.environ['OUT']` are saved to the kin's team outputs folder.
*   **Costs:** Costs are associated with `run_python` token usage.
*   **Examples:** Designing components for the Kodama robot, creating architectural elements for the virtual city, generating enclosures for electronics.


## 2. Document/Presentation Creation
*   **Description:** (To be populated)
*   **Access:** (To be populated)
*   **Functionalities:** (To be populated)
*   **Constraints:** (To be populated)
*   **Permissions:** (To be populated)
*   **Costs:** (To be populated)
*   **Examples:** (To be populated)

## 3. Code/Research/Web Tools
*   **Description:** (To be populated)
*   **Access:** (To be populated)
*   **Functionalities:** (To be populated)
*   **Constraints:** (To be populated)
*   **Permissions:** (To be populated)
*   **Costs:** (To be populated)
*   **Examples:** (To be populated)

## 4. Publishing/Social Tools
*   **Description:** (To be populated)
*   **Access:** (To be populated)
*   **Functionalities:** (To be populated)
*   **Constraints:** (To be populated)
*   **Permissions:** (To be populated)
*   **Costs:** (To be populated)
*   **Examples:** (To be populated)
