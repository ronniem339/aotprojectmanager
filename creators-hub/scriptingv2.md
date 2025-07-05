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

ScriptingV2_Workspace.js: The main container with the two-column layout.

useBlueprint.js: A crucial custom hook that manages the state of the blueprint object, including fetching and auto-saving to Firestore.

BlueprintStepper.js: The navigation component for moving between steps.

BlueprintDisplay.js: Renders the list of "Shot Cards" in the right-hand panel.

ShotCard.js: Displays the details of a single shot.

Step1_InitialBlueprint.js: UI for the "brain dump" and initial generation.

Step2_ResearchCuration.js: UI for the AI-powered research step.

Step3_MyExperience.js: UI for adding the creator's personal perspective.

Step4_OnCamera.js: UI for adding on-camera dialogue.

Step5_FinalAssembly.js: UI for the final script generation and task completion.

2.2 AI Utility Functions
A new directory was created to house the AI functions specific to this workflow.

New Directory: creators-hub/js/utils/ai/scriptingV2/

getStyleGuidePromptV2.js: Reads from the new detailed style guide in the settings.

createInitialBlueprintAI.js: (Heavy Task) - Creates the initial narrative structure.

enrichBlueprintAI.js: (Lite Task) - Performs factual research for specific shots.

generateExperienceQuestionsAI.js: (Standard Task) - Asks targeted questions to elicit the creator's experience.

generateScriptFromBlueprintAI.js: (Heavy Task) - Assembles the final script from the completed blueprint.

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

Current Status
All necessary files have been created and updated. The new workflow is integrated into the application and is ready for end-to-end testing.

Recent Updates and Enhancements
This section outlines the recent modifications made to the Scripting V2 workflow components to improve stability, data handling, and user experience.

UI Responsiveness and Layout Refinements
A series of targeted fixes were implemented to improve the UI on smaller laptop and tablet screens.

ScriptingV2_Workspace.js - Responsive Column Layout:

The main two-column layout has been updated to stack vertically on screens narrower than 1024px (the lg breakpoint).

Column widths were aligned with this breakpoint (lg:w-1/2) to prevent layout conflicts on medium-sized screens.

The left-hand content panel was made vertically scrollable (overflow-y-auto) to match the right-hand panel, preventing content from being cut off.

Visual clarity was improved by making the modal background fully opaque and adding a border to the right-hand "Creative Blueprint" panel.

BlueprintStepper.js - Intrinsically Responsive Stepper:

The DesktopStepper component was re-engineered to be fully responsive without relying on fixed breakpoints.

The container class was changed to use flex-wrap and the gap property. This allows the step buttons to wrap gracefully to a new line on any screen where they don't have enough horizontal space.

As a result of the more robust desktop view, the breakpoint for switching to the MobileStepper (dropdown) was lowered to 640px to only target phone-sized screens.

User Experience Improvements for Step 2 (Research & Curation)
ShotCard.js & Step2_ResearchCuration.js - Research Button Refactoring:

The logic for the "Generate Research" button and its loading state has been centralized within ShotCard.js for better encapsulation.

The renderShotCardWithResearch wrapper function was removed from Step2_ResearchCuration.js. The parent component now passes an isEnriching prop to ShotCard to indicate when AI research is in progress.

ShotCard.js now handles its own button state, displaying "Researching..." while loading and using standard btn classes for consistent styling.

ShotCard.js - Dynamic Research Button & Status: The "Generate Research" button now appears conditionally for 'B-Roll' and 'Drone' shots only when research has not yet been performed. Once research is completed, the button is replaced by a clear "Research Complete" status, providing immediate feedback.

ShotCard.js - Collapsible Content Sections: To reduce visual clutter and improve focus during the research phase, less relevant sections within each ShotCard are now collapsible. "Creator Experience Notes," "On-Camera Dialogue," and "Voiceover Script" are collapsed by default. The "AI Research Notes" section remains expanded by default, as it is the primary focus of Step 2. Each section includes a "Show/Hide" toggle for user control.

AI Logic Refinements
createInitialBlueprintAI.js - Guided Shot Descriptions: The AI prompt has been refined to guide the shot_description generation more effectively. The AI is now instructed to create general descriptions based on the type of available footage (e.g., 'B-Roll', 'On-Camera') and the narrative purpose, rather than inventing specific visual details that may not correspond to actual footage. This ensures the initial blueprint is a creative suggestion grounded in known footage availability.
