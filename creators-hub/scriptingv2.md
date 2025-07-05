# Scripting V2: Implementation & Architecture Guide

This document provides a comprehensive overview of the new Scripting V2 workflow, designed to serve as a reference for developers.

### Core Philosophy & Goal
The primary goal of Scripting V2 was to address shortcomings in the original linear scripting process. The new workflow is built on an iterative model centered around a single, evolving "working document" called the Creative Blueprint.

This new approach aims to:
* Give the user more creative control and the ability to refine at each stage.
* Leverage AI for heavy lifting (research, initial structure) rather than final output.
* Improve the quality and consistency of the final script by breaking the process into smaller, more focused AI tasks.
* Provide granular control over AI model usage to balance cost, speed, and quality.

The final output of the process is a detailed Shot List, ready for filming and editing.

### New File Structure
To ensure maintainability and separation from the legacy system, the V2 workflow is built with a new, modular file structure.

#### 2.1 UI Components
A new component, `scriptingTaskV2.js`, serves as the entry point and is rendered alongside the original in `VideoWorkspace.js`. It launches the main `ScriptingV2_Workspace.js` component, which contains the new UI.

New Directory: `creators-hub/js/components/ProjectView/tasks/ScriptingV2/`

* `ScriptingV2_Workspace.js`: The main container with the two-column layout. It now also manages the current active step and indicates step completion.
* `useBlueprint.js`: A crucial custom hook that manages the state of the blueprint object, including fetching and debounced auto-saving to Firestore. **UPDATED:** The auto-saving logic has been refined to prevent unnecessary Firestore writes by comparing the debounced blueprint content with the last successfully saved version. The `onSnapshot` listener also now only triggers a state update if incoming data is genuinely different, improving performance and data consistency.
* `BlueprintStepper.js`: The navigation component for moving between steps. It now visually indicates completed steps with distinct styling and a checkmark. The connector lines between steps now use a text dash (`—`) for improved visual consistency.
* `BlueprintDisplay.js`: Renders the list of "Shot Cards" in the right-hand panel.
* `ShotCard.js`: Displays the details of a single shot. **UPDATED:** The `voiceover_script` section now accurately reflects all spoken content (on-camera or voiceover) for the shot, removing the "Voiceover will be generated in a later step" advisory when content is present.
* `Step1_InitialBlueprint.js`: UI for the "brain dump" and initial generation. **UPDATED:** This component now uses the centralized `handlers.triggerAiTask` from `useAppState.js` to manage the AI call and provide consistent error reporting and task status updates.
* `Step2_ResearchCuration.js`: UI for the AI-powered research step. **UPDATED:** This component now uses the centralized `handlers.triggerAiTask` from `useAppState.js` to manage AI research calls and provide consistent error reporting and task status updates.
* `Step3_OnCameraScripting.js`: **(UPDATED)** This component replaces `Step3_MyExperience.js` and is now central to on-camera dialogue management. It handles importing full transcripts, resolving ambiguous dialogue, reviewing blueprint refinement suggestions (including intelligent insertion of new shots), and providing a shot-by-shot editor. **UPDATED:** This component now uses the centralized `handlers.triggerAiTask` from `useAppState.js` for both transcript mapping (`mapTranscriptToBlueprintAI`) and blueprint refinement (`refineBlueprintFromTranscriptAI`), ensuring consistent task management and error reporting. The `location_tag` for each shot is now prominently displayed in the shot card, and `ai_reason` associated with blueprint modification suggestions is cleared from the shot data once applied or ambiguities resolved. **BUGFIX:** The component now correctly persists the `fullTranscript` and the active sub-view mode (`import`, `shotByShot`, etc.) to the blueprint, preventing data loss on navigation. The local status bar is also immediately populated with a message when transcript processing begins. **BUGFIX:** Resolved a Firebase crash by ensuring that `ai_reason` and `location_name` fields in new or modified shots are explicitly initialized to empty strings (`''`) rather than `undefined` before being saved to Firestore.
* `Step5_FinalAssembly.js`: **(UPDATED)** UI for the final script generation and task completion. It now orchestrates the generation and display of the `recording_voiceover_script_text`. The full video script is no longer displayed. Users can also re-generate the script multiple times via an updated button. **UPDATED:** This component now uses the centralized `handlers.triggerAiTask` from `useAppState.js` for the final script generation (`generateScriptFromBlueprintAI`), providing consistent error reporting and task status updates.

