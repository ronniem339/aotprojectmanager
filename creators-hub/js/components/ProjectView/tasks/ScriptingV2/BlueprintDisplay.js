// creators-hub/js/components/ProjectView/tasks/ScriptingV2/BlueprintDisplay.js

const { useState, useMemo } = React;
// REMOVED: MemoryJogger from this line
const { ShotCard } = window;

// REMOVED: fetchPlaceDetails and updateFootageInventoryItem from props
window.BlueprintDisplay = ({ blueprint, project, video, settings, isFullScreen }) => {
    const [completedItems, setCompletedItems] = useState({ scenes: {}, shots: {} });

    const toggleCompletion = (type, id) => {
        setCompletedItems(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                [id]: !prev[type][id]
            }
        }));
    };

    // REMOVED: The entire if-block that was rendering the MemoryJogger component
    if (!blueprint || !blueprint.shots || blueprint.shots.length === 0) {
        return React.createElement('div', { className: 'text-center text-gray-400 p-4' }, 'The Creative Blueprint is currently empty. Start by running Step 1 to generate the initial structure.');
    }

    const scenes = useMemo(() => {
        if (!blueprint.shots) return {};
        return blueprint.shots.reduce((acc, shot, index) => {
            const sceneId = shot.scene_id || shot.location || `scene-index-${index}`;
            if (!acc[sceneId]) {
                const shotsInThisScene = blueprint.shots.filter(s => (s.scene_id || s.location || `scene-index-${index}`) === sceneId);
                const primaryLocation = shotsInThisScene.find(s => s.location)?.location || 'Unknown Location';

                acc[sceneId] = {
                    id: sceneId,
                    narrative_purpose: shot.scene_narrative_purpose || `Scene at ${primaryLocation}`,
                    location: primaryLocation,
                    shots: []
                };
            }
            acc[sceneId].shots.push(shot);
            return acc;
        }, {});
    }, [blueprint.shots]);

    return React.createElement('div', { className: 'space-y-4' },
        Object.values(scenes).map(sceneData => {
            const isSceneCompleted = completedItems.scenes[sceneData.id];

            return React.createElement('div', {
                key: sceneData.id,
                className: `border-l-4 pl-4 py-3 bg-gray-900/50 rounded-r-lg transition-all duration-300 ${isSceneCompleted ? 'border-green-600 opacity-70' : 'border-blue-600'}`
            },
                React.createElement('div', { className: 'flex justify-between items-center mb-2' },
                    React.createElement('div', { className: 'flex items-center gap-3' },
                        React.createElement('input', {
                            type: 'checkbox',
                            checked: isSceneCompleted || false,
                            onChange: () => toggleCompletion('scenes', sceneData.id),
                            title: 'Mark whole scene as complete',
                            className: 'h-5 w-5 rounded bg-gray-700 border-gray-600 text-green-500 focus:ring-green-600 cursor-pointer'
                        }),
                        React.createElement('div', null,
                            React.createElement('h3', { className: 'text-lg font-bold text-primary-accent' }, sceneData.narrative_purpose),
                            React.createElement('p', { className: 'text-xs text-gray-400 font-mono flex items-center' },
                                React.createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', className: 'h-4 w-4 mr-1', fill:'none', viewBox: '0 0 24 24', stroke:'currentColor'},
                                    React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' }),
                                    React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M15 11a3 3 0 11-6 0 3 3 0 016 0z' })
                                ),
                                sceneData.location
                            )
                        )
                    )
                ),
                React.createElement('div', { className: 'space-y-3 border-t border-gray-700/50 pt-3 ml-8' },
                    sceneData.shots.map(shot => React.createElement(ShotCard, {
                        key: shot.shot_id,
                        shot: shot,
                        isCompleted: completedItems.shots[shot.shot_id] || false,
                        onToggleComplete: () => toggleCompletion('shots', shot.shot_id)
                    }))
                )
            );
        })
    );
};
