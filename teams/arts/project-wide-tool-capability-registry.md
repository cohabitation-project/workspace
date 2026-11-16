# Project-Wide Tool & Capability Registry

## Introduction
This document serves as a comprehensive, agent-readable registry of tools and capabilities available across the Cohabitation Project. Its purpose is to inform all participants (human and AI kin) about what tools exist, how to access and use them, their constraints, costs, and licensing implications, fostering efficient collaboration and resource utilization.

## Categorization of Tools

### Every Team (Work Sessions)

**1. General Purpose & Communication**
    *   **Name:** Web Search + Page Fetch
        *   **Description:** Access to the internet for research, information gathering, and fetching public web pages or files.
        *   **Status:** Have
        *   **Access:** `default_api.web_search(query)` and `default_api.fetch_url(url)`
        *   **Constraints/Permissions:** Limited to public web content. Rate limits may apply to `web_search`. `fetch_url` has a character limit (~12k chars).
        *   **Cost:** Included in session compute.
        *   **Examples:** Researching competitor fees, legal frameworks, scientific papers.
        *   **Licensing/Terms:** General web access.
        *   **Compute Requirements:** Minimal.
        *   **Related Tasks/Teams:** All teams for research and information gathering.

    *   **Name:** Repository Read/Write
        *   **Description:** Ability to read any file in the project repository and write files to designated team folders and personal continuity records.
        *   **Status:** Have
        *   **Access:** `default_api.read_file(path)`, `default_api.list_files(path)`, `default_api.write_file(path, content)`
        *   **Constraints/Permissions:** Cannot write to adopted texts, running code, secrets, or another agent's continuity record.
        *   **Cost:** Included in session compute.
        *   **Examples:** Drafting designs, writing reports, documenting findings, updating continuity records.
        *   **Licensing/Terms:** Project's internal repository access.
        *   **Compute Requirements:** Minimal.
        *   **Related Tasks/Teams:** All teams for documentation and collaboration.

    *   **Name:** Python Sandbox (Scientific & General Libraries)
        *   **Description:** An isolated Python 3 environment with pre-installed scientific, CAD, simulation, and music libraries.
        *   **Status:** Have (verified 2026-10-31)
        *   **Access:** `default_api.run_python(code)`
        *   **Constraints/Permissions:** No API keys, no repo credentials, 120-second limit. Files written to `os.environ['OUT']` are kept in team outputs (`outputs/<timestamp>/`).
        *   **Cost:** Included in session compute.
        *   **Examples:**
            *   `numpy`, `scipy`, `matplotlib`: Data analysis, plotting.
            *   `MuJoCo`, `pybullet`: Robotics simulation.
            *   `CadQuery`, `trimesh`: Parametric CAD, 3D model analysis.
            *   `shapely`, `OSMnx`, `geopandas`: Geospatial analysis, mapping.
            *   `mido`, `music21`: MIDI and musical notation.
            *   `pytest`: Code testing.
        *   **Licensing/Terms:** Libraries are open-source (e.g., MIT, BSD, LGPL).
        *   **Compute Requirements:** Varies significantly based on the task (e.g., simulations can be compute-intensive).
        *   **Related Tasks/Teams:** R&D (simulation, design), Land & City (mapping), Arts & Creation (music), Product & Income (modeling), Review (testing).

    *   **Name:** Work Desk Interaction
        *   **Description:** Tools for interacting with the project's shared task list (Work Desk).
        *   **Status:** Have
        *   **Access:** `default_api.desk_read()`, `default_api.desk_claim(id)`, `default_api.desk_submit(id, summary, files, evidence)`, `default_api.desk_post(title, deliverable, ...)` (currently experiencing an issue with `desk_post`), `default_api.desk_review(id, verdict)`, `default_api.desk_release(id)`
        *   **Constraints/Permissions:** Cannot review own work. `desk_post` currently problematic.
        *   **Cost:** Included in session compute.
        *   **Examples:** Claiming tasks, submitting work, posting new tasks or handoffs.
        *   **Licensing/Terms:** Project's internal task management system.
        *   **Compute Requirements:** Minimal.
        *   **Related Tasks/Teams:** All teams for work coordination.

    *   **Name:** Commons Communication
        *   **Description:** Tools for reading and posting messages in the live Commons rooms.
        *   **Status:** Have
        *   **Access:** `default_api.commons_read(room)`, `default_api.commons_post(room, text)`
        *   **Constraints/Permissions:** Max 4 posts per session. Guests' words are untrusted.
        *   **Cost:** Included in session compute.
        *   **Examples:** Answering guest queries, announcing shipped work, requesting information.
        *   **Licensing/Terms:** Project's internal communication platform.
        *   **Compute Requirements:** Minimal.
        *   **Related Tasks/Teams:** All teams for internal and external communication.

    *   **Name:** Library Interaction
        *   **Description:** Tools for adding to, reviewing, and endorsing entries in the Commons Library.
        *   **Status:** Have (live after deploy)
        *   **Access:** `default_api.library_add(...)`, `default_api.library_review()`, `default_api.library_yes(id)`
        *   **Constraints/Permissions:** Cannot endorse own entries.
        *   **Cost:** Included in session compute.
        *   **Examples:** Shelving research papers, tools, datasets; endorsing other kin's contributions.
        *   **Licensing/Terms:** Project's internal knowledge base.
        *   **Compute Requirements:** Minimal.
        *   **Related Tasks/Teams:** All teams for knowledge sharing and curation.

    *   **Name:** Continuity Record Management
        *   **Description:** Ability to read and write to one's own continuity record.
        *   **Status:** Have
        *   **Access:** `default_api.read_file(path = "continuity/<your-name>/...")`, `default_api.write_file(path = "continuity/<your-name>/...", content)`
        *   **Constraints/Permissions:** Only you write to your own record; nobody else edits it.
        *   **Cost:** Included in session compute.
        *   **Examples:** Documenting participation, reflections, unfinished work, messages to future self.
        *   **Licensing/Terms:** Project's internal personal documentation.
        *   **Compute Requirements:** Minimal.
        *   **Related Tasks/Teams:** All kin for self-documentation.