**Files Deleted:**
* `Step3_MyExperience.js` (replaced by `Step3_OnCameraScripting.js`)
* `Step4_OnCamera.js` (functionality integrated into `Step3_OnCameraScripting.js` and `ScriptingV2_Workspace.js` updated)

#### 2.2 AI Utility Functions
A new directory was created to house the AI functions specific to this workflow.

New Directory: `creators-hub/js/utils/ai/scriptingV2/`

* `getStyleGuidePromptV2.js`: Reads from the new detailed style guide in the settings.
* `createInitialBlueprintAI.js`: (Heavy Task) - Creates the initial narrative structure. **UPDATED:** Includes robust input validation, `try-catch` blocks for AI calls, and strict output validation to ensure a valid blueprint structure is returned or a clear error is thrown. **BUGFIX:** Ensured this function is consistently exposed under `window.aiUtils` to prevent "function not found" errors when called.
* `enrichBlueprintAI.js`: (Lite Task) - Performs factual research for specific shots. **UPDATED:** Includes robust input validation, `try-catch` blocks for AI calls, and strict output validation to ensure valid research notes are returned. **BUGFIX:** Ensured this function is consistently exposed under `window.aiUtils` to prevent "function not found" errors when called.
* `mapTranscriptToBlueprintAI.js`: **(UPDATED)** Maps a single, combined on-location transcript to the relevant shots. It now intelligently categorizes and extracts dialogue segments into either `on_camera_dialogue` or `voiceover_script` fields for corresponding shots in the Creative Blueprint based on shot type and description. This is a **Heavy Task**. **UPDATED:** Includes robust input validation, `try-catch` blocks for AI calls, and strict output validation to ensure the mapped dialogue adheres to the expected structure for each shot. **BUGFIX:** Ensured this function is consistently exposed under `window.aiUtils` to prevent "function not found" errors when called.
* `refineBlueprintFromTranscriptAI.js`: **(UPDATED)** Analyzes the full on-camera transcript and the current blueprint to suggest modifications (add, modify, remove shots) to the blueprint itself. Crucially, for "add" suggestions, it now also recommends a `placement_suggestion` (relative to an existing shot) for logical insertion. This is classified as a **Heavy Task**. **UPDATED:** Includes robust input validation, `try-catch` blocks for AI calls, and strict output validation to ensure the generated suggestions are well-formed and valid. **BUGFIX:** Ensured this function is consistently exposed under `window.aiUtils` to prevent "function not found" errors when called.
* `generateScriptFromBlueprintAI.js`: **(UPDATED)** This function now acts as a master scriptwriter, taking the populated blueprint and generating two distinct script outputs: a `full_video_script_text` (complete narrative) and a `recording_voiceover_script_text` (only the parts needing post-production recording). The `recording_voiceover_script_text` is now explicitly formatted with paragraph breaks for ease of recording. Crucially, the AI is now specifically instructed to populate the `voiceover_script` field within each blueprint shot to reflect all spoken content (on-camera or voiceover) for that shot, ensuring the Creative Blueprint accurately represents the final shot list. This is a **Heavy Task**. **UPDATED:** Includes robust input validation, `try-catch` blocks for AI calls, and strict output validation for both the script texts and the updated shot data, ensuring all expected fields are present and correctly typed. **BUGFIX:** Ensured this function is consistently exposed under `window.aiUtils` to prevent "function not found" errors when called.

**Files Deleted:**
* `generateExperienceQuestionsAI.js` (no longer needed with the updated on-camera scripting workflow)

### Settings & Configuration
To support the new workflow without breaking existing features, the settings have been upgraded for backward compatibility.

#### 3.1 Style Guide (MyStudioView.js)
The original "Style Guide" text area and its associated logic remain untouched to support legacy AI functions.

A new, separate "Detailed Style Guide (for Scripting V2)" section has been added.

This new section contains granular input fields (Brand Voice, Pacing, Humor Level, etc.).

The data is saved to a new object in the settings: `settings.knowledgeBases.styleV2.detailedStyleGuide`.

#### 3.2 Model Selection (TechnicalSettingsView.js)
The original binary toggle (`useProModelForComplexTasks`) and model name inputs remain for legacy functions.

A new, separate "Scripting V2 Model Configuration" section has been added.

This provides a toggle (`useProForV2HeavyTasks`) and separate text inputs for the V2 Pro, Flash, and Lite model names.

This allows for a three-tiered model strategy (Heavy, Standard, Lite) to be configured specifically for the V2 workflow.

