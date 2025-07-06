// creators-hub/js/components/ProjectView/tasks/ScriptingV2/BlueprintDisplay.js

// This component is the main container for the right-hand panel.
// It takes the full blueprint object, checks for shots, and maps over them
// to render a list of ShotCard components.

const { ShotCard, MemoryJogger } = window; // ADDED MemoryJogger

window.BlueprintDisplay = ({ blueprint, project, video }) => { // ADDED project, video props
    // If the blueprint is empty, show the MemoryJogger instead of the old message
    if (!blueprint || !blueprint.shots || blueprint.shots.length === 0) {
        return React.createElement(MemoryJogger, { project, video });
    }

    // Group shots by scene_id
    const scenes = blueprint.shots.reduce((acc, shot) => {
        const sceneId = shot.scene_id || 'unassigned';
        if (!acc[sceneId]) {
            acc[sceneId] = {
                narrative_purpose: shot.scene_narrative_purpose,
                shots: []
            };
        }
        acc[sceneId].shots.push(shot);
        return acc;
    }, {});

    return React.createElement('div', { className: 'space-y-6' },
        Object.entries(scenes).map(([sceneId, sceneData]) => (
            React.createElement('div', { key: sceneId, className: 'bg-gray-900/50 p-4 rounded-lg' },
                React.createElement('h3', { className: 'text-lg font-semibold text-primary-accent mb-4' },
                    `Scene: ${sceneData.narrative_purpose || 'Untitled Scene'}`
                ),
                sceneData.shots.map(shot => React.createElement(ShotCard, { key: shot.shot_id, shot: shot }))
            )
        ))
    );
};
