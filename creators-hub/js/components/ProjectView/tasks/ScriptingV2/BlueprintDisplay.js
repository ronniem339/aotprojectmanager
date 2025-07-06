// creators-hub/js/components/ProjectView/tasks/ScriptingV2/BlueprintDisplay.js

const { useState, useMemo } = React;
const { ShotCard, MemoryJogger } = window;

window.BlueprintDisplay = ({ blueprint, project, video, settings, fetchPlaceDetails, updateFootageInventoryItem, isFullScreen }) => {
    // MODIFICATION: Added state to manage visibility of scenes and shots.
    const [hiddenItems, setHiddenItems] = useState({ scenes: {}, shots: {} });

    const toggleVisibility = (type, id) => {
        setHiddenItems(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                [id]: !prev[type][id]
            }
        }));
    };

    if (!blueprint || !blueprint.shots || blueprint.shots.length === 0) {
        return React.createElement(MemoryJogger, {
            project: project,
            video: video,
            settings: settings,
            fetchPlaceDetails: fetchPlaceDetails,
            updateFootageInventoryItem: updateFootageInventoryItem
        });
    }

    // MODIFICATION: Memoize the scene grouping for performance.
    const scenes = useMemo(() => {
        if (!blueprint.shots) return {};
        return blueprint.shots.reduce((acc, shot) => {
            const sceneId = shot.scene_id || 'unassigned';
            if (!acc[sceneId]) {
                // Find the most common location for the scene to use as the scene title
                const locationsInScene = blueprint.shots
                    .filter(s => s.scene_id === sceneId && s.location)
                    .map(s => s.location);
                
                const primaryLocation = locationsInScene.length > 0 
                    ? Object.entries(locationsInScene.reduce((a, v) => (a[v] = (a[v] || 0) + 1, a), {})).reduce((a, v) => v[1] > a[1] ? v : a, [null, 0])[0]
                    : 'Unknown Location';

                acc[sceneId] = {
                    narrative_purpose: shot.scene_narrative_purpose || 'Untitled Scene',
                    location: primaryLocation,
                    shots: []
                };
            }
            acc[sceneId].shots.push(shot);
            return acc;
        }, {});
    }, [blueprint.shots]);
    
    // MODIFICATION: Complete visual overhaul of the blueprint display.
    return React.createElement('div', { className: 'space-y-4' },
        Object.entries(scenes).map(([sceneId, sceneData]) => {
            const isSceneHidden = hiddenItems.scenes[sceneId];
            const sceneShotCount = sceneData.shots.length;

            return React.createElement('div', { 
                key: sceneId, 
                // Added distinct border and padding for each scene block
                className: 'border-l-4 border-blue-600 pl-4 py-2 bg-gray-900/50 rounded-r-lg' 
            },
                React.createElement('div', { className: 'flex justify-between items-center mb-2' },
                    React.createElement('div', null,
                        React.createElement('h3', { className: 'text-lg font-bold text-primary-accent' }, sceneData.narrative_purpose),
                        React.createElement('p', { className: 'text-xs text-gray-400 font-mono flex items-center' }, 
                            React.createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', className: 'h-4 w-4 mr-1', fill:'none', viewBox: '0 0 24 24', stroke:'currentColor'}, 
                                React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' }),
                                React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M15 11a3 3 0 11-6 0 3 3 0 016 0z' })
                            ),
                            sceneData.location
                        )
                    ),
                    // Added Show/Hide button for the scene
                    React.createElement('button', { 
                        onClick: () => toggleVisibility('scenes', sceneId),
                        className: 'text-xs font-semibold text-gray-400 hover:text-white p-2 rounded-md hover:bg-gray-700'
                    }, 
                        isSceneHidden ? `Show ${sceneShotCount} Shots` : 'Hide'
                    )
                ),
                // Conditionally render shots based on visibility state
                !isSceneHidden && React.createElement('div', { className: 'space-y-3 border-t border-gray-700 pt-3' },
                    sceneData.shots.map(shot => React.createElement(ShotCard, { 
                        key: shot.shot_id, 
                        shot: shot,
                        // Pass down visibility state and toggle handler to the card
                        isHidden: hiddenItems.shots[shot.shot_id],
                        onToggleVisibility: () => toggleVisibility('shots', shot.shot_id)
                    }))
                )
            );
        })
    );
};