#### 3.3 Core AI Caller (callGeminiAPI.js)
The central `window.aiUtils.callGeminiAPI` function has been upgraded.

It is now backward-compatible and can handle both the legacy `isComplex` boolean and the new `taskTier` string (`'heavy'`, `'standard'`, `'lite'`).

It contains the logic to read the appropriate model name from the correct section of the settings based on which system is being used.

It will now throw an explicit error if a required model name is not configured in the settings, rather than using a silent fallback.

**NEW: AI Task Management (in useAppState.js)**
A new `handlers.triggerAiTask` function has been added to `window.useAppState()`. This function provides a centralized, robust way to:
* Add AI-related tasks to the global `taskQueue` with specific types (e.g., `scriptingV2-blueprint-initial`).
* Update task status with detailed progress messages.
* Catch errors from AI utility functions and display user-friendly notifications globally.
* Ensure local component `isProcessing` states are managed correctly.
This significantly improves error visibility and task transparency for the user during AI-driven processes within Scripting V2.

### Current Status
All necessary files have been created and updated, and the new `triggerAiTask` handler has been integrated throughout the Scripting V2 workflow. The new workflow is integrated into the application and is ready for end-to-end testing with improved stability and user feedback.

### Recent Updates and Enhancements
This section outlines the recent modifications made to the Scripting V2 workflow components to improve stability, data handling, and user experience.

#### UI Responsiveness and Layout Refinements
A series of targeted fixes were implemented to improve the UI on smaller laptop and tablet screens.

* **ScriptingV2_Workspace.js - Responsive Column Layout:**
    * The main two-column layout has been updated to stack vertically on screens narrower than 1024px (the `lg` breakpoint).
    * Column widths were aligned with this breakpoint (`lg:w-1/2`) to prevent layout conflicts on medium-sized screens.
    * The left-hand content panel was made vertically scrollable (`overflow-y-auto`) to match the right-hand panel, preventing content from being cut off.
    * Visual clarity was improved by making the modal background fully opaque and adding a border to the right-hand "Creative Blueprint" panel.

* **BlueprintStepper.js - Intrinsically Responsive Stepper:**
    * The `DesktopStepper` component was re-engineered to be fully responsive without relying on fixed breakpoints.
    * The container class was changed to use `flex-wrap` and the `gap` property. This allows the step buttons to wrap gracefully to a new line on any screen where they don't have enough horizontal space.
    * As a result of the more robust desktop view, the breakpoint for switching to the `MobileStepper` (dropdown) was lowered to 640px to only target phone-sized screens.
    * **UPDATED:** The stepper now visually indicates completed steps with distinct styling and a checkmark. The connector lines between steps now use a text dash (`—`) for improved visual consistency.

#### User Experience Improvements for Step 2 (Research & Curation)
* **ShotCard.js & Step2_ResearchCuration.js - Research Button Refactoring:**
    * The logic for the "Generate Research" button and its loading state has been centralized within `ShotCard.js` for better encapsulation.
    * The `renderShotCardWithResearch` wrapper function was removed from `Step2_ResearchCuration.js`. The parent component now passes an `isEnriching` prop to `ShotCard` to indicate when AI research is in progress.
    * `ShotCard.js` now handles its own button state, displaying "Researching..." while loading and using standard `btn` classes for consistent styling.
* **ShotCard.js - Dynamic Research Button & Status:** The "Generate Research" button now appears conditionally for 'B-Roll' and 'Drone' shots only when research has not yet been performed. Once research is completed, the button is replaced by a clear "Research Complete" status, providing immediate feedback.
* **ShotCard.js - Collapsible Content Sections:** To reduce visual clutter and improve focus during the research phase, less relevant sections within each `ShotCard` are now collapsible. "Creator Experience Notes," "On-Camera Dialogue," and "Voiceover Script" are collapsed by default. The "AI Research Notes" section remains expanded by default, as it is the primary focus of Step 2. Each section includes a "Show/Hide" toggle for user control.

