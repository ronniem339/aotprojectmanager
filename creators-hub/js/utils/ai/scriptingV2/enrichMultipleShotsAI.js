// creators-hub/js/utils/ai/scriptingV2/enrichMultipleShotsAI.js

window.aiUtils.enrichMultipleShotsAI = async ({ shotsToResearch, video, settings, progressCallback }) => {
    console.log(`Starting bulk research for ${shotsToResearch.length} shots.`);
    const updatedShots = [];

    for (let i = 0; i < shotsToResearch.length; i++) {
        const shot = shotsToResearch[i];
        
        if (progressCallback) {
            progressCallback(`Researching shot ${i + 1} of ${shotsToResearch.length}: ${shot.shot_description.substring(0, 30)}...`);
        }

        try {
            // We can reuse the single-shot enrichment logic.
            // This assumes enrichBlueprintAI is designed to handle one shot at a time.
            const response = await window.aiUtils.enrichBlueprintAI({ shot, video, settings });
            
            // Create a new shot object with the research notes.
            const updatedShot = {
                ...shot,
                ai_research_notes: response.research_notes || []
            };
            updatedShots.push(updatedShot);

        } catch (error) {
            console.error(`Failed to research shot ${shot.shot_id}:`, error);
            // If a single shot fails, we still add it back to maintain the array structure,
            // but we can add an error note.
            const failedShot = {
                ...shot,
                ai_research_notes: [`Error: Failed to retrieve research. ${error.message}`]
            };
            updatedShots.push(failedShot);
        }
    }

    console.log("Bulk research complete.");
    return { updated_shots: updatedShots };
};
