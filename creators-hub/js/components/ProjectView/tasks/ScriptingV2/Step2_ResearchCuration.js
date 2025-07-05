// creators-hub/js/components/ProjectView/tasks/ScriptingV2/Step2_ResearchCuration.js
const { useState } = React;
const { enrichBlueprintAI } = window;

window.Step2_ResearchCuration = ({ blueprint, setBlueprint, video, settings }) => {
    const [researchingShotId, setResearchingShotId] = useState(null);
    const [error, setError] = useState('');

    const handleResearchClick = async (shotToResearch) => {
        setResearchingShotId(shotToResearch.shot_id);
        setError('');
        try {
            const response = await enrichBlueprintAI({
                shot: shotToResearch,
                video,
                settings
            });

            if (!response || !Array.isArray(response.research_notes)) {
                throw new Error("AI did not return valid research notes.");
            }

            const updatedShots = blueprint.shots.map(shot => {
                if (shot.shot_id === shotToResearch.shot_id) {
                    return { ...shot, ai_research_notes: response.research_notes };
                }
                return shot;
            });

            setBlueprint({ ...blueprint, shots: updatedShots });

        } catch (err) {
            console.error("Error enriching shot:", err);
            setError(`Failed to get research for "${shotToResearch.shot_description}". Please try again.`);
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