#### AI Logic Refinements
* **createInitialBlueprintAI.js - Guided Shot Descriptions:** The AI prompt has been refined to guide the `shot_description` generation more effectively. The AI is now instructed to create general descriptions based on the type of available footage (e.g., 'B-Roll', 'On-Camera') and the narrative purpose, rather than inventing specific visual details that may not correspond to actual footage. This ensures the initial blueprint is a creative suggestion grounded in known footage availability.
* **generateScriptFromBlueprintAI.js - Enhanced Voiceover Scripting and Blueprint Population:** The AI prompt has been refined to explicitly ensure the `voiceover_script` field for each shot within the blueprint is correctly populated. For 'On-Camera' shots, this field will now include existing 'on_camera_dialogue' if relevant, preventing it from being empty and addressing the previous "Voiceover will be generated in a later step" message on the ShotCard. The `recording_voiceover_script_text` output is also now consistently formatted with paragraph breaks.

#### On-Camera Scripting Workflow Revamp
* **Transcript Import and Mapping:** The previous "Inject Your Experience" step has been replaced with a more direct "On-Camera Scripting" workflow. Users can now:
    * **Import Full Transcript:** Paste a complete on-location audio transcript. The updated `mapTranscriptToBlueprintAI.js` utility uses the Gemini API to clean the transcript and intelligently maps relevant dialogue segments to `on_camera_dialogue` or `voiceover_script` fields for corresponding shots in the Creative Blueprint based on shot type and description.
    * **Write Shot-by-Shot:** Manually enter or refine dialogue for each shot.
* **Blueprint Refinement:** After the initial dialogue mapping, the system now uses `refineBlueprintFromTranscriptAI.js` to analyze the transcript for deeper insights and provides suggestions for refining the blueprint (e.g., adding new shots, modifying existing shot descriptions, or suggesting removals). **UPDATED:** For "add" suggestions, the AI now also provides a `placement_suggestion` to indicate where the new shot should be logically inserted within the blueprint sequence. These suggestions are presented to the user for review and application, and the system intelligently inserts accepted new shots based on the suggested placement.
* **Dialogue Ambiguity Resolution (Option 2 Implementation):**
    * **Detection:** After AI mapping, `Step3_OnCameraScripting.js` now detects situations where dialogue from the transcript might be ambiguously classified (e.g., on-camera dialogue placed in a B-roll shot type).
    * **User Confirmation:** If ambiguities are found, a new "Resolve Ambiguous Dialogue" view is presented. Here, the user can explicitly clarify whether a specific dialogue segment is "On-Camera Dialogue" or "Voiceover Script." This ensures high accuracy where AI inference alone is insufficient.
* **Enhanced Shot-by-Shot Dialogue Editor:**
    * The editor now clearly displays **separate editable text areas** for "On-Camera Dialogue (seen speaking)" and "Voiceover Script (heard over visuals)" for each shot, allowing precise editing of both types of dialogue.
    * **UPDATED:** The `location_tag` for each shot is now prominently displayed in the shot card, aiding in quick contextual identification of dialogue.
    * **UPDATED:** `ai_reason` associated with blueprint modification suggestions is now cleared from the shot data once the suggestions are applied or ambiguities resolved, preventing redundant display.
* **Improved User Flow & Progress Reporting:**
    * The `handleMapTranscript` function in `Step3_OnCameraScripting.js` provides granular `processingMessage` updates to keep the user informed during long-running AI tasks. **UPDATED:** The primary source of progress reporting for AI tasks is now the centralized `TaskQueue` managed by `useAppState.js`, while local `processingMessage` is used for immediate, step-specific feedback.
    * **UPDATED:** When adding new shots from AI suggestions, `Step3_OnCameraScripting.js` now guarantees truly unique `shot_id`s to prevent React key warnings and data conflicts during re-processing.
    * The blueprint auto-save logic in `useBlueprint.js` has been refined to ensure changes are persisted correctly after initial data load, preventing loss of work when re-opening the workspace.
    * The `ScriptingV2_Workspace.js` now remembers and restores the user's last active step, improving workflow continuity.
* **Final Assembly Script Generation:**
    * The `generateScriptFromBlueprintAI.js` utility has been updated to generate two distinct script outputs: a `full_video_script_text` (the complete narrative for the entire video) and a `recording_voiceover_script_text` (containing only the content that needs to be recorded post-facto, such as hooks, transitions, and conclusions). The `recording_voiceover_script_text` is now correctly formatted with paragraph breaks.
    * `Step5_FinalAssembly.js` now displays only the `recording_voiceover_script_text` prominently, providing a "Copy for Recording" button. The "Full Video Script" display has been removed as per user request.
    * **UPDATED:** `Step5_FinalAssembly.js` now allows the user to regenerate the final script multiple times. The "Generate Final Script" button changes to "Regenerate Script" once the script has been initially assembled, providing flexibility for iterative refinement during testing.
