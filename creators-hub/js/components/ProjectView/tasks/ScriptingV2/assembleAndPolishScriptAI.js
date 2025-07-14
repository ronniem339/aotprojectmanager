// ================================================================== //
// FILE: ./creators-hub/js/utils/ai/scriptingV2/assembleAndPolishScriptAI.js
// ================================================================== //

window.aiUtils.assembleAndPolishScriptAI = async ({ approvedNarrative, dialogueMap, draftedVoiceovers, settings }) => {
    if (!approvedNarrative || !dialogueMap || !draftedVoiceovers) {
        throw new Error("Narrative, dialogue map, and drafted voiceovers are required to assemble the script.");
    }
    if (!settings || !settings.knowledgeBases) {
        throw new Error("User settings are incomplete for AI processing.");
    }

    // Fetch the prompt template
    const promptTemplate = await fetch('./js/utils/ai/scriptingV2/prompts_v3/assembleAndPolishScriptAI.txt').then(res => res.text());

    const styleGuidePrompt = window.aiUtils.getStyleGuidePromptV2(settings);
    const approvedNarrativeJson = JSON.stringify(approvedNarrative, null, 2);
    const dialogueMapJson = JSON.stringify(dialogueMap, null, 2);
    const draftedVoiceoversJson = JSON.stringify(draftedVoiceovers, null, 2);

    // Replace placeholders
    const prompt = promptTemplate
        .replace('__STYLE_GUIDE__', styleGuidePrompt)
        .replace('__APPROVED_NARRATIVE_JSON__', approvedNarrativeJson)
        .replace('__DIALOGUE_MAP_JSON__', dialogueMapJson)
        .replace('__DRAFT_VOICEOVER_JSON__', draftedVoiceoversJson);

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
        // This is a final, heavy creative task
        const response = await window.aiUtils.callGeminiAPI(prompt, settings, { taskTier: 'heavy' }, { responseSchema });

        if (!response || !Array.isArray(response)) {
            throw new Error("AI returned an invalid response format for the final assembled script.");
        }
        
        return response;

    } catch (err) {
        console.error("Error assembling and polishing script with AI:", err);
        throw new Error(`Failed to assemble script: ${err.message || "An unknown AI error occurred."}`);
    }
};
