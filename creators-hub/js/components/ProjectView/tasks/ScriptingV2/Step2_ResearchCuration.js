// creators-hub/js/components/ProjectView/tasks/ScriptingV2/Step2_ResearchCuration.js
const { useState } = React;
// No longer importing enrichBlueprintAI directly, as it's called via handlers.triggerAiTask
// const { enrichBlueprintAI } = window; 

window.Step2_ResearchCuration = ({ blueprint, setBlueprint, video, settings }) => {
    // Access handlers from useAppState
    const { handlers } = window.useAppState();

    const [researchingShotId, setResearchingShotId] = useState(null);
    // Local error state can be simplified/removed if all error messaging is handled globally
    const [error, setError] = useState(''); 

    const handleResearchClick = async (shotToResearch) => {
        setResearchingShotId(shotToResearch.shot_id);
        setError(''); // Clear local error before starting

        const taskId = `scriptingV2-research-${shotToResearch.shot_id}-${Date.now()}`;
        const taskName = `Researching Shot: ${shotToResearch.shot_description.substring(0, 30)}...`;

        try {
            await handlers.triggerAiTask({
                id: taskId,
                type: 'scriptingV2-research',
                name: taskName,
                aiFunction: window.aiUtils.enrichBlueprintAI,
                args: { 
                    shot: shotToResearch, 
                    video, 
                    settings 
                },
                onSuccess: (response) => {
                    // Output validation is handled inside enrichBlueprintAI.js, but a final check here.
                    if (!response || !Array.isArray(response.research_notes)) {
                         throw new Error("AI did not return valid research notes. (Post-processing validation)");
                    }

                    const updatedShots = blueprint.shots.map(shot => {
                        if (shot.shot_id === shotToResearch.shot_id) {
                            return { ...shot, ai_research_notes: response.research_notes };
                        }
                        return shot;
                    });
                    setBlueprint({ ...blueprint, shots: updatedShots });
                },
                onFailure: (err) => {
                    // triggerAiTask already displays a notification.
                    // This local callback can be used for any component-specific cleanup or logging.
                    console.error("Local handler caught research error:", err);
                    setError(`Failed to get research for "${shotToResearch.shot_description}". Details: ${err.message || 'Unknown error.'}`);
                }
            });

        } catch (err) {
            // This catch block will only be hit if triggerAiTask re-throws the error.
            console.error("Unhandled error from triggerAiTask in Step2_ResearchCuration:", err);
            setError(`An unhandled error occurred: ${err.message || 'Please check console.'}`);
        } finally {
            setResearchingShotId(null);
        }
    };

    return React.createElement('div', { className: 'flex flex-col h-full' },
        React.createElement('h3', { className: 'text-xl font-semibold text-primary-accent mb-3' }, 'Step 2: Research & Curation'),
        React.createElement('p', { className: 'text-gray-400 mb-6' }, 'For any B-Roll or Drone shots that need a voiceover, use the AI to find interesting facts and talking points. The results will be added to the blueprint.'),
        error && React.createElement('p', { className: 'text-red-400 mb-4 text-center bg-red-900/50 p-3 rounded-lg' }, error),
        React.createElement('div', { className: 'flex-grow' }, // Removed overflow-y-auto here as the parent now handles it
            (blueprint?.shots || []).map(shot => {
                const needsResearch = shot.shot_type.toLowerCase().includes('drone') || shot.shot_type.toLowerCase().includes('b-roll');

                return React.createElement(window.ShotCard, {
                    key: shot.shot_id,
                    shot: shot,
                    isResearchableShot: needsResearch,
                    onEnrichShot: handleResearchClick,
                    isEnriching: researchingShotId === shot.shot_id
                });
            })
        )
    );
};
