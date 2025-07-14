// ================================================================== //
// FILE: ./creators-hub/js/utils/ai/scriptingV2/refineScriptBlockAI.js
// ================================================================== //

window.aiUtils.refineScriptBlockAI = async ({ blockContent, settings }) => {
    if (!blockContent || !blockContent.trim()) {
        throw new Error("A script block is required for refinement.");
    }
    if (!settings || !settings.knowledgeBases) {
        throw new Error("User settings are incomplete for AI processing.");
    }

    // Fetch the prompt template
    const promptTemplate = await fetch('./js/utils/ai/scriptingV2/prompts_v3/refineScriptBlockAI.txt').then(res => res.text());

    const styleGuidePrompt = window.aiUtils.getStyleGuidePromptV2(settings);

    // Replace placeholders
    const prompt = promptTemplate
        .replace('__STYLE_GUIDE__', styleGuidePrompt)
        .replace('__BLOCK_CONTENT__', blockContent);

    // Define the expected JSON schema for the AI's response
    const responseSchema = {
        type: "OBJECT",
        properties: {
            refinedContent: { type: "STRING" }
        },
        required: ["refinedContent"]
    };

    try {
        // This is a low-intensity task focused on a small piece of text
        const response = await window.aiUtils.callGeminiAPI(prompt, settings, { taskTier: 'low' }, { responseSchema });

        if (!response || typeof response !== 'object' || typeof response.refinedContent !== 'string') {
            throw new Error("AI returned an invalid response format for the refined block.");
        }
        
        return response.refinedContent;

    } catch (err) {
        console.error("Error refining script block with AI:", err);
        throw new Error(`Failed to refine script block: ${err.message || "An unknown AI error occurred."}`);
    }
};
