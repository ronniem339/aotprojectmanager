// ================================================================== //
// FILE: ./creators-hub/js/utils/ai/scriptingV2/generateShotListForEditingAI.js
// ================================================================== //

window.aiUtils.generateShotListForEditingAI = async ({ approvedNarrative, dialogueMap, footage_log, finalScript, recordableVoiceover, settings }) => {
    if (!approvedNarrative || typeof approvedNarrative !== 'object' || !approvedNarrative.narrativeArc) {
        throw new Error("Approved narrative is required to generate a shot list.");
    }
    if (!dialogueMap || !Array.isArray(dialogueMap) || dialogueMap.length === 0) {
        throw new Error("Dialogue map is required to generate a shot list.");
    }
    if (!footage_log || !Array.isArray(footage_log)) {
        throw new Error("Footage log is required to generate a shot list.");
    }
    if (!finalScript || !finalScript.trim()) {
        throw new Error("Final script is required to generate a shot list.");
    }
    if (!recordableVoiceover || !recordableVoiceover.trim()) {
        throw new Error("Recordable voiceover is required to generate a shot list.");
    }
    if (!settings || !settings.knowledgeBases) {
        throw new Error("User settings are incomplete for AI processing.");
    }

    // Fetch the prompt template
    const promptTemplate = await fetch('./js/utils/ai/scriptingV2/prompts_v3/generateShotListForEditingAI.txt').then(res => res.text());

    const styleGuidePrompt = window.aiUtils.getStyleGuidePromptV2(settings);
    const approvedNarrativeJson = JSON.stringify(approvedNarrative, null, 2);
    const dialogueMapJson = JSON.stringify(dialogueMap, null, 2);
    const footageLogJson = JSON.stringify(footage_log, null, 2);

    // Replace placeholders
    const prompt = promptTemplate
        .replace('__STYLE_GUIDE__', styleGuidePrompt)
        .replace('__APPROVED_NARRATIVE_JSON__', approvedNarrativeJson)
        .replace('__DIALOGUE_MAP_JSON__', dialogueMapJson)
        .replace('__FOOTAGE_LOG_JSON__', footageLogJson)
        .replace('__FINAL_SCRIPT__', finalScript)
        .replace('__RECORDABLE_VOICEOVER__', recordableVoiceover);

    // Define the expected JSON schema for the AI's response
    const responseSchema = {
        type: "OBJECT",
        properties: {
            sequences: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        name: { type: "STRING" },
                        type: { type: "STRING", enum: ["hook", "intro", "content", "conclusion"] },
                        voiceover_script: { type: "STRING" },
                        on_camera_dialogue: { type: "STRING" },
                        locations: {
                            type: "ARRAY",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    name: { type: "STRING" },
                                    footage_types: { type: "ARRAY", items: { type: "STRING", enum: ["bRoll", "onCamera", "drone"] } }
                                },
                                required: ["name", "footage_types"]
                            }
                        }
                    },
                    required: ["name", "type", "voiceover_script", "on_camera_dialogue", "locations"]
                }
            }
        },
        required: ["sequences"]
    };

    try {
        const response = await window.aiUtils.callGeminiAPI(prompt, settings, { taskTier: 'heavy' }, { responseSchema });

        if (!response || typeof response !== 'object' || !response.sequences) {
            throw new Error("AI returned an invalid response format for the shot list.");
        }
        
        return response.sequences;

    } catch (err) {
        console.error("Error generating shot list for editing with AI:", err);
        throw new Error(`Failed to generate shot list for editing: ${err.message || "An unknown AI error occurred."}`);
    }
};
