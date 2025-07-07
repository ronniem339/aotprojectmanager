// creators-hub/js/components/ProjectView/tasks/ScriptingV2/Step2_ResearchCuration.js

const { useState } = React;

window.Step2_ResearchCuration = ({ blueprint, setBlueprint, video, settings, triggerAiTask }) => {
    const [researchingShotId, setResearchingShotId] = useState(null);
    const [error, setError] = useState('');

    const handleResearchClick = async (shotToResearch) => {
        if (!triggerAiTask) {
            console.error("triggerAiTask handler is missing. Cannot perform research.");
            setError("The AI research function is not available. Please contact support.");
            return;
        }

        // **FIX APPLIED HERE**
        // This guard clause checks if the essential details exist on the shot object
        // before making the AI call. Note that 'scene_narrative_purpose' is checked on the shot itself.
        if (!shotToResearch.location && !shotToResearch.shot_description && !shotToResearch.scene_narrative_purpose) {
            const errorMessage = "Cannot research this shot. Critical details like its location, description, or the scene's narrative purpose are missing.";
            console.error(errorMessage, shotToResearch);
            setError(errorMessage + " Please add more detail to the shot or scene in the blueprint first.");
            // We return early to prevent the error.
            return;
        }

        setResearchingShotId(shotToResearch.shot_id);
        setError('');

        const taskId = `scriptingV2-research-${shotToResearch.shot_id}-${Date.now()}`;
        // We can now safely access shot_description as we've already checked it exists.
        const taskName = `Researching Shot: ${shotToResearch.shot_description.substring(0, 30)}...`;

        try {
            await triggerAiTask({
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
                    console.error("Local handler caught research error:", err);
                    setError(`Failed to get research for "${shotToResearch.shot_description}". Details: ${err.message || 'Unknown error.'}`);
                }
            });

        } catch (err) {
            console.error("Unhandled error from triggerAiTask in Step2_ResearchCuration:", err);
            setError(`An unhandled error occurred: ${err.message || 'Please check console.'}`);
        } finally {
            setResearchingShotId(null);
        }
    };

    // The render function remains the same, but it's now more stable.
    return React.createElement('div', { className: 'flex flex-col h-full' },
        React.createElement('h3', { className: 'text-xl font-semibold text-primary-accent mb-3' }, 'Step 2: Research & Curation'),
        React.createElement('p', { className: 'text-gray-400 mb-6' }, 'For any B-Roll or Drone shots that need a voiceover, use the AI to find interesting facts and talking points. The results will be added to the blueprint.'),
        error && React.createElement('p', { className: 'text-red-400 mb-4 text-center bg-red-900/50 p-3 rounded-lg' }, error),
        React.createElement('div', { className: 'flex-grow' },
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
