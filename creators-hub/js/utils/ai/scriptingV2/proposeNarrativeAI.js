// ================================================================== //
// FILE: ./creators-hub/js/utils/ai/scriptingV2/proposeNarrativeAI.js
// ================================================================== //

window.aiUtils.proposeNarrativeAI = async ({ dialogueMap, footage_log, settings }) => {
    if (!dialogueMap || !Array.isArray(dialogueMap) || dialogueMap.length === 0) {
        throw new Error("A verified dialogue map is required to propose a narrative.");
    }
    if (!settings || !settings.knowledgeBases) {
        throw new Error("User settings are incomplete for AI processing.");
    }

    // Fetch the prompt template
    const promptTemplate = await fetch('./js/utils/ai/scriptingV2/prompts_v3/proposeNarrativeAI.txt').then(res => res.text());

    const styleGuidePrompt = window.aiUtils.getStyleGuidePromptV2(settings);
    const dialogueMapJson = JSON.stringify(dialogueMap, null, 2);

    // Replace placeholders
    const prompt = promptTemplate
        .replace('__STYLE_GUIDE__', styleGuidePrompt)
        .replace('__DIALOGUE_MAP_JSON__', dialogueMapJson);

    // Define the expected JSON schema for the AI's response
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
                        description: { type: "STRING" },
                        locations_featured: {
                            type: "ARRAY",
                            items: { type: "STRING" }
                        }
                    },
                    required: ["step", "description"]
                }
            },
            valueAddResearch: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        location: { type: "STRING" },
                        topic: { type: "STRING" }
                    },
                    required: ["location", "topic"]
                }
            }
        },
        required: ["coreAngle", "narrativeArc", "valueAddResearch"]
    };

    try {
        // This is a complex creative task, so we use the 'heavy' tier
        const response = await window.aiUtils.callGeminiAPI(prompt, settings, { taskTier: 'heavy' }, { responseSchema });

        if (!response || typeof response !== 'object' || !response.coreAngle) {
            throw new Error("AI returned an invalid response format for the narrative proposal.");
        }
        
        return response;

    } catch (err) {
        console.error("Error proposing narrative with AI:", err);
        throw new Error(`Failed to propose narrative: ${err.message || "An unknown AI error occurred."}`);
    }
};
