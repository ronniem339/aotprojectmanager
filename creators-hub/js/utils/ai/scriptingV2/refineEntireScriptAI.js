// ================================================================== //
// FILE: ./creators-hub/js/utils/ai/scriptingV2/refineEntireScriptAI.js
// ================================================================== //

window.aiUtils.refineEntireScriptAI = async ({ draftScript, globalFeedback, settings }) => {
    if (!draftScript || !Array.isArray(draftScript) || draftScript.length === 0) {
        throw new Error("A draft script is required for global refinement.");
    }
    if (!globalFeedback || !globalFeedback.trim()) {
        throw new Error("Global feedback is required to refine the script.");
    }
    if (!settings || !settings.knowledgeBases) {
        throw new Error("User settings are incomplete for AI processing.");
    }

    // Fetch the prompt template
    const promptTemplate = await fetch('./js/utils/ai/scriptingV2/prompts_v3/refineEntireScriptAI.txt').then(res => res.text());

    const styleGuidePrompt = window.aiUtils.getStyleGuidePromptV2(settings);
    const draftScriptJson = JSON.stringify(draftScript, null, 2);

    // Replace placeholders
    const prompt = promptTemplate
        .replace('__STYLE_GUIDE__', styleGuidePrompt)
        .replace('__GLOBAL_FEEDBACK__', globalFeedback)
        .replace('__DRAFT_SCRIPT_JSON__', draftScriptJson);

    // Define the expected JSON schema for the AI's response
    const responseSchema = {
        type: "ARRAY",
        items: {
            type: "OBJECT",
            properties: {
                type: { type: "STRING" },
                locationTag: { type: "STRING" },
                content: { type: "STRING" }
            },
            required: ["type", "content"]
        }
    };

    try {
        // This is a heavy creative task as it involves rewriting a large amount of text
        const response = await window.aiUtils.callGeminiAPI(prompt, settings, { taskTier: 'heavy' }, { responseSchema });

        if (!response || !Array.isArray(response)) {
            throw new Error("AI returned an invalid response format for the globally refined script.");
        }
        
        return response;

    } catch (err) {
        console.error("Error refining entire script with AI:", err);
        throw new Error(`Failed to refine script: ${err.message || "An unknown AI error occurred."}`);
    }
};
