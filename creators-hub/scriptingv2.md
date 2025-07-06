Core Philosophy & Goal
The primary goal of Scripting V2 was to address shortcomings in the original linear scripting process. The new workflow is built on an iterative model centered around a single, evolving "working document" called the Creative Blueprint.

This new approach aims to:

Give the user more creative control and the ability to refine at each stage.

Leverage AI for heavy lifting (research, initial structure) rather than final output.

Improve the quality and consistency of the final script by breaking the process into smaller, more focused AI tasks.

Provide granular control over AI model usage to balance cost, speed, and quality.

The final output of the process is a detailed Shot List, ready for filming and editing.

New File Structure
To ensure maintainability and separation from the legacy system, the V2 workflow is built with a new, modular file structure.

2.1 UI Components
A new component, scriptingTaskV2.js, serves as the entry point for the V2 workflow. It is conditionally rendered by VideoWorkspace.js, which acts as a router: ScriptingTaskV2 is shown for all new videos (as the recommended default) and for any video already using the V2 system.

New Directory: creators-hub/js/components/ProjectView/tasks/ScriptingV2/

ScriptingV2_Workspace.js: The main container with the two-column layout. It now also manages the current active step and indicates step completion.

useBlueprint.js: A crucial custom hook that manages the state of the blueprint object, including fetching and debounced auto-saving to Firestore. UPDATED: The auto-saving logic has been refined to prevent unnecessary Firestore writes by comparing the debounced blueprint content with the last successfully saved version. The onSnapshot listener also now only triggers a state update if incoming data is genuinely different, improving performance and data consistency.

BlueprintStepper.js: The navigation component for moving between steps. It now visually indicates completed steps with distinct styling and a checkmark. The connector lines between steps now use a text dash (—) for improved visual consistency.

BlueprintDisplay.js: Renders the list of "Shot Cards" in the right-hand panel.

ShotCard.js: Displays the details of a single shot. UPDATED: The voiceover_script section now accurately reflects all spoken content (on-camera or voiceover) for the shot, removing the "Voiceover will be generated in a later step" advisory when content is present.

Step1_InitialBlueprint.js: UI for the "brain dump" and initial generation. UPDATED: This component now uses the centralized handlers.triggerAiTask from useAppState.js to manage the AI call and provide consistent error reporting and task status updates.

MemoryJogger.js: (NEW) A component designed to enhance the "Brain Dump" phase (Step 1).

Purpose: Instead of showing an empty panel, this component is rendered when the Creative Blueprint is empty. It aims to "jog the user's memory" by providing visual and informational context for the locations featured in the video.

Behavior:

The component iterates through each locationName in the video's locations_featured array.

It processes locations sequentially to avoid overwhelming the browser and backend services with parallel requests.

For each location, it displays its name and current processing status (e.g., "Searching for map reference...", "Fetching details...").

Intelligent Data-Healing:

If a location in the footageInventory is missing its place_id, the component automatically triggers the findPlaceIdAI utility to find it. The found ID is then persisted back to Firestore via the updateFootageInventoryItem handler, permanently fixing the data gap.

Once a place_id is secured, it calls the fetchPlaceDetails handler to retrieve a summary and photos from the Google Places API.

AI Fallback (Proposed): If the Google Places API fails or returns no useful information, the component should trigger the findGenericInfoAndImagesAI utility as a fallback. This function will perform a general web search to find a brief description and publicly available images for the location.

Step2_ResearchCuration.js: UI for the AI-powered research step. UPDATED: This component now uses the centralized handlers.triggerAiTask from useAppState.js to manage AI research calls and provide consistent error reporting and task status updates.

Step3_OnCameraScripting.js: (UPDATED) This component replaces Step3_MyExperience.js and is now central to on-camera dialogue management. It handles importing full transcripts, resolving ambiguous dialogue, reviewing blueprint refinement suggestions (including intelligent insertion of new shots), and providing a shot-by-shot editor. UPDATED: This component now uses the centralized handlers.triggerAiTask from useAppState.js for both transcript mapping (mapTranscriptToBlueprintAI) and blueprint refinement (refineBlueprintFromTranscriptAI), ensuring consistent task management and error reporting. The location_tag for each shot is now prominently displayed in the shot card, and ai_reason associated with blueprint modification suggestions is cleared from the shot data once applied or ambiguities resolved. BUGFIX: The component now correctly persists the fullTranscript and the active sub-view mode (import, shotByShot, etc.) to the blueprint, preventing data loss on navigation. The local status bar is also immediately populated with a message when transcript processing begins. BUGFIX: Resolved a Firebase crash by ensuring that ai_reason and location_name fields in new or modified shots are explicitly initialized to empty strings ('') rather than undefined before being saved to Firestore.

