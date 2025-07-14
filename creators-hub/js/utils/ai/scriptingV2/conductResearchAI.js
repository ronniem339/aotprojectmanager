// ================================================================== //
// FILE: ./creators-hub/js/utils/ai/scriptingV2/conductResearchAI.js
// ================================================================== //

window.aiUtils.conductResearchAI = async ({ approvedNarrative, settings }) => {
    if (!approvedNarrative || typeof approvedNarrative !== 'object' || !approvedNarrative.coreAngle) {
        throw new Error("An approved narrative is required to conduct research.");
    }
    if (!settings || !settings.knowledgeBases) {
        throw new Error("User settings are incomplete for AI processing.");
    }

    // Fetch the prompt template
    const promptTemplate = await fetch('./js/utils/ai/scriptingV2/prompts_v3/conductResearchAI.txt').then(res => res.text());

    const styleGuidePrompt = window.aiUtils.getStyleGuidePromptV2(settings);
    const approvedNarrativeJson = JSON.stringify(approvedNarrative, null, 2);

    // Replace placeholders
    const prompt = promptTemplate
        .replace('__STYLE_GUIDE__', styleGuidePrompt)
        .replace('__APPROVED_NARRATIVE_JSON__', approvedNarrativeJson);

    // Define the expected JSON schema for the AI's response
    // The schema is dynamic based on the locations in the narrative
    const locationTags = approvedNarrative.narrativeArc
        .map(arc => arc.locations_featured) // Assuming locations are in the arc
        .flat()
        .filter((v, i, a) => a.indexOf(v) === i && v); // Get unique location tags
    
    const properties = {};
    locationTags.forEach(tag => {
        properties[tag] = {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    fact: { type: "STRING" },
                    story: { type: "STRING" }
                }
            }
        };
    });

    const responseSchema = {
        type: "OBJECT",
        properties: properties
    };

    try {
        // Research is a medium-intensity task
        const response = await window.aiUtils.callGeminiAPI(prompt, settings, { taskTier: 'medium' }, { responseSchema });

        if (!response || typeof response !== 'object') {
            throw new Error("AI returned an invalid response format for the research notes.");
        }
        
        return response;

    } catch (err) {
        console.error("Error conducting research with AI:", err);
        throw new Error(`Failed to conduct research: ${err.message || "An unknown AI error occurred."}`);
    }
};
