// creators-hub/js/components/ProjectView/tasks/ScriptingV2/Step3_OnCameraScripting.js

const { useState, useEffect } = React;
const { mapTranscriptToBlueprintAI, refineBlueprintFromTranscriptAI } = window;

window.Step3_OnCameraScripting = ({ blueprint, setBlueprint, video, settings }) => {
    const [view, setView] = useState('main'); // 'main', 'import', 'shotByShot', 'refineBlueprint'
    const [fullTranscript, setFullTranscript] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const [blueprintSuggestions, setBlueprintSuggestions] = useState([]);
    const [selectedSuggestions, setSelectedSuggestions] = useState(new Set()); // New state for selected suggestions

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
                setSelectedSuggestions(new Set(refinementResults.suggestions.map((_, i) => i))); // Select all by default
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

    // Toggle selection of a suggestion
    const handleToggleSuggestion = (index) => {
        const newSelection = new Set(selectedSuggestions);
        if (newSelection.has(index)) {
            newSelection.delete(index);
        } else {
            newSelection.add(index);
        }
        setSelectedSuggestions(newSelection);
    };

    const applyBlueprintSuggestions = () => {
        let currentShots = [...blueprint.shots];

        blueprintSuggestions.forEach((suggestion, index) => {
            if (!selectedSuggestions.has(index)) {
                return; // Skip if not selected
            }

            if (suggestion.type === 'add') {
                // Ensure unique temporary ID for new shots, or use AI provided temp ID
                const newShotId = suggestion.shot_id || `new_shot_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                const newShot = {
                    shot_id: newShotId,
                    shot_type: suggestion.shot_type || 'New Shot',
                    shot_description: suggestion.shot_description || 'New shot based on transcript insight.',
                    on_camera_dialogue: '', // New shots start with empty dialogue
                    voiceover_script: '',
                    ai_research_notes: [],
                    creator_experience_notes: '',
                    estimated_time_seconds: 5, // Default estimate
                    scene_id: `scene_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, // Assign to a new scene ID
                    scene_narrative_purpose: `New Scene: ${suggestion.shot_description}` || 'New Scene',
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

        setBlueprint({ ...blueprint, shots: currentShots });
        setBlueprintSuggestions([]); // Clear suggestions after applying
        setSelectedSuggestions(new Set()); // Clear selection
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
            React.createElement('p', { className: 'text-gray-400 mb-4' }, "The AI has analyzed your transcript and generated suggestions for refining your video blueprint. Select the ones you wish to apply."),
            blueprintSuggestions.length > 0 ?
                React.createElement('div', { className: 'flex-grow overflow-y-auto pr-2 h-[calc(100vh-300px)]' },
                    blueprintSuggestions.map((suggestion, index) => {
                        const isSelected = selectedSuggestions.has(index);
                        const originalShot = blueprint.shots.find(s => s.shot_id === suggestion.shot_id);

                        return React.createElement('div', {
                            key: index,
                            onClick: () => handleToggleSuggestion(index), // Make the whole card clickable
                            className: `bg-gray-800/70 p-4 rounded-xl border mb-4 cursor-pointer transition-all duration-200
                                ${isSelected ? 'border-primary-accent bg-blue-900/20' : 'border-gray-700 hover:border-gray-600'}`
                        },
                            React.createElement('div', { className: 'flex justify-between items-center mb-2' },
                                React.createElement('h4', { className: `font-bold text-lg ${suggestion.type === 'add' ? 'text-green-400' : suggestion.type === 'remove' ? 'text-red-400' : 'text-yellow-400'}` },
                                    `${suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)} Shot`
                                ),
                                React.createElement('input', {
                                    type: 'checkbox',
                                    checked: isSelected,
                                    onChange: () => handleToggleSuggestion(index), // Still allow checkbox to be clicked directly
                                    className: 'h-5 w-5 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent'
                                })
                            ),
                            // Display user-friendly information based on suggestion type
                            suggestion.type === 'add' && React.createElement('div', null,
                                React.createElement('p', { className: 'text-sm text-gray-300' }, `Type: ${suggestion.shot_type}`),
                                React.createElement('p', { className: 'text-sm text-gray-300' }, `New Description: ${suggestion.shot_description}`)
                            ),
                            suggestion.type === 'modify' && originalShot && React.createElement('div', null,
                                React.createElement('p', { className: 'text-sm text-gray-300' }, `Original Shot: ${originalShot.shot_type} - "${originalShot.shot_description}"`),
                                React.createElement('p', { className: 'text-sm text-yellow-300' }, `Revised Description: ${suggestion.shot_description}`)
                            ),
                            suggestion.type === 'remove' && originalShot && React.createElement('p', { className: 'text-sm text-gray-300 line-through' },
                                `Remove Shot: ${originalShot.shot_type} - "${originalShot.shot_description}"`
                            ),
                            suggestion.reason && React.createElement('p', { className: 'text-sm text-gray-400 mt-2' }, `Reason: ${suggestion.reason}`)
                        );
                    })
                )
                :
                React.createElement('p', { className: 'text-gray-400 text-center' }, "No blueprint refinement suggestions generated by the AI."),
            React.createElement('div', { className: 'text-center mt-4' },
                React.createElement('button', {
                    onClick: applyBlueprintSuggestions,
                    disabled: selectedSuggestions.size === 0,
                    className: 'button-primary disabled:opacity-50' // Now correctly formatted as a button
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
        view === 'refineBlueprint' && renderRefineBlueprintView(),
        view === 'shotByShot' && renderShotByShotView()
    );
};
