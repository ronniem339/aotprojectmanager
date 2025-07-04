// creators-hub/js/components/ProjectView/tasks/ScriptingV2/BlueprintDisplay.js

// This component is the main container for the right-hand panel.
// It takes the full blueprint object, checks for shots, and maps over them
// to render a list of ShotCard components.

const { ShotCard } = window;

window.BlueprintDisplay = ({ blueprint }) => {
    if (!blueprint || !blueprint.shots || blueprint.shots.length === 0) {
        return React.createElement('div', { className: 'flex items-center justify-center h-full' },
            React.createElement('p', { className: 'text-gray-500 text-center' },
                'The Creative Blueprint is empty.\nStart by filling out the "Brain Dump" and generating the initial blueprint.'
            )
        );
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
