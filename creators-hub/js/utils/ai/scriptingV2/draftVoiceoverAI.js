// ================================================================== //
// FILE: ./creators-hub/js/utils/ai/scriptingV2/draftVoiceoverAI.js
// ================================================================== //

window.aiUtils.draftVoiceoverAI = async ({ approvedNarrative, approvedResearch, settings }) => {
    if (!approvedNarrative || typeof approvedNarrative !== 'object') {
        throw new Error("An approved narrative is required to draft the voiceover.");
    }
    if (!approvedResearch || typeof approvedResearch !== 'object') {
        throw new Error("Approved research notes are required to draft the voiceover.");
    }
    if (!settings || !settings.knowledgeBases) {
        throw new Error("User settings are incomplete for AI processing.");
    }

    // Fetch the prompt template
    const promptTemplate = await fetch('./js/utils/ai/scriptingV2/prompts_v3/draftVoiceoverAI.txt').then(res => res.text());

    const styleGuidePrompt = window.aiUtils.getStyleGuidePromptV2(settings);
    const approvedResearchJson = JSON.stringify(approvedResearch, null, 2);

    // Replace placeholders
    const prompt = promptTemplate
        .replace('__STYLE_GUIDE__', styleGuidePrompt)
        .replace('__APPROVED_RESEARCH_JSON__', approvedResearchJson);

    // The response schema is dynamic based on the locations that have approved research
    const locationTags = Object.keys(approvedResearch);
    const properties = {};
    locationTags.forEach(tag => {
        properties[tag] = { type: "STRING" };
    });

    const responseSchema = {
        type: "OBJECT",
        properties: properties,
        required: locationTags
    };

    try {
        // This is a primary creative writing task, so we use the 'heavy' tier
        const response = await window.aiUtils.callGeminiAPI(prompt, settings, { taskTier: 'heavy' }, { responseSchema });

        if (!response || typeof response !== 'object') {
            throw new Error("AI returned an invalid response format for the drafted voiceover.");
        }
        
        // We now need to assemble the full script draft based on the narrative arc
        const finalDraftScript = [];
        const dialogueMap = approvedNarrative.dialogueMap || []; // Assuming dialogue map is part of the narrative object

        approvedNarrative.narrativeArc.forEach(arcStep => {
            // This is a simplified assembly. The final assembly AI will do a more nuanced job.
            // Here, we just interleave the dialogue and the new voiceovers.
            
            // Find on-camera dialogue for this step's locations
            const locationsInStep = arcStep.locations_featured || [];
            locationsInStep.forEach(location => {
                const onCameraBlocks = dialogueMap.filter(d => d.locationTag === location);
                onCameraBlocks.forEach(block => {
                    finalDraftScript.push({
                        type: 'On-Camera',
                        locationTag: location,
                        content: block.dialogueChunk
                    });
                });

                // Add the newly drafted voiceover for this location
                if (response[location]) {
                    finalDraftScript.push({
                        type: 'VO',
                        locationTag: location,
                        content: response[location]
                    });
                }
            });
        });

        // This function will now return the assembled draft script array
        // The final assembly AI will handle hooks, intros, and transitions later.
        // For now, let's return the drafted voiceovers in the block format.
        // The 'assembleAndPolish' AI will receive this as input.
        
        const draftedVoiceoverBlocks = [];
        Object.keys(response).forEach(locationTag => {
             draftedVoiceoverBlocks.push({
                type: 'VO',
                locationTag: locationTag,
                content: response[locationTag]
            });
        });

        // The task is simplified to just return the drafted VO blocks.
        // The *next* AI will do the assembly.
        return draftedVoiceoverBlocks;


    } catch (err) {
        console.error("Error drafting voiceover with AI:", err);
        throw new Error(`Failed to draft voiceover: ${err.message || "An unknown AI error occurred."}`);
    }
};
