// creators-hub/js/utils/ai/scriptingV2/generateScriptFromBlueprintAI.js

// This is the final and most crucial AI function in the V2 workflow.
// It acts as a master scriptwriter, taking the entire populated blueprint
// and generating a cohesive, flowing voiceover script that connects all the elements.

window.generateScriptFromBlueprintAI = async ({ blueprint, video, settings }) => {
    console.log("Assembling final script from blueprint...");

    // Use the globally available helper function
    const styleGuidePrompt = window.aiUtils.getStyleGuidePromptV2(settings);

    const blueprintString = JSON.stringify(blueprint.shots, null, 2);

    const prompt = `
        You are a master scriptwriter for a top-tier YouTube documentarian. You have been provided with a complete "Creative Blueprint" for an upcoming video. The blueprint contains a sequence of shots, each populated with research notes, the creator's personal experiences, and any on-camera dialogue.

        **Creator's Style Guide & Tone:**
        ${styleGuidePrompt}

        **Storytelling Principles to Follow:**
        ${settings.knowledgeBases?.storytelling?.videoStorytellingPrinciples || 'Create a clear hook, a developing middle, and a satisfying conclusion.'}

        **Video Title:** ${video.title}

        **The Creative Blueprint (in JSON format):**
        ---
        ${blueprintString}
        ---

        **Your Task:**
        Your sole task is to write the voiceover script for every shot that needs one.
        1.  **Synthesize Information:** For each shot, read the 'shot_description', 'ai_research_notes', and 'creator_experience_notes'. Synthesize these points into a natural, engaging voiceover.
        2.  **Create Smooth Transitions:** The script must flow seamlessly from one shot to the next. Use transitional phrases to connect ideas between shots and scenes.
        3.  **Integrate On-Camera Dialogue:** If a shot has 'on_camera_dialogue', the voiceover for the preceding shot should lead into it naturally, and the voiceover for the following shot should pick up from it. **Do not repeat the on-camera dialogue in the voiceover.** The voiceover should complement it.
        4.  **Match the Tone:** The entire script must strictly adhere to the creator's style guide.
        5.  **Populate the 'voiceover_script' field:** Your output must be a JSON object containing the updated list of shots, with the 'voiceover_script' field filled in for every shot that requires narration. You must return the entire blueprint structure, not just the script text.

        **Output Format:**
        Your final output MUST be a JSON object that strictly matches the input blueprint schema. The only difference is that the 'voiceover_script' fields should now be populated with your generated script.
    `;

    const responseSchema = {
      type: "OBJECT",
      properties: {
        shots: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              shot_id: { type: "STRING" },
              scene_id: { type: "STRING" },
              scene_narrative_purpose: { type: "STRING" },
              location_name: { type: "STRING" },
              shot_type: { type: "STRING" },
              shot_description: { type: "STRING" },
              voiceover_script: { type: "STRING" },
              on_camera_dialogue: { type: "STRING" },
              ai_research_notes: { type: "ARRAY", items: { type: "STRING" } },
              creator_experience_notes: { type: "STRING" },
              estimated_time_seconds: { type: "NUMBER" },
            },
            required: ["shot_id", "scene_id", "scene_narrative_purpose", "location_name", "shot_type", "shot_description", "voiceover_script", "estimated_time_seconds"]
          }
        }
      },
      required: ["shots"]
    };

    // Call the upgraded global function with the 'heavy' task tier and correct generationConfig structure.
    const response = await window.aiUtils.callGeminiAPI(prompt, settings, { taskTier: 'heavy' }, { responseSchema });

    if (response && blueprint.initialThoughts) {
        response.initialThoughts = blueprint.initialThoughts;
    }

    return response;
};
