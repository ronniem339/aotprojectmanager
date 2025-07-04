// creators-hub/js/components/ProjectView/tasks/ScriptingV2/Step2_ResearchCuration.js

// This component provides the UI for the second step of the V2 workflow.
// It allows the user to trigger AI-powered research for each shot in the blueprint
// that requires a voiceover.

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

            // Update the blueprint state by finding the correct shot and updating its notes.
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

    // We also need to update the ShotCard to include the new "Research" button.
    // For now, we'll add the logic here. We can refactor ShotCard later if needed.
    const renderShotCardWithResearch = (shot) => {
        const needsResearch = shot.shot_type.toLowerCase().includes('drone') || shot.shot_type.toLowerCase().includes('b-roll');
        const isResearching = researchingShotId === shot.shot_id;

        // Using original ShotCard and adding a button to it.
        return React.createElement('div', { key: shot.shot_id },
            React.createElement(window.ShotCard, { shot: shot }),
            needsResearch && React.createElement('div', { className: 'text-right -mt-2 mb-4' },
                React.createElement('button', {
                    onClick: () => handleResearchClick(shot),
                    disabled: isResearching,
                    className: 'button-secondary-small disabled:opacity-50'
                },
                    isResearching ? 'Researching...' : '✨ Find Interesting Facts'
                )
            )
        );
    };


    return React.createElement('div', { className: 'flex flex-col h-full' },
        React.createElement('h3', { className: 'text-xl font-semibold text-primary-accent mb-3' }, 'Step 2: Research & Curation'),
        React.createElement('p', { className: 'text-gray-400 mb-6' }, 'For any B-Roll or Drone shots that need a voiceover, use the AI to find interesting facts and talking points. The results will be added to the blueprint.'),
        error && React.createElement('p', { className: 'text-red-400 mb-4 text-center bg-red-900/50 p-3 rounded-lg' }, error),
        React.createElement('div', { className: 'flex-grow overflow-y-auto pr-2' },
             // This is a simplified display. The main blueprint on the right will show the full cards.
             (blueprint?.shots || []).map(shot => renderShotCardWithResearch(shot))
        )
    );
};
