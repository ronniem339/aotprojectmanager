// ================================================================== //
// FILE: ./creators-hub/js/utils/ai/scriptingV2/assembleAndPolishScriptAI.js
// ================================================================== //

window.aiUtils.assembleAndPolishScriptAI = async ({ draftScript, approvedNarrative, dialogueMap, settings }) => {
    if (!draftScript || !Array.isArray(draftScript) || draftScript.length === 0) {
        throw new Error("Draft script is required for assembly.");
    }
    if (!approvedNarrative || typeof approvedNarrative !== 'object' || !approvedNarrative.narrativeArc) {
        throw new Error("Approved narrative is required for script assembly.");
    }
    if (!dialogueMap || !Array.isArray(dialogueMap) || dialogueMap.length === 0) {
        throw new Error("Dialogue map is required for script assembly.");
    }
    if (!settings || !settings.knowledgeBases) {
        throw new Error("User settings are incomplete for AI processing.");
    }

    // Fetch the prompt template
    const promptTemplate = await fetch('./js/utils/ai/scriptingV2/prompts_v3/assembleAndPolishScriptAI.txt').then(res => res.text());

    const styleGuidePrompt = window.aiUtils.getStyleGuidePromptV2(settings);
    const draftScriptJson = JSON.stringify(draftScript, null, 2);
    const approvedNarrativeJson = JSON.stringify(approvedNarrative, null, 2);
    const dialogueMapJson = JSON.stringify(dialogueMap, null, 2);

    // Replace placeholders
    const prompt = promptTemplate
        .replace('__STYLE_GUIDE__', styleGuidePrompt)
        .replace('__DRAFT_SCRIPT_JSON__', draftScriptJson)
        .replace('__APPROVED_NARRATIVE_JSON__', approvedNarrativeJson)
        .replace('__DIALOGUE_MAP_JSON__', dialogueMapJson);

    // Define the expected JSON schema for the AI's response
    const responseSchema = {
        type: "OBJECT",
        properties: {
            fullScript: { type: "STRING" },
            recordableVoiceover: { type: "STRING" }
        },
        required: ["fullScript", "recordableVoiceover"]
    };

    try {
        // This is a heavy-intensity task for comprehensive script assembly
        const response = await window.aiUtils.callGeminiAPI(prompt, settings, { taskTier: 'heavy' }, { responseSchema });

        if (!response || typeof response !== 'object' || typeof response.finalScript !== 'string') {
            throw new Error("AI returned an invalid response format for the final script.");
        }
        
        return response;

    } catch (err) {
        console.error("Error assembling and polishing script with AI:", err);
        throw new Error(`Failed to assemble and polish script: ${err.message || "An unknown AI error occurred."}`);
    }
};