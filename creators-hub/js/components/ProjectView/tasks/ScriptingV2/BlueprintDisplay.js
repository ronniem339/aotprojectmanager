// creators-hub/js/components/ProjectView/tasks/ScriptingV2/BlueprintDisplay.js

const { useState, useMemo } = React;
const { ShotCard } = window;

window.BlueprintDisplay = ({ blueprint, project, video, settings, isFullScreen, currentStep }) => {
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

    // The logic for grouping shots into scenes remains the same.
    const scenes = useMemo(() => {
        if (!blueprint?.shots) return []; // Return array to preserve order
        
        const sceneMap = blueprint.shots.reduce((acc, shot) => {
            const sceneId = shot.scene_id || shot.location || `scene-index-${shot.shot_description.substring(0,10)}`;
            if (!acc[sceneId]) {
                const shotsInThisScene = blueprint.shots.filter(s => (s.scene_id || s.location || `scene-index-${s.shot_description.substring(0,10)}`) === sceneId);
                const primaryLocation = shotsInThisScene.find(s => s.location)?.location || 'Unknown Location';

                acc[sceneId] = {
                    id: sceneId,
                    // Use the first shot's purpose and location as representative for the scene
                    narrative_purpose: shot.scene_narrative_purpose || `Scene at ${primaryLocation}`,
                    location: primaryLocation,
                    shots: []
                };
            }
            acc[sceneId].shots.push(shot);
            return acc;
        }, {});
        
        // **NEW**: Sort scenes to try and match the user's preferred structure.
        return Object.values(sceneMap).sort((a, b) => {
            const purposeA = a.narrative_purpose.toLowerCase();
            const purposeB = b.narrative_purpose.toLowerCase();
            const order = ['hook', 'intro', 'conclusion'];
            
            const indexA = order.findIndex(keyword => purposeA.includes(keyword));
            const indexB = order.findIndex(keyword => purposeB.includes(keyword));

            if (indexA !== -1 && indexB !== -1) return indexA - indexB; // Both are special scenes
            if (indexA !== -1) return -1; // A is special, B is not
            if (indexB !== -1) return 1;  // B is special, A is not
            return 0; // Neither are special, maintain original order
        });

    }, [blueprint?.shots]);

    if (scenes.length === 0) {
        return React.createElement('div', { className: 'text-center text-gray-400 p-4' }, 'The Creative Blueprint is currently empty. Start by running Step 1 to generate the initial structure.');
    }

    // **NEW**: Counter for generic scenes.
    let sceneCounter = 1;

    return React.createElement('div', { className: 'space-y-4' },
        scenes.map(sceneData => {
            const isSceneCompleted = completedItems.scenes[sceneData.id];
            
            // **NEW**: Logic to determine the scene title.
            let sceneTitle = '';
            let sceneNumberForShots = '';
            const lowerCasePurpose = sceneData.narrative_purpose.toLowerCase();

            if (lowerCasePurpose.includes('hook')) {
                sceneTitle = 'Hook';
                sceneNumberForShots = 'H';
            } else if (lowerCasePurpose.includes('intro')) {
                sceneTitle = 'Introduction';
                sceneNumberForShots = 'I';
            } else if (lowerCasePurpose.includes('conclusion')) {
                sceneTitle = 'Conclusion';
                sceneNumberForShots = 'C';
            } else {
                sceneTitle = `Scene ${sceneCounter}`;
                sceneNumberForShots = sceneCounter;
                sceneCounter++; // Only increment for generic scenes
            }

            return React.createElement('div', {
                key: sceneData.id,
                className: `pl-4 py-3 bg-gray-900/50 rounded-r-lg transition-all duration-300 ${isSceneCompleted ? 'border-l-4 border-green-600 opacity-70' : 'border-l-4 border-blue-600'}`
            },
                React.createElement('div', { className: 'flex justify-between items-center mb-2' },
                    React.createElement('div', { className: 'flex items-center gap-3' },
                        currentStep === 4 && React.createElement('input', {
                            type: 'checkbox',
                            checked: isSceneCompleted || false,
                            onChange: () => toggleCompletion('scenes', sceneData.id),
                            title: 'Mark whole scene as complete',
                            className: 'h-5 w-5 rounded bg-gray-700 border-gray-600 text-green-500 focus:ring-green-600 cursor-pointer'
                        }),
                        React.createElement('div', {className: currentStep !== 4 ? 'ml-8' : ''},
                            // **MODIFICATION**: Use the new title and show the purpose as a subtitle.
                            React.createElement('h3', { className: 'text-lg font-bold text-primary-accent' }, sceneTitle),
                            React.createElement('p', { className: 'text-sm text-gray-400 italic' }, sceneData.narrative_purpose)
                        )
                    )
                ),
                React.createElement('div', { className: 'space-y-3 border-t border-gray-700/50 pt-3 ml-8' },
                    sceneData.shots.map((shot, shotIndex) => React.createElement(ShotCard, {
                        key: shot.shot_id,
                        shot: shot,
                        isCompleted: completedItems.shots[shot.shot_id] || false,
                        onToggleComplete: () => toggleCompletion('shots', shot.shot_id),
                        currentStep: currentStep,
                        // **MODIFICATION**: Pass down scene and shot numbers.
                        sceneNumber: sceneNumberForShots,
                        shotNumber: shotIndex + 1
                    }))
                )
            );
        })
    );
};