Step5_FinalAssembly.js: (UPDATED) UI for the final script generation and task completion. It now orchestrates the generation and display of the recording_voiceover_script_text. The full video script is no longer displayed. Users can also re-generate the script multiple times via an updated button. UPDATED: This component now uses the centralized handlers.triggerAiTask from useAppState.js for the final script generation (generateScriptFromBlueprintAI), providing consistent error reporting and task status updates.

Files Deleted:

Step3_MyExperience.js (replaced by Step3_OnCameraScripting.js)

Step4_OnCamera.js (functionality integrated into Step3_OnCameraScripting.js and ScriptingV2_Workspace.js updated)

2.2 AI Utility Functions
A new directory was created to house the AI functions specific to this workflow.

New Directory: creators-hub/js/utils/ai/scriptingV2/

getStyleGuidePromptV2.js: Reads from the new detailed style guide in the settings.

createInitialBlueprintAI.js: (Heavy Task) - Creates the initial narrative structure. UPDATED: Includes robust input validation, try-catch blocks for AI calls, and strict output validation to ensure a valid blueprint structure is returned or a clear error is thrown. BUGFIX: Ensured this function is consistently exposed under window.aiUtils to prevent "function not found" errors when called.

enrichBlueprintAI.js: (Lite Task) - Performs factual research for specific shots. UPDATED: Includes robust input validation, try-catch blocks for AI calls, and strict output validation to ensure valid research notes are returned. BUGFIX: Ensured this function is consistently exposed under window.aiUtils to prevent "function not found" errors when called.

findPlaceIdAI.js: (NEW) A "lite" AI task that takes a string (locationName) as input.

Purpose: To programmatically find the official Google Place ID for a location that is missing it from the footageInventory. This is a self-healing mechanism to repair incomplete project data.

Action: It uses an AI model with search capabilities to find the most likely Google Place ID corresponding to the location name.

Output: A JSON object containing the place_id: { "place_id": "ChIJ..." }.

findGenericInfoAndImagesAI.js: (PROPOSED) A fallback AI task for the Memory Jogger.

Purpose: To be used when the Google Places API fails to return useful data for a valid place_id. This ensures the user always sees some helpful context.

Action: It takes a locationName and performs a general, AI-powered web search for interesting facts and photos.

Output: A JSON object containing a short summary and an array of image_urls: { "summary": "...", "image_urls": ["url1.jpg", ...] }.

mapTranscriptToBlueprintAI.js: (UPDATED) Maps a single, combined on-location transcript to the relevant shots. It now intelligently categorizes and extracts dialogue segments into either on_camera_dialogue or voiceover_script fields for corresponding shots in the Creative Blueprint based on shot type and description. This is a Heavy Task. UPDATED: Includes robust input validation, try-catch blocks for AI calls, and strict output validation to ensure the mapped dialogue adheres to the expected structure for each shot. BUGFIX: Ensured this function is consistently exposed under window.aiUtils to prevent "function not found" errors when called.

refineBlueprintFromTranscriptAI.js: (UPDATED) Analyzes the full on-camera transcript and the current blueprint to suggest modifications (add, modify, remove shots) to the blueprint itself. Crucially, for "add" suggestions, it now also recommends a placement_suggestion (relative to an existing shot) for logical insertion. This is classified as a Heavy Task. UPDATED: Includes robust input validation, try-catch blocks for AI calls, and strict output validation to ensure the generated suggestions are well-formed and valid. BUGFIX: Ensured this function is consistently exposed under window.aiUtils to prevent "function not found" errors when called.

generateScriptFromBlueprintAI.js: (UPDATED) This function now acts as a master scriptwriter, taking the populated blueprint and generating two distinct script outputs: a full_video_script_text (complete narrative) and a recording_voiceover_script_text (only the parts needing post-production recording). The recording_voiceover_script_text is now explicitly formatted with paragraph breaks for ease of recording. Crucially, the AI is now specifically instructed to populate the voiceover_script field within each blueprint shot to reflect all spoken content (on-camera or voiceover) for that shot, ensuring the Creative Blueprint accurately represents the final shot list. This is a Heavy Task. UPDATED: Includes robust input validation, try-catch blocks for AI calls, and strict output validation for both the script texts and the updated shot data, ensuring all expected fields are present and correctly typed. BUGFIX: Ensured this function is consistently exposed under window.aiUtils to prevent "function not found" errors when called.

