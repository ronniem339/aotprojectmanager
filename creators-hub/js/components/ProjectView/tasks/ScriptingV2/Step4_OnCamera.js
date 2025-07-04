// creators-hub/js/components/ProjectView/tasks/ScriptingV2/Step4_OnCamera.js

// This component provides the UI for Step 4 of the V2 workflow.
// It filters the blueprint to show only shots that require on-camera dialogue
// and provides a textarea for the user to input their script for those shots.

const { useState, useMemo } = React;

window.Step4_OnCamera = ({ blueprint, setBlueprint }) => {

    // Memoize the filtering of on-camera shots to prevent re-renders.
    const onCameraShots = useMemo(() => {
        return (blueprint?.shots || []).filter(shot =>
            shot.shot_type.toLowerCase().includes('on-camera') ||
            shot.shot_type.toLowerCase().includes('dialogue') ||
            shot.shot_type.toLowerCase().includes('walking and talking')
        );
    }, [blueprint]);

    const handleDialogueChange = (shotId, dialogue) => {
        const updatedShots = blueprint.shots.map(shot => {
            if (shot.shot_id === shotId) {
                return { ...shot, on_camera_dialogue: dialogue };
            }
            return shot;
        });
        setBlueprint({ ...blueprint, shots: updatedShots });
    };

    const renderOnCameraEditor = (shot) => {
        return React.createElement('div', { key: shot.shot_id, className: 'bg-gray-800/70 p-4 rounded-xl border border-gray-700 mb-4' },
            React.createElement('h4', { className: 'font-bold text-lg text-white' }, shot.shot_type),
            React.createElement('p', { className: 'text-sm text-gray-400 mb-4' }, shot.shot_description),

            React.createElement('label', {
                htmlFor: `dialogue-${shot.shot_id}`,
                className: 'block text-xs font-bold text-cyan-300 uppercase tracking-wider mb-2'
            }, 'On-Camera Dialogue/Transcript'),
            React.createElement('textarea', {
                id: `dialogue-${shot.shot_id}`,
                value: shot.on_camera_dialogue || '',
                onChange: (e) => handleDialogueChange(shot.shot_id, e.target.value),
                rows: 6,
                className: 'w-full form-textarea bg-gray-900 border-gray-600 focus:ring-primary-accent focus:border-primary-accent',
                placeholder: 'Paste your transcript or write your on-camera dialogue here...'
            })
        );
    };

    return React.createElement('div', { className: 'flex flex-col h-full' },
        React.createElement('h3', { className: 'text-xl font-semibold text-primary-accent mb-3' }, "Step 4: Add On-Camera Dialogue"),
        React.createElement('p', { className: 'text-gray-400 mb-6' }, "For any shots where you'll be on camera, add your dialogue or transcript below. This will be woven into the final voiceover script."),

        onCameraShots.length > 0
            ? React.createElement('div', { className: 'flex-grow overflow-y-auto pr-2' },
                onCameraShots.map(shot => renderOnCameraEditor(shot))
              )
            : React.createElement('div', { className: 'flex-grow flex items-center justify-center bg-gray-800/50 rounded-lg' },
                React.createElement('p', { className: 'text-gray-500 text-center' }, 'No "On-Camera" shots found in the blueprint.')
              )
    );
};
