Scripting V2: Implementation & Architecture Guide
This document provides a comprehensive overview of the new Scripting V2 workflow, designed to serve as a reference for developers.

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
A new component, scriptingTaskV2.js, serves as the entry point and is rendered alongside the original in VideoWorkspace.js. It launches the main ScriptingV2_Workspace.js component, which contains the new UI.

New Directory: creators-hub/js/components/ProjectView/tasks/ScriptingV2/

ScriptingV2_Workspace.js: The main container with the two-column layout. It now also manages the current active step and indicates step completion.

useBlueprint.js: A crucial custom hook that manages the state of the blueprint object, including fetching and debounced auto-saving to Firestore. UPDATED: The auto-saving logic has been refined to prevent unnecessary Firestore writes by comparing the debounced blueprint content with the last successfully saved version. The onSnapshot listener also now only triggers a state update if incoming data is genuinely different, improving performance and data consistency.

BlueprintStepper.js: The navigation component for moving between steps. It now visually indicates completed steps with distinct styling and a checkmark. The connector lines between steps now use a text dash (—) for improved visual consistency.

BlueprintDisplay.js: Renders the list of "Shot Cards" in the right-hand panel.

ShotCard.js: Displays the details of a single shot. UPDATED: The voiceover_script section now accurately reflects all spoken content (on-camera or voiceover) for the shot, removing the "Voiceover will be generated in a later step" advisory when content is present.

Step1_InitialBlueprint.js: UI for the "brain dump" and initial generation. UPDATED: This component now uses the centralized handlers.triggerAiTask from useAppState.js to manage the AI call and provide consistent error reporting and task status updates.

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