Files Deleted:

generateExperienceQuestionsAI.js (no longer needed with the updated on-camera scripting workflow)

Settings & Configuration
To support the new workflow without breaking existing features, the settings have been upgraded for backward compatibility.

3.1 Style Guide (MyStudioView.js)
The original "Style Guide" text area and its associated logic remain untouched to support legacy AI functions.

A new, separate "Detailed Style Guide (for Scripting V2)" section has been added.

This new section contains granular input fields (Brand Voice, Pacing, Humor Level, etc.).

The data is saved to a new object in the settings: settings.knowledgeBases.styleV2.detailedStyleGuide.

3.2 Model Selection (TechnicalSettingsView.js)
The original binary toggle (useProModelForComplexTasks) and model name inputs remain for legacy functions.

A new, separate "Scripting V2 Model Configuration" section has been added.

This provides a toggle (useProForV2HeavyTasks) and separate text inputs for the V2 Pro, Flash, and Lite model names.

This allows for a three-tiered model strategy (Heavy, Standard, Lite) to be configured specifically for the V2 workflow.

3.3 Core AI Caller (callGeminiAPI.js)
The central window.aiUtils.callGeminiAPI function has been upgraded.

It is now backward-compatible and can handle both the legacy isComplex boolean and the new taskTier string ('heavy', 'standard', 'lite').

It contains the logic to read the appropriate model name from the correct section of the settings based on which system is being used.

It will now throw an explicit error if a required model name is not configured in the settings, rather than using a silent fallback.

NEW: AI Task Management (in useAppState.js)
A new handlers.triggerAiTask function has been added to window.useAppState(). This function provides a centralized, robust way to:

Add AI-related tasks to the global taskQueue with specific types (e.g., scriptingV2-blueprint-initial).

Update task status with detailed progress messages.

Catch errors from AI utility functions and display user-friendly notifications globally.

Ensure local component isProcessing states are managed correctly.

This significantly improves error visibility and task transparency for the user during AI-driven processes within Scripting V2.

Data Handlers
handlers.fetchPlaceDetails:

Purpose: Provides a clean, reusable interface for UI components to fetch data from the Google Places API.

Action: Takes a placeId as input and calls the /.netlify/functions/fetch-place-details serverless function, which securely handles the actual API call to Google.

Output: Returns the details object from the Google Places API response.

handlers.updateFootageInventoryItem:

Purpose: Allows components to programmatically correct or enrich the project's data in Firestore.

Action: Takes a projectId, the inventoryId (the unique key for the location in the map), and an updatedData object. It uses dot notation to update a specific location's data within the footageInventory map in the project document. This is used by the MemoryJogger to save a place_id after it has been found by the AI.

V2 Compatibility and Final Polishing
This section outlines the most recent changes to ensure the V2 workflow is stable and integrates seamlessly with the rest of the application's production pipeline.

Metadata Generation for V2 Videos
A major enhancement was made to ensure high-quality metadata is generated for videos scripted with the V2 workflow. The following legacy task components have been updated:

TitleTask.js

DescriptionTask.js

ChaptersTask.js

TagsTask.js

ThumbnailTask.js

These components now intelligently detect if a video was created using ScriptingV2. If so, they use the detailed full_video_script_text as the primary source of context for the AI. If not, they fall back to the legacy concept or script fields. This ensures that generated titles, descriptions, chapters, tags, and thumbnail ideas are highly relevant to the final V2 script content, while maintaining full backward compatibility.

Core Workflow Bug Fixes & Stability
Task Status Synchronization: Resolved a critical bug where marking the V2 scripting task as 'complete' would not update its status in the main VideoWorkspace task list. The issue was traced to incorrect prop handling in scriptingTaskV2.js, which has now been fixed to ensure the task status updates correctly.

Blueprint Refinement Stability: The AI prompt in refineBlueprintFromTranscriptAI.js has been strengthened with more explicit instructions to prevent the AI from returning malformed suggestions, improving the reliability of the blueprint refinement step.

Chapter Timestamp Validation: The validation logic in ChaptersTask.js was improved. It now trims whitespace from timestamp inputs, preventing validation errors caused by accidental spaces entered by the user.

AI Prompt Enhancements
Fact-Enhanced Scriptwriting: The prompt for the final script generation in generateScriptFromBlueprintAI.js has been enhanced. It now explicitly instructs the AI to prioritize weaving interesting facts from the blueprint's research notes into the main narrative, adding educational value while maintaining the creator's personal storytelling style.