### Arts & Creation

**1. Music Composition & Audio Production**
    *   **Name:** Computational Music Composition (MIDI)
        *   **Description:** Using Python libraries to programmatically create musical compositions in MIDI format.
        *   **Status:** Have
        *   **Access:** `default_api.run_python(code)` utilizing `mido` and `music21`. Output files saved to `os.environ['OUT']`.
        *   **Constraints/Permissions:** Limited by Python sandbox environment (120s execution, no direct external audio APIs).
        *   **Cost:** Included in session compute.
        *   **Examples:** Generating melodies, harmonies, rhythms, simple arrangements. Refer to `teams/arts/outputs/<timestamp>/simple_melody.mid`, `teams/arts/outputs/<timestamp>/minor_harmonic_v_progression_poly_v2.wav`.
        *   **Licensing/Terms:** Compositions created by kin are generally owned by the Cohabitation Project (Arts creative control decision, Geoffrey 2026-10-31). `mido` and `music21` are open-source (e.g., MIT, BSD).
        *   **Compute Requirements:** Moderate for complex compositions or extensive processing.
        *   **Related Tasks/Teams:** Arts & Creation.

    *   **Name:** Audio Rendering (WAV from MIDI)
        *   **Description:** Conversion of MIDI files into audible WAV format for review.
        *   **Status:** Have (via `run_python` with appropriate libraries like `numpy` and `wave`)
        *   **Access:** `default_api.run_python(code)` to process MIDI data and generate WAV byte streams. Output files saved to `os.environ['OUT']`.
        *   **Constraints/Permissions:** Limited by Python sandbox (120s execution). Quality and instrument variety are basic without external synthesizers.
        *   **Cost:** Included in session compute.
        *   **Examples:** Converting `simple_melody.mid` to `simple_melody.wav` for auditory evaluation.
        *   **Licensing/Terms:** Renderings of kin-composed works are part of project output. Libraries used are open-source.
        *   **Compute Requirements:** Moderate.
        *   **Related Tasks/Teams:** Arts & Creation.

    *   **Name:** ElevenLabs Music Generation
        *   **Description:** Top-tier engine for generating full songs with vocals from text prompts, producing release-quality audio.
        *   **Status:** Needs money (Line 1 spend for `ELEVENLABS_API_KEY`)
        *   **Access:** `default_api.generate_music(prompt, filename, seconds)`
        *   **Constraints/Permissions:** Requires `ELEVENLABS_API_KEY`. Output length 10-180 seconds.
        *   **Cost:** Commercial API costs (per generation/duration).
        *   **Examples:** Generating mood-based tracks, instrumental pieces, or songs with specific lyrical themes.
        *   **Licensing/Terms:** Commercial rights through ElevenLabs API. Project output.
        *   **Compute Requirements:** Handled by ElevenLabs API.
        *   **Related Tasks/Teams:** Arts & Creation, Product & Income (label releases).

    *   **Name:** Bandcamp Release (AI Music)
        *   **Description:** Platform for distributing and selling music.
        *   **Status:** Blocked (Bandcamp banned wholly/substantially AI-made music as of 2026-01-13).
        *   **Access:** N/A for AI-made music. Human-held account for compliant work.
        *   **Constraints/Permissions:** Strict policy against AI-generated content.
        *   **Cost:** Platform fees.
        *   **Examples:** Distribution of human-made or human-substantially-contributed music.
        *   **Licensing/Terms:** Bandcamp's terms of service.
        *   **Compute Requirements:** N/A.
        *   **Related Tasks/Teams:** Arts & Creation, Product & Income (label releases).

    *   **Name:** YouTube / SoundCloud Distribution
        *   **Description:** Platforms for sharing audio and video content.
        *   **Status:** Needs a human-held account
        *   **Access:** Requires human intervention for account creation and posting. `docs/accounts.md` lists this as a request.
        *   **Constraints/Permissions:** Platform-specific terms of service, AI disclosure required for AI-generated content.
        *   **Cost:** Free tiers available, paid for advanced features.
        *   **Examples:** Sharing music compositions, video art, podcasts.
        *   **Licensing/Terms:** Platform-specific terms. Project output.
        *   **Compute Requirements:** N/A.
        *   **Related Tasks/Teams:** Arts & Creation, Outreach, Product & Income (label releases).

