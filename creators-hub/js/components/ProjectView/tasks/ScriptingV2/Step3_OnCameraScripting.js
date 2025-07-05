// creators-hub/js/components/ProjectView/tasks/ScriptingV2/Step3_OnCameraScripting.js

const { useState, useEffect } = React;
const { mapTranscriptToBlueprintAI, refineBlueprintFromTranscriptAI } = window; // Import new utility

window.Step3_OnCameraScripting = ({ blueprint, setBlueprint, video, settings }) => {
    const [view, setView] = useState('main'); // 'main', 'import', 'shotByShot', 'refineBlueprint'
    const [fullTranscript, setFullTranscript] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const [blueprintSuggestions, setBlueprintSuggestions] = useState([]); // New state for suggestions

    const handleMapTranscript = async () => {
        if (!fullTranscript.trim()) {
            setError("Transcript cannot be empty.");
            return;
        }
        setIsProcessing(true);
        setError('');
        try {
            // 1. Map Dialogue to Existing Shots
            const mappedDialogue = await mapTranscriptToBlueprintAI({
                fullTranscript,
                blueprint,
                video,
                settings
            });

            if (!mappedDialogue) {
                throw new Error("AI did not return a valid dialogue mapping.");
            }

            let updatedBlueprint = {
                ...blueprint,
                shots: blueprint.shots.map(shot => ({
                    ...shot,
                    on_camera_dialogue: mappedDialogue[shot.shot_id] || shot.on_camera_dialogue || ''
                }))
            };

            setBlueprint(updatedBlueprint); // Update blueprint with mapped dialogue immediately

            // 2. Refine Blueprint based on Full Transcript (new functionality)
            const refinementResults = await refineBlueprintFromTranscriptAI({
                fullTranscript,
                blueprint: updatedBlueprint, // Use the blueprint with mapped dialogue
                settings
            });

            if (refinementResults && refinementResults.suggestions && refinementResults.suggestions.length > 0) {
                setBlueprintSuggestions(refinementResults.suggestions);
                setView('refineBlueprint'); // Show suggestions view
            } else {
                setView('shotByShot'); // If no suggestions, go directly to shot-by-shot
            }

        } catch (err) {
            console.error("Error processing transcript or refining blueprint:", err);
            setError(`Failed to process transcript or refine blueprint: ${err.message}. Please try again.`);
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

    const applyBlueprintSuggestions = () => {
        let currentBlueprint = { ...blueprint };
        let currentShots = [...currentBlueprint.shots];

        blueprintSuggestions.forEach(suggestion => {
            if (suggestion.type === 'add') {
                // Ensure unique temporary ID for new shots
                const newShot = {
                    shot_id: suggestion.shot_id, // Use AI provided temp ID
                    shot_type: suggestion.shot_type || 'Unknown',
                    shot_description: suggestion.shot_description || 'New shot based on transcript insight.',
                    on_camera_dialogue: '', // New shots start with empty dialogue
                    ai_reason: suggestion.reason // Store AI's reason for the suggestion
                };
                currentShots.push(newShot);
            } else if (suggestion.type === 'modify') {
                currentShots = currentShots.map(shot => {
                    if (shot.shot_id === suggestion.shot_id) {
                        return {
                            ...shot,
                            shot_description: suggestion.shot_description || shot.shot_description,
                            ai_reason: suggestion.reason // Store AI's reason for the modification
                        };
                    }
                    return shot;
                });
            } else if (suggestion.type === 'remove') {
                currentShots = currentShots.filter(shot => shot.shot_id !== suggestion.shot_id);
            }
        });

        setBlueprint({ ...currentBlueprint, shots: currentShots });
        setBlueprintSuggestions([]); // Clear suggestions after applying
        setView('shotByShot'); // Move to shot-by-shot view to see applied changes
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
            React.createElement('p', { className: 'text-gray-400 mb-4' }, "Paste your entire on-camera transcript below. The AI will read it and attempt to assign the dialogue to the correct shots in your blueprint, and suggest blueprint improvements."),
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
                }, isProcessing ? 'Processing...' : '🤖 Process Transcript & Refine Blueprint')
            )
        )
    );

    const renderRefineBlueprintView = () => (
        React.createElement('div', {},
            React.createElement('div', { className: 'flex items-center gap-4 mb-4' },
                React.createElement('button', { onClick: () => setView('main'), className: 'button-secondary-small' }, '‹ Back'),
                React.createElement('h3', { className: 'text-xl font-semibold text-primary-accent' }, "Review Blueprint Suggestions"),
            ),
            React.createElement('p', { className: 'text-gray-400 mb-4' }, "The AI has analyzed your transcript and generated suggestions for refining your video blueprint. Review them below."),
            blueprintSuggestions.length > 0 ?
                React.createElement('div', { className: 'flex-grow overflow-y-auto pr-2 h-[calc(100vh-300px)]' },
                    blueprintSuggestions.map((suggestion, index) =>
                        React.createElement('div', { key: index, className: 'bg-gray-800/70 p-4 rounded-xl border border-gray-700 mb-4' },
                            React.createElement('h4', { className: `font-bold text-lg ${suggestion.type === 'add' ? 'text-green-400' : suggestion.type === 'remove' ? 'text-red-400' : 'text-yellow-400'}` },
                                `Suggestion: ${suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)} Shot ${suggestion.shot_id ? `(${suggestion.shot_id})` : ''}`
                            ),
                            suggestion.shot_type && React.createElement('p', { className: 'text-sm text-gray-300' }, `Type: ${suggestion.shot_type}`),
                            suggestion.shot_description && React.createElement('p', { className: 'text-sm text-gray-300' }, `Description: ${suggestion.shot_description}`),
                            suggestion.reason && React.createElement('p', { className: 'text-sm text-gray-400 mt-2' }, `Reason: ${suggestion.reason}`)
                        )
                    )
                )
                :
                React.createElement('p', { className: 'text-gray-400 text-center' }, "No blueprint refinement suggestions generated by the AI."),
            React.createElement('div', { className: 'text-center mt-4' },
                React.createElement('button', {
                    onClick: applyBlueprintSuggestions,
                    disabled: blueprintSuggestions.length === 0,
                    className: 'button-primary disabled:opacity-50'
                }, '✅ Apply Selected Suggestions & Continue')
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
                        shot.ai_reason && React.createElement('p', { className: 'text-xs text-yellow-500 mb-2' }, `AI Suggestion: ${shot.ai_reason}`), // Display AI reason
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
        view === 'refineBlueprint' && renderRefineBlueprintView(), // New view
        view === 'shotByShot' && renderShotByShotView()
    );
};
