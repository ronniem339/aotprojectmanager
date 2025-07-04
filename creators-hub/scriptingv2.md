Scripting V2: Implementation & Architecture Guide
This document provides a comprehensive overview of the new Scripting V2 workflow, designed to serve as a reference for developers.

1. Core Philosophy & Goal
The primary goal of Scripting V2 was to address shortcomings in the original linear scripting process. The new workflow is built on an iterative model centered around a single, evolving "working document" called the Creative Blueprint.

This new approach aims to:

Give the user more creative control and the ability to refine at each stage.

Leverage AI for heavy lifting (research, initial structure) rather than final output.

Improve the quality and consistency of the final script by breaking the process into smaller, more focused AI tasks.

Provide granular control over AI model usage to balance cost, speed, and quality.

The final output of the process is a detailed Shot List, ready for filming and editing.

2. New File Structure
To ensure maintainability and separation from the legacy system, the V2 workflow is built with a new, modular file structure.

2.1 UI Components
A new component, scriptingTaskV2.js, serves as the entry point and is rendered alongside the original in VideoWorkspace.js. It launches the main ScriptingV2_Workspace.js component, which contains the new UI.

creators-hub/js/components/ProjectView/tasks/scriptingTaskV2.js

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

3. Settings & Configuration
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

4. Current Status
All necessary files have been created and updated. The new workflow is integrated into the application and is ready for end-to-end testing.
