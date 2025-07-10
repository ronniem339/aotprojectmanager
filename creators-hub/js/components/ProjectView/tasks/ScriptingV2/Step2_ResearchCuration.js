// creators-hub/js/components/ProjectView/tasks/ScriptingV2/Step2_ResearchCuration.js

const { useState, useCallback } = React;

window.Step2_ResearchCuration = ({ blueprint, setBlueprint, video, settings, triggerAiTask }) => {
    const [researchingShotId, setResearchingShotId] = useState(null);
    const [isResearchingAll, setIsResearchingAll] = useState(false);
    const [error, setError] = useState('');

    const handleResearchClick = useCallback(async (shotToResearch) => {
        if (!triggerAiTask) {
            console.error("triggerAiTask handler is missing.");
            setError("The AI research function is not available.");
            return;
        }

        if (!shotToResearch.location && !shotToResearch.shot_description && !shotToResearch.scene_narrative_purpose) {
            setError(`Cannot research "${shotToResearch.shot_description.substring(0,30)}...": critical details are missing.`);
            return;
        }

        setResearchingShotId(shotToResearch.shot_id);
        setError('');

        const taskId = `scriptingV2-research-${shotToResearch.shot_id}-${Date.now()}`;
        const taskName = `Researching Shot: ${shotToResearch.shot_description.substring(0, 30)}...`;

        try {
            await triggerAiTask({
                id: taskId,
                type: 'scriptingV2-research',
                name: taskName,
                aiFunction: window.aiUtils.enrichBlueprintAI,
                args: { shot: shotToResearch, video, settings },
                onSuccess: (response) => {
                    setBlueprint(prevBlueprint => {
                        const updatedShots = prevBlueprint.shots.map(shot => {
                            if (shot.shot_id === shotToResearch.shot_id) {
                                return { ...shot, ai_research_notes: response.research_notes };
                            }
                            return shot;
                        });
                        return { ...prevBlueprint, shots: updatedShots };
                    });
                },
                onFailure: (err) => {
                    console.error("Local handler caught research error:", err);
                    setError(`Failed to get research for "${shotToResearch.shot_description}". Details: ${err.message || 'Unknown error.'}`);
                }
            });
        } catch (err) {
            console.error("Unhandled error from triggerAiTask:", err);
            setError(`An unhandled error occurred: ${err.message || 'Please check console.'}`);
        } finally {
            setResearchingShotId(null);
        }
    }, [triggerAiTask, blueprint, setBlueprint, video, settings]);

    // **NEW FUNCTION**
    // This handler finds all eligible shots and triggers the research task for each one.
    const handleResearchAllClick = useCallback(async () => {
        if (!triggerAiTask) {
            console.error("triggerAiTask handler is missing.");
            setError("The AI research function is not available.");
            return;
        }

        setIsResearchingAll(true);
        setError('');

        const shotsToResearch = (blueprint?.shots || []).filter(shot => {
            const needsResearch = shot.shot_type.toLowerCase().includes('drone') || shot.shot_type.toLowerCase().includes('b-roll');
            const hasSufficientData = shot.location || shot.shot_description || shot.scene_narrative_purpose;
            const notAlreadyResearched = !shot.ai_research_notes || shot.ai_research_notes.length === 0;
            return needsResearch && hasSufficientData && notAlreadyResearched;
        });

        if (shotsToResearch.length === 0) {
            setError("No shots require research or all eligible shots have been researched.");
            setIsResearchingAll(false);
            return;
        }

        const taskId = `scriptingV2-research-all-${video.id}-${Date.now()}`;
        const taskName = `Researching ${shotsToResearch.length} shots`;

        try {
            await triggerAiTask({
                id: taskId,
                type: 'scriptingV2-research-all',
                name: taskName,
                aiFunction: window.aiUtils.enrichMultipleShotsAI,
                args: { shotsToResearch, video, settings },
                onSuccess: (response) => {
                    setBlueprint(prevBlueprint => {
                        const updatedShotsMap = new Map(response.updated_shots.map(shot => [shot.shot_id, shot]));
                        const newShots = prevBlueprint.shots.map(shot => updatedShotsMap.get(shot.shot_id) || shot);
                        return { ...prevBlueprint, shots: newShots };
                    });
                },
                onFailure: (err) => {
                    console.error("Local handler caught bulk research error:", err);
                    setError(`Failed to research all shots. Details: ${err.message || 'Unknown error.'}`);
                }
            });
        } catch (err) {
            console.error("Unhandled error from triggerAiTask:", err);
            setError(`An unhandled error occurred during bulk research: ${err.message || 'Please check console.'}`);
        } finally {
            setIsResearchingAll(false);
        }
    }, [blueprint?.shots, triggerAiTask, video, settings, setBlueprint]);

    const researchableCount = (blueprint?.shots || []).filter(s => 
        (s.shot_type.toLowerCase().includes('drone') || s.shot_type.toLowerCase().includes('b-roll')) &&
        (!s.ai_research_notes || s.ai_research_notes.length === 0) &&
        (s.location || s.shot_description || s.scene_narrative_purpose)
    ).length;

    return React.createElement('div', { className: 'flex flex-col h-full' },
        React.createElement('div', { className: 'flex justify-between items-center mb-3' },
            React.createElement('h3', { className: 'text-xl font-semibold text-primary-accent' }, 'Step 2: Research & Curation'),
            // **NEW BUTTON**
            React.createElement('button', {
                    onClick: handleResearchAllClick,
                    disabled: isResearchingAll || researchableCount === 0,
                    className: 'btn btn-primary btn-sm disabled:opacity-50 disabled:cursor-not-allowed'
                },
                isResearchingAll ? 'Queueing Tasks...' : `Find Facts for All (${researchableCount})`
            )
        ),
        React.createElement('p', { className: 'text-gray-400 mb-6' }, 'For any B-Roll or Drone shots, use the AI to find interesting facts. The results will be added to the blueprint.'),
        error && React.createElement('p', { className: 'text-red-400 mb-4 text-center bg-red-900/50 p-3 rounded-lg' }, error),
        React.createElement('div', { className: 'flex-grow overflow-y-auto' }, // Added overflow for scrolling
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
