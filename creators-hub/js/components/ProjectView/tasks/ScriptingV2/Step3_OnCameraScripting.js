// creators-hub/js/components/ProjectView/tasks/ScriptingV2/Step3_OnCameraScripting.js

const { useState, useEffect } = React;
const { mapTranscriptToBlueprintAI } = window;

window.Step3_OnCameraScripting = ({ blueprint, setBlueprint, video, settings }) => {
    const [view, setView] = useState('main'); // 'main', 'import', 'shotByShot'
    const [fullTranscript, setFullTranscript] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');

    const handleMapTranscript = async () => {
        if (!fullTranscript.trim()) {
            setError("Transcript cannot be empty.");
            return;
        }
        setIsProcessing(true);
        setError('');
        try {
            const mappedDialogue = await mapTranscriptToBlueprintAI({
                fullTranscript,
                blueprint,
                video,
                settings
            });

            if (!mappedDialogue) {
                throw new Error("AI did not return a valid mapping.");
            }

            // Create a new blueprint object with the mapped dialogue
            const updatedShots = blueprint.shots.map(shot => ({
                ...shot,
                on_camera_dialogue: mappedDialogue[shot.shot_id] || shot.on_camera_dialogue || ''
            }));

            setBlueprint({ ...blueprint, shots: updatedShots });
            setView('shotByShot'); // Switch to the shot-by-shot view to see the results

        } catch (err) {
            console.error("Error mapping transcript:", err);
            setError("Failed to map transcript to blueprint. The AI may have returned an unexpected format. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDialogueChange = (shotId, dialogue) => {
        const updatedShots = blueprint.shots.map(shot => {
            if (shot.shot_id === shotId) {
                return { ...shot, on_camera_dialogue: dialogue };
            }
            return shot;
        });
        setBlueprint({ ...blueprint, shots: updatedShots });
    };

    const renderMainView = () => (
        React.createElement('div', { className: 'text-center' },
            React.createElement('h3', { className: 'text-xl font-semibold text-primary-accent mb-3' }, "Step 3: On-Camera Scripting"),
            React.createElement('p', { className: 'text-gray-400 mb-6' }, "How would you like to add your on-camera dialogue?"),
            React.createElement('div', { className: 'flex justify-center gap-4' },
                React.createElement('button', {
                    onClick: () => setView('import'),
                    className: 'button-primary'
                }, '📝 Import Full Transcript'),
                React.createElement('button', {
                    onClick: () => setView('shotByShot'),
                    className: 'button-secondary'
                }, '✍️ Write Shot-by-Shot')
            )
        )
    );

    const renderImportView = () => (
        React.createElement('div', {},
            React.createElement('div', { className: 'flex items-center gap-4 mb-4' },
                React.createElement('button', { onClick: () => setView('main'), className: 'button-secondary-small' }, '‹ Back'),
                React.createElement('h3', { className: 'text-xl font-semibold text-primary-accent' }, "Import Transcript"),
            ),
            React.createElement('p', { className: 'text-gray-400 mb-4' }, "Paste your entire on-camera transcript below. The AI will read it and attempt to assign the dialogue to the correct shots in your blueprint."),
            React.createElement('textarea', {
                value: fullTranscript,
                onChange: (e) => setFullTranscript(e.target.value),
                rows: 15,
                className: 'w-full form-textarea bg-gray-900 border-gray-600 focus:ring-primary-accent focus:border-primary-accent',
                placeholder: 'Paste your full transcript here...'
            }),
            React.createElement('div', { className: 'text-center mt-4' },
                React.createElement('button', {
                    onClick: handleMapTranscript,
                    disabled: isProcessing,
                    className: 'button-primary disabled:opacity-50'
                }, isProcessing ? 'Processing...' : '🤖 Map Transcript to Shots')
            )
        )
    );

    const renderShotByShotView = () => (
        React.createElement('div', {},
            React.createElement('div', { className: 'flex items-center gap-4 mb-4' },
                React.createElement('button', { onClick: () => setView('main'), className: 'button-secondary-small' }, '‹ Back'),
                React.createElement('h3', { className: 'text-xl font-semibold text-primary-accent' }, "Shot-by-Shot Dialogue"),
            ),
            React.createElement('div', { className: 'flex-grow overflow-y-auto pr-2 h-[calc(100vh-250px)]' },
                (blueprint?.shots || []).map(shot =>
                    React.createElement('div', { key: shot.shot_id, className: 'bg-gray-800/70 p-4 rounded-xl border border-gray-700 mb-4' },
                        React.createElement('h4', { className: 'font-bold text-lg text-white' }, shot.shot_type),
                        React.createElement('p', { className: 'text-sm text-gray-400 mb-3' }, shot.shot_description),
                        React.createElement('textarea', {
                            value: shot.on_camera_dialogue || '',
                            onChange: (e) => handleDialogueChange(shot.shot_id, e.target.value),
                            rows: 4,
                            className: 'w-full form-textarea bg-gray-900 border-gray-600 focus:ring-primary-accent focus:border-primary-accent',
                            placeholder: 'Enter on-camera dialogue for this shot...'
                        })
                    )
                )
            )
        )
    );

    return React.createElement('div', { className: 'flex flex-col h-full' },
        error && React.createElement('p', { className: 'text-red-400 mb-4 text-center bg-red-900/50 p-3 rounded-lg' }, error),
        view === 'main' && renderMainView(),
        view === 'import' && renderImportView(),
        view === 'shotByShot' && renderShotByShotView()
    );
};
