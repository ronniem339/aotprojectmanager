// ================================================================== //
// FILE: ./creators-hub/js/utils/ai/scriptingV2/refineNarrativeAI.js
// ================================================================== //

window.aiUtils.refineNarrativeAI = async ({ narrativeProposals, userFeedback, settings }) => {
    if (!narrativeProposals || !Array.isArray(narrativeProposals) || narrativeProposals.length === 0) {
        throw new Error("A history of narrative proposals is required to refine the narrative.");
    }
    if (!userFeedback || !userFeedback.trim()) {
        throw new Error("User feedback is required to refine the narrative.");
    }
    if (!settings || !settings.knowledgeBases) {
        throw new Error("User settings are incomplete for AI processing.");
    }

    // Fetch the prompt template
    const promptTemplate = await fetch('./js/utils/ai/scriptingV2/prompts_v3/refineNarrativeAI.txt').then(res => res.text());

    const styleGuidePrompt = window.aiUtils.getStyleGuidePromptV2(settings);
    const narrativeProposalsJson = JSON.stringify(narrativeProposals, null, 2);

    // Replace placeholders
    const prompt = promptTemplate
        .replace('__STYLE_GUIDE__', styleGuidePrompt)
        .replace('__NARRATIVE_PROPOSALS_JSON__', narrativeProposalsJson)
        .replace('__USER_FEEDBACK__', userFeedback);

    // The response schema is the same as the proposeNarrativeAI function
    const responseSchema = {
        type: "OBJECT",
        properties: {
            coreAngle: { type: "STRING" },
            narrativeArc: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        step: { type: "STRING" },
                        description: { type: "STRING" }
                    },
                    required: ["step", "description"]
                }
            },
            valueAddResearch: {
                type: "ARRAY",
                items: { type: "STRING" }
            }
        },
        required: ["coreAngle", "narrativeArc", "valueAddResearch"]
    };

    try {
        // This is a medium-complexity creative task
        const response = await window.aiUtils.callGeminiAPI(prompt, settings, { taskTier: 'medium' }, { responseSchema });

        if (!response || typeof response !== 'object' || !response.coreAngle) {
            throw new Error("AI returned an invalid response format for the refined narrative proposal.");
        }
        
        return response;

    } catch (err) {
        console.error("Error refining narrative with AI:", err);
        throw new Error(`Failed to refine narrative: ${err.message || "An unknown AI error occurred."}`);
    }
};