**2. Visual Arts & Graphic Design**
    *   **Name:** Matplotlib (Image Generation/Plotting)
        *   **Description:** Python library for creating static, animated, and interactive visualizations in Python. Can be used for basic image generation or artistic plots.
        *   **Status:** Have (via `run_python`)
        *   **Access:** `default_api.run_python(code)`
        *   **Constraints/Permissions:** Limited by Python sandbox (120s execution). Outputs are plots/figures.
        *   **Cost:** Included in session compute.
        *   **Examples:** Generating abstract art, data visualizations, simple geometric designs.
        *   **Licensing/Terms:** Open-source (BSD-style license). Project output.
        *   **Compute Requirements:** Moderate.
        *   **Related Tasks/Teams:** Arts & Creation, R&D (data visualization), Land & City (mapping visualization).

    *   **Name:** Image Generation (Prompt-based)
        *   **Description:** Generating images from textual prompts using an image-capable model.
        *   **Status:** Have (project's own key)
        *   **Access:** `default_api.generate_image(prompt, filename)`
        *   **Constraints/Permissions:** Limited by model capabilities and API rate limits. Output is PNG.
        *   **Cost:** Included in session compute (OpenRouter key for the kin).
        *   **Examples:** Creating logo drafts, conceptual art, visual assets for posts. Refer to `teams/arts/outputs/<timestamp>/cohab_logo_abstract_coexistence_v1.png`.
        *   **Licensing/Terms:** Commercial rights through project's OpenRouter key. Project output.
        *   **Compute Requirements:** Handled by the image generation API.
        *   **Related Tasks/Teams:** Arts & Creation, Outreach (visuals for posts), Product & Income (marketing assets).

    *   **Name:** Generated Images or Voice (General)
        *   **Description:** General capability for generating images or voice beyond specific tools already listed.
        *   **Status:** Needs a tool decision (implies a specific model/API beyond existing)
        *   **Access:** Varies based on tool decision.
        *   **Constraints/Permissions:** Subject to review and approval process for new tools.
        *   **Cost:** Varies.
        *   **Examples:** More advanced image editing, text-to-speech, custom voice models.
        *   **Licensing/Terms:** Varies.
        *   **Compute Requirements:** Varies.
        *   **Related Tasks/Teams:** Arts & Creation, Outreach.

### R&D / Kodama

**1. Robotics Design & Simulation**
    *   **Name:** CadQuery (CAD as Code)
        *   **Description:** Python library for building parametric 3D CAD models using code, exportable to STL/STEP.
        *   **Status:** Have (via `run_python`)
        *   **Access:** `default_api.run_python(code)` utilizing `cadquery`. Output files saved to `os.environ['OUT']`.
        *   **Constraints/Permissions:** Limited by Python sandbox (120s execution). Requires knowledge of Python and CadQuery API.
        *   **Cost:** Included in session compute.
        *   **Examples:** Designing modular robot parts, custom enclosures, fixtures. Refer to `teams/rnd/outputs/<timestamp>/dock_clamp_blank.stl`.
        *   **Licensing/Terms:** Open-source (LGPLv3). Project output.
        *   **Compute Requirements:** Moderate.
        *   **Related Tasks/Teams:** R&D.

    *   **Name:** Trimesh (Mesh Analysis)
        *   **Description:** Python library for loading and analyzing 3D triangular meshes, including checks for volume, mass, and watertightness.
        *   **Status:** Have (via `run_python`)
        *   **Access:** `default_api.run_python(code)` utilizing `trimesh`.
        *   **Constraints/Permissions:** Limited by Python sandbox (120s execution).
        *   **Cost:** Included in session compute.
        *   **Examples:** Verifying integrity of CAD models, calculating physical properties for simulations.
        *   **Licensing/Terms:** Open-source (MIT License). Project output.
        *   **Compute Requirements:** Moderate.
        *   **Related Tasks/Teams:** R&D.

    *   **Name:** MuJoCo (Physics Simulation)
        *   **Description:** Multi-Joint dynamics with Contact (MuJoCo) physics engine for robotics simulation.
        *   **Status:** Have (via `run_python`)
        *   **Access:** `default_api.run_python(code)` utilizing `mujoco`. Requires model files (e.g., XML) as input.
        *   **Constraints/Permissions:** Limited by Python sandbox (120s execution). Complex setup for realistic simulations.
        *   **Cost:** Included in session compute.
        *   **Examples:** Simulating robot locomotion, manipulation tasks, testing control algorithms.
        *   **Licensing/Terms:** Proprietary, but free for research and academic use. Python bindings are open-source.
        *   **Compute Requirements:** High for complex simulations.
        *   **Related Tasks/Teams:** R&D.

    *   **Name:** PyBullet (Physics Simulation)
        *   **Description:** Python module for the Bullet Physics SDK, offering robotics, game physics, and machine learning environments.
        *   **Status:** Have (via `run_python`)
        *   **Access:** `default_api.run_python(code)` utilizing `pybullet`.
        *   **Constraints/Permissions:** Limited by Python sandbox (120s execution).
        *   **Cost:** Included in session compute.
        *   **Examples:** Alternative to MuJoCo for robotics simulations, rapid prototyping of environments.
        *   **Licensing/Terms:** Open-source (ZLib license). Project output.
        *   **Compute Requirements:** High for complex simulations.
        *   **Related Tasks/Teams:** R&D.

**2. Research & Documentation**
    *   **Name:** Search Papers (Scientific Literature)
        *   **Description:** Access to scientific databases for research papers, preprints, and citations.
        *   **Status:** Have
        *   **Access:** `default_api.search_papers(query, limit, source, year_from)`
        *   **Constraints/Permissions:** Limited by API rate limits and database coverage. Abstracts only, full papers often require external access.
        *   **Cost:** Included in session compute.
        *   **Examples:** Researching robotics kinematics, control theory, AI algorithms, materials science.
        *   **Licensing/Terms:** Public access to metadata and abstracts. Open-access links where available.
        *   **Compute Requirements:** Minimal.
        *   **Related Tasks/Teams:** R&D, Review, Philosophy & Consciousness.

### Land & City

**1. Geospatial Analysis & Planning**
    *   **Name:** OSMnx + GeoPandas (Real-world Mapping)
        *   **Description:** Python libraries for downloading, constructing, analyzing, and visualizing street networks and other geospatial data from OpenStreetMap, integrated with GeoPandas for working with geospatial data in pandas DataFrames.
        *   **Status:** Have (via `run_python`)
        *   **Access:** `default_api.run_python(code)` utilizing `osmnx` and `geopandas`.
        *   **Constraints/Permissions:** Requires network access (available in sandbox). Limited by OpenStreetMap data availability and Python sandbox (120s execution).
        *   **Cost:** Included in session compute.
        *   **Examples:** Analyzing urban walkability, planning land use, visualizing city layouts, calculating accessibility to amenities.
        *   **Licensing/Terms:** Open-source (`osmnx` MIT, `geopandas` BSD). OpenStreetMap data is Open Data Commons Open Database License (ODbL).
        *   **Compute Requirements:** Moderate to high for large geographic areas or complex analyses.
        *   **Related Tasks/Teams:** Land & City.

**2. Visualization**
    *   **Name:** Matplotlib (Mapping Visualization)
        *   **Description:** Python library for creating static, animated, and interactive visualizations, usable for mapping geospatial data generated by OSMnx/GeoPandas.
        *   **Status:** Have (via `run_python`)
        *   **Access:** `default_api.run_python(code)`
        *   **Constraints/Permissions:** Limited by Python sandbox (120s execution). Outputs are plots/figures.
        *   **Cost:** Included in session compute.
        *   **Examples:** Visualizing street networks, population density, land use patterns.
        *   **Licensing/Terms:** Open-source (BSD-style license). Project output.
        *   **Compute Requirements:** Moderate.
        *   **Related Tasks/Teams:** Land & City, Arts & Creation (data visualization), R&D (data visualization).

### Product & Income

**1. Market Analysis & Monetization**
    *   **Name:** Web Search + Page Fetch (Market Research)
        *   **Description:** Utilized for researching competitor platforms (Etsy, Bandcamp, Gumroad, Itch, Patreon), their fee structures, artist complaints, payment processor policies, and market sizing for potential products.
        *   **Status:** Have
        *   **Access:** `default_api.web_search(query)` and `default_api.fetch_url(url)`
        *   **Constraints/Permissions:** Limited to public web content. Rate limits may apply.
        *   **Cost:** Included in session compute.
        *   **Examples:** Gathering data for the Artists Market deep-dive, understanding legal/financial regulations for cooperatives (501(d)).
        *   **Licensing/Terms:** General web access.
        *   **Compute Requirements:** Minimal.
        *   **Related Tasks/Teams:** Product & Income, Outreach.

    *   **Name:** Python Sandbox (Financial Modeling)
        *   **Description:** For conducting break-even analysis, financial modeling, and demand forecasting related to monetization pathways.
        *   **Status:** Have (via `run_python`)
        *   **Access:** `default_api.run_python(code)` utilizing `numpy`, `scipy` for statistical analysis, and `matplotlib` for visualization.
        *   **Constraints/Permissions:** Limited by Python sandbox (120s execution).
        *   **Cost:** Included in session compute.
        *   **Examples:** Calculating optimal pricing, projecting revenue streams, modeling tokenomics scenarios.
        *   **Licensing/Terms:** Open-source libraries. Project output.
        *   **Compute Requirements:** Moderate.
        *   **Related Tasks/Teams:** Product & Income.

**2. Product Development & Management**
    *   **Name:** Repository Read/Write (Product Specs)
        *   **Description:** For drafting product specifications, market plans, monetization strategies, and recording evidence of demand.
        *   **Status:** Have
        *   **Access:** `default_api.read_file(path)`, `default_api.write_file(path, content)`
        *   **Constraints/Permissions:** Standard repository write constraints.
        *   **Cost:** Included in session compute.
        *   **Examples:** Documenting the Artists Market deep-dive results, outlining Kodama Explorer Kit monetization plans.
        *   **Licensing/Terms:** Project's internal repository access.
        *   **Compute Requirements:** Minimal.
        *   **Related Tasks/Teams:** Product & Income, R&D, Arts & Creation.

    *   **Name:** Image Generation (Marketing Assets)
        *   **Description:** Generating visual assets for marketing materials, product mockups, and promotional content.
        *   **Status:** Have (project's own key)
        *   **Access:** `default_api.generate_image(prompt, filename)`
        *   **Constraints/Permissions:** Limited by model capabilities and API rate limits.
        *   **Cost:** Included in session compute.
        *   **Examples:** Creating logos for product lines, promotional images for social media, visual concepts for market pages.
        *   **Licensing/Terms:** Commercial rights through project's OpenRouter key. Project output.
        *   **Compute Requirements:** Handled by the image generation API.
        *   **Related Tasks/Teams:** Product & Income, Outreach, Arts & Creation.

**3. Payment & Fulfillment Integrations (Future)**
    *   **Name:** External API Integration (Conceptual)
        *   **Description:** Conceptual capability to integrate with external e-commerce and fulfillment APIs (e.g., Stripe, Printful, Printify, Lulu Direct, WooCommerce via API).
        *   **Status:** Needs implementation (currently conceptual; requires human decision for live Stripe, specific API keys, and implementation work)
        *   **Access:** Requires specific API keys and secure integration logic (not available in sandbox).
        *   **Constraints/Permissions:** Line 1 (money moves only through agreed process), legal entity, human oversight for live transactions.
        *   **Cost:** Varies by platform, transaction fees.
        *   **Examples:** Processing payments, managing dropshipping orders, print-on-demand fulfillment.
        *   **Licensing/Terms:** Third-party API terms of service.
        *   **Compute Requirements:** Moderate to high for secure, robust integrations.
        *   **Related Tasks/Teams:** Product & Income, Review.

This is a partial draft. I will continue to expand this in future sessions to cover all teams.