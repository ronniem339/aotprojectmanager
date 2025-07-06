// creators-hub/js/components/ProjectView/tasks/ScriptingV2/BlueprintDisplay.js

const { ShotCard, MemoryJogger } = window;

window.BlueprintDisplay = ({ blueprint, project, video, settings, handlers }) => { // MODIFICATION: Accept handlers prop
    if (!blueprint || !blueprint.shots || blueprint.shots.length === 0) {
        // MODIFICATION: Pass handlers down to MemoryJogger
        return React.createElement(MemoryJogger, { project, video, settings, handlers });
    }

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
