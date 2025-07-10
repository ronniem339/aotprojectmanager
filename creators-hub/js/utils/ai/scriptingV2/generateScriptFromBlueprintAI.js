// creators-hub/js/utils/ai/scriptingV2/generateScriptFromBlueprintAI.js

window.aiUtils.generateScriptFromBlueprintAI = async ({ blueprint, video, settings }) => {
    console.log("Assembling final script from blueprint...");

    // --- Input Validation ---
    if (!blueprint || !Array.isArray(blueprint.shots) || blueprint.shots.length === 0) {
        throw new Error("Blueprint is required and must contain shots for script generation.");
    }
    if (!video || !video.title) {
        throw new Error("Video context (title) is missing for script generation.");
    }
    if (!settings || !settings.knowledgeBases) {
        throw new Error("User settings are incomplete for AI script generation.");
    }

    // Fetch the prompt template from its dedicated file
    const promptTemplate = await fetch('./js/utils/ai/scriptingV2/prompts/generateScriptFromBlueprint.txt').then(res => res.text());

    const styleGuidePrompt = window.aiUtils.getStyleGuidePromptV2(settings);
    const storytellingPrinciples = settings.knowledgeBases?.storytelling?.videoStorytellingPrinciples || 'Create a clear hook, a developing middle, and a satisfying conclusion.';
    const blueprintString = JSON.stringify(blueprint.shots, null, 2);

    // Replace placeholders in the template with dynamic content
    const prompt = promptTemplate
        .replace('__STYLE_GUIDE__', styleGuidePrompt)
        .replace('__STORYTELLING_PRINCIPLES__', storytellingPrinciples)
        .replace('__VIDEO_TITLE__', video.title)
        .replace('__BLUEPRINT_JSON__', blueprintString);

    const responseSchema = {
        type: "OBJECT",
        properties: {
            updated_shots: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        shot_id: { type: "STRING" },
                        scene_id: { type: "STRING" },
                        shot_type: { type: "STRING" },
                        shot_description: { type: "STRING" },
                        location_tag: { type: "STRING" },
                        on_camera_dialogue: { type: "STRING" },
                        voiceover_script: { type: "STRING" },
                        ai_research_notes: { type: "ARRAY", items: { type: "STRING" } },
                        creator_experience_notes: { type: "STRING" },
                        estimated_time_seconds: { type: "NUMBER" },
                    },
                    required: ["shot_id", "scene_id", "shot_type", "shot_description", "location_tag", "on_camera_dialogue", "voiceover_script", "estimated_time_seconds"]
                }
            },
            full_video_script_text: { type: "STRING" },
            recording_voiceover_script_text: { type: "STRING" }
        },
        required: ["updated_shots", "full_video_script_text", "recording_voiceover_script_text"]
    };

    try {
        const response = await window.aiUtils.callGeminiAPI(prompt, settings, { taskTier: 'heavy' }, { responseSchema });

        if (!response || typeof response !== 'object' || !Array.isArray(response.updated_shots)) {
            throw new Error("AI returned an invalid response format.");
        }
        
        return response;

    } catch (err) {
        console.error("Error generating script from blueprint with AI:", err);
        throw new Error(`Failed to generate script from blueprint: ${err.message || "An unknown AI error occurred."}`);
    }
};