// creators-hub/js/components/ProjectView/tasks/ScriptingV2/Step3_OnCameraScripting.js

const { useState, useEffect } = React;
const { mapTranscriptToBlueprintAI, refineBlueprintFromTranscriptAI } = window;

window.Step3_OnCameraScripting = ({ blueprint, setBlueprint, video, settings }) => {
    const [view, setView] = useState('main'); // 'main', 'import', 'shotByShot', 'refineBlueprint', 'resolveAmbiguity'
    const [fullTranscript, setFullTranscript] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingMessage, setProcessingMessage] = useState('');
    const [error, setError] = useState('');
    const [blueprintSuggestions, setBlueprintSuggestions] = useState([]);
    const [selectedSuggestions, setSelectedSuggestions] = useState(new Set());

    const [ambiguousDialogueSegments, setAmbiguousDialogueSegments] = useState([]);
    const [resolvedAmbiguityChoices, setResolvedAmbiguityChoices] = useState({});

    const handleMapTranscript = async () => {
        if (!fullTranscript.trim()) {
            setError("Transcript cannot be empty.");
            return;
        }
        setIsProcessing(true);
        setProcessingMessage('Starting process...');
        setError('');
        setAmbiguousDialogueSegments([]); // Clear previous ambiguities
        setResolvedAmbiguityChoices({}); // Clear previous choices

        try {
            // 1. Map Dialogue to Existing Shots (AI will now return both types of dialogue)
            setProcessingMessage('Mapping transcript to video shots...');
            const mappedDialogueResult = await mapTranscriptToBlueprintAI({
                fullTranscript,
                blueprint,
                video,
                settings
            });

            if (!mappedDialogueResult) {
                throw new Error("AI did not return a valid dialogue mapping.");
            }

            let tempBlueprintForProcessing = {
                ...blueprint,
                shots: blueprint.shots.map(shot => ({
                    ...shot,
                    // ADDED: Clear ai_reason when re-processing to ensure fresh state
                    ai_reason: '',
                    on_camera_dialogue: mappedDialogueResult[shot.shot_id]?.on_camera_dialogue || '',
                    voiceover_script: mappedDialogueResult[shot.shot_id]?.voiceover_script || ''
                }))
            };

            // Identify ambiguous dialogue segments for user confirmation
            const ambiguities = [];
            tempBlueprintForProcessing.shots.forEach(shot => {
                const isNonOnCameraShot = ['B-Roll', 'Location', 'Activity', 'Product', 'Footage_Only'].includes(shot.shot_type);
                const isDroneShot = shot.shot_type === 'Drone';

                if (isNonOnCameraShot && !isDroneShot && shot.on_camera_dialogue.trim() !== '') {
                    ambiguities.push({
                        shot_id: shot.shot_id,
                        shot_type: shot.shot_type,
                        shot_description: shot.shot_description,
                        location_tag: shot.location_tag, // ADDED: Include location_tag for ambiguity view
                        dialogue: shot.on_camera_dialogue,
                        ai_classification: 'on_camera_dialogue'
                    });
                    // Temporarily move the dialogue to voiceover_script to clean up on_camera_dialogue for this type
                    shot.voiceover_script = shot.on_camera_dialogue;
                    shot.on_camera_dialogue = '';
                }
            });

            setBlueprint(tempBlueprintForProcessing);

            if (ambiguities.length > 0) {
                setAmbiguousDialogueSegments(ambiguities);
                setProcessingMessage('Ambiguous dialogue detected. Awaiting your confirmation.');
                setView('resolveAmbiguity');
            } else {
                setProcessingMessage('No ambiguous dialogue detected. Refining blueprint...');
                const refinementResults = await refineBlueprintFromTranscriptAI({
                    fullTranscript,
                    blueprint: tempBlueprintForProcessing,
                    settings
                });

                if (refinementResults && refinementResults.suggestions && refinementResults.suggestions.length > 0) {
                    setBlueprintSuggestions(refinementResults.suggestions);
                    setSelectedSuggestions(new Set(refinementResults.suggestions.map((_, i) => i)));
                    setProcessingMessage('Refinement suggestions ready for review.');
                    setView('refineBlueprint');
                } else {
                    setProcessingMessage('No refinement suggestions generated. Moving to shot-by-shot view.');
                    setView('shotByShot');
                }
            }

        } catch (err) {
            console.error("Error processing transcript or refining blueprint:", err);
            setError(`Failed to process transcript or refine blueprint: ${err.message}. Please try again.`);
            setProcessingMessage('Process failed.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleShotCardDialogueChange = (shotId, field, value) => {
        const updatedShots = blueprint.shots.map(shot => {
            if (shot.shot_id === shotId) {
                return { ...shot, [field]: value };
            }
            return shot;
        });
        setBlueprint({ ...blueprint, shots: updatedShots });
    };

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
        setIsProcessing(true);
        setProcessingMessage('Applying selected blueprint suggestions...');
        let currentShots = [...blueprint.shots];

        blueprintSuggestions.forEach((suggestion, index) => {
            if (!selectedSuggestions.has(index)) {
                return;
            }

            if (suggestion.type === 'add') {
                const newShotId = `generated_shot_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                const newShot = {
                    shot_id: newShotId,
                    shot_type: suggestion.shot_type || 'New Shot',
                    shot_description: suggestion.shot_description || 'New shot based on transcript insight.',
                    on_camera_dialogue: '',
                    voiceover_script: '',
                    ai_research_notes: [],
                    creator_experience_notes: '',
                    estimated_time_seconds: 5,
                    scene_id: `scene_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    scene_narrative_purpose: `New Scene: ${suggestion.shot_description}` || 'New Scene',
                    ai_reason: suggestion.reason
                };
                currentShots.push(newShot);
            } else if (suggestion.type === 'modify') {
                currentShots = currentShots.map(shot => {
                    if (shot.shot_id === suggestion.shot_id) {
                        return {
                            ...shot,
                            shot_description: suggestion.shot_description || shot.shot_description,
                            // ADDED: Clear ai_reason after modification is applied
                            ai_reason: ''
                        };
                    }
                    return shot;
                });
            } else if (suggestion.type === 'remove') {
                currentShots = currentShots.filter(shot => shot.shot_id !== suggestion.shot_id);
            }
        });

        setBlueprint({ ...blueprint, shots: currentShots });
        setBlueprintSuggestions([]);
        setSelectedSuggestions(new Set());
        setProcessingMessage('Suggestions applied. Moving to shot-by-shot view.');
        setIsProcessing(false);
        setView('shotByShot');
    };

    const handleAmbiguityChoice = (shotId, choice) => {
        setResolvedAmbiguityChoices(prevChoices => ({
            ...prevChoices,
            [shotId]: choice
        }));
    };

    const applyAmbiguityResolutions = async () => {
        setIsProcessing(true);
        setProcessingMessage('Applying dialogue classifications...');
        let updatedShots = [...blueprint.shots];

        ambiguousDialogueSegments.forEach(segment => {
            const choice = resolvedAmbiguityChoices[segment.shot_id];
            if (choice) {
                updatedShots = updatedShots.map(shot => {
                    if (shot.shot_id === segment.shot_id) {
                        return {
                            ...shot,
                            on_camera_dialogue: choice === 'on_camera_dialogue' ? segment.dialogue : '',
                            voiceover_script: choice === 'voiceover_script' ? segment.dialogue : '',
                            ai_reason: '' // ADDED: Clear ai_reason after resolving ambiguity
                        };
                    }
                    return shot;
                });
            }
        });

        const tempBlueprintAfterResolution = { ...blueprint, shots: updatedShots };
        setBlueprint(tempBlueprintAfterResolution);

        setProcessingMessage('Dialogue classified. Analyzing transcript for blueprint refinements...');
        const refinementResults = await refineBlueprintFromTranscriptAI({
            fullTranscript,
            blueprint: tempBlueprintAfterResolution,
            settings
        });

        if (refinementResults && refinementResults.suggestions && refinementResults.suggestions.length > 0) {
            setBlueprintSuggestions(refinementResults.suggestions);
            setSelectedSuggestions(new Set(refinementResults.suggestions.map((_, i) => i)));
            setProcessingMessage('Refinement suggestions ready for review.');
            setView('refineBlueprint');
        } else {
            setProcessingMessage('No refinement suggestions generated. Moving to shot-by-shot view.');
            setView('shotByShot');
        }
        setIsProcessing(false);
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
            React.createElement('p', { className: 'text-gray-400 mb-4' }, "Paste your entire on-camera transcript below. The AI will attempt to assign dialogue to shots. You may be asked to clarify ambiguous segments."),
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
                }, isProcessing ? processingMessage : '🤖 Process Transcript')
            )
        )
    );

    const renderResolveAmbiguityView = () => (
        React.createElement('div', { className: 'flex flex-col h-full' },
            React.createElement('div', { className: 'flex items-center gap-4 mb-4' },
                React.createElement('button', { onClick: () => setView('main'), className: 'button-secondary-small' }, '‹ Back'),
                React.createElement('h3', { className: 'text-xl font-semibold text-primary-accent' }, "Resolve Ambiguous Dialogue"),
            ),
            React.createElement('p', { className: 'text-gray-400 mb-4' }, "The AI found dialogue segments that could be either on-camera or voiceover based on the shot type. Please clarify for each:"),
            ambiguousDialogueSegments.length > 0 ?
                React.createElement('div', { className: 'flex-grow overflow-y-auto pr-2' },
                    ambiguousDialogueSegments.map((segment, index) =>
                        React.createElement('div', { key: segment.shot_id, className: 'bg-gray-800/70 p-4 rounded-xl border border-gray-700 mb-4' },
                            React.createElement('h4', { className: 'font-bold text-lg text-white' }, `Shot: ${segment.shot_type} - "${segment.shot_description}"`),
                            // ADDED: Display location tag prominently for clarity
                            segment.location_tag && React.createElement('p', { className: 'text-sm text-gray-500 mb-2' }, `Location: ${segment.location_tag}`),
                            React.createElement('p', { className: 'text-sm text-gray-300 mb-3' }, `Ambiguous Dialogue: "${segment.dialogue}"`),
                            React.createElement('div', { className: 'flex gap-4' },
                                React.createElement('label', { className: 'flex items-center text-gray-300' },
                                    React.createElement('input', {
                                        type: 'radio',
                                        name: `ambiguity-${segment.shot_id}`,
                                        value: 'on_camera_dialogue',
                                        checked: resolvedAmbiguityChoices[segment.shot_id] === 'on_camera_dialogue',
                                        onChange: () => handleAmbiguityChoice(segment.shot_id, 'on_camera_dialogue'),
                                        className: 'form-radio h-4 w-4 text-primary-accent focus:ring-primary-accent'
                                    }),
                                    React.createElement('span', { className: 'ml-2' }, 'On-Camera Dialogue')
                                ),
                                React.createElement('label', { className: 'flex items-center text-gray-300' },
                                    React.createElement('input', {
                                        type: 'radio',
                                        name: `ambiguity-${segment.shot_id}`,
                                        value: 'voiceover_script',
                                        checked: resolvedAmbiguityChoices[segment.shot_id] === 'voiceover_script',
                                        onChange: () => handleAmbiguityChoice(segment.shot_id, 'voiceover_script'),
                                        className: 'form-radio h-4 w-4 text-primary-accent focus:ring-primary-accent'
                                    }),
                                    React.createElement('span', { className: 'ml-2' }, 'Voiceover Script')
                                )
                            )
                        )
                    )
                )
                :
                React.createElement('p', { className: 'text-gray-400 text-center' }, "No ambiguous dialogue segments to resolve."),
            React.createElement('div', { className: 'text-center mt-4' },
                React.createElement('button', {
                    onClick: applyAmbiguityResolutions,
                    disabled: Object.keys(resolvedAmbiguityChoices).length !== ambiguousDialogueSegments.length || isProcessing,
                    className: 'button-primary disabled:opacity-50'
                }, isProcessing ? processingMessage : '✅ Confirm & Continue')
            )
        )
    );

    const renderRefineBlueprintView = () => (
        React.createElement('div', { className: 'flex flex-col h-full' },
            React.createElement('div', { className: 'flex items-center gap-4 mb-4' },
                React.createElement('button', { onClick: () => setView('main'), className: 'button-secondary-small' }, '‹ Back'),
                React.createElement('h3', { className: 'text-xl font-semibold text-primary-accent' }, "Review Blueprint Suggestions"),
            ),
            React.createElement('p', { className: 'text-gray-400 mb-4' }, "The AI has analyzed your transcript and generated suggestions for refining your video blueprint. Select the ones you wish to apply."),
            blueprintSuggestions.length > 0 ?
                React.createElement('div', { className: 'flex-grow overflow-y-auto pr-2' },
                    blueprintSuggestions.map((suggestion, index) => {
                        const isSelected = selectedSuggestions.has(index);
                        const originalShot = blueprint.shots.find(s => s.shot_id === suggestion.shot_id);

                        return React.createElement('div', {
                            key: index,
                            onClick: () => handleToggleSuggestion(index),
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
                                    onChange: () => handleToggleSuggestion(index),
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
                    disabled: selectedSuggestions.size === 0 || isProcessing,
                    className: 'button-primary disabled:opacity-50'
                }, isProcessing ? processingMessage : '✅ Apply Selected Suggestions & Continue')
            )
        )
    );

    const renderShotByShotView = () => (
        React.createElement('div', { className: 'flex flex-col h-full' },
            React.createElement('div', { className: 'flex items-center gap-4 mb-4' },
                React.createElement('button', { onClick: () => setView('main'), className: 'button-secondary-small' }, '‹ Back'),
                React.createElement('h3', { className: 'text-xl font-semibold text-primary-accent' }, "Shot-by-Shot Dialogue"),
            ),
            React.createElement('div', { className: 'flex-grow overflow-y-auto pr-2' },
                (blueprint?.shots || []).map(shot =>
                    React.createElement('div', { key: shot.shot_id, className: 'bg-gray-800/70 p-4 rounded-xl border border-gray-700 mb-4' },
                        React.createElement('h4', { className: 'font-bold text-lg text-white' }, shot.shot_type),
                        // ADDED: Display Location Tag prominently for each shot
                        shot.location_tag && React.createElement('p', { className: 'text-sm text-gray-500 mb-2' }, `Location: ${shot.location_tag}`),
                        React.createElement('p', { className: 'text-sm text-gray-400 mb-3' }, shot.shot_description),
                        // REMOVED: ai_reason here, it should only be shown during suggestion review
                        // shot.ai_reason && React.createElement('p', { className: 'text-xs text-yellow-500 mb-2' }, `AI Suggestion: ${shot.ai_reason}`),
                        React.createElement('label', { className: 'block text-sm font-medium text-gray-300 mb-1 mt-3' }, 'On-Camera Dialogue (seen speaking):'),
                        React.createElement('textarea', {
                            value: shot.on_camera_dialogue || '',
                            onChange: (e) => handleShotCardDialogueChange(shot.shot_id, 'on_camera_dialogue', e.target.value),
                            rows: 3,
                            className: 'w-full form-textarea bg-gray-900 border-gray-600 focus:ring-primary-accent focus:border-primary-accent mb-3',
                            placeholder: 'Enter on-camera dialogue for this shot...'
                        }),
                        React.createElement('label', { className: 'block text-sm font-medium text-gray-300 mb-1' }, 'Voiceover Script (heard over visuals):'),
                        React.createElement('textarea', {
                            value: shot.voiceover_script || '',
                            onChange: (e) => handleShotCardDialogueChange(shot.shot_id, 'voiceover_script', e.target.value),
                            rows: 3,
                            className: 'w-full form-textarea bg-gray-900 border-gray-600 focus:ring-primary-accent focus:focus:border-primary-accent',
                            placeholder: 'Enter voiceover script for this shot...'
                        })
                    )
                )
            )
        )
    );

    return React.createElement('div', { className: 'flex flex-col h-full' },
        error && React.createElement('p', { className: 'text-red-400 mb-4 text-center bg-red-900/50 p-3 rounded-lg' }, error),
        isProcessing && React.createElement('div', { className: 'text-white text-center mb-4 p-3 bg-blue-900/50 rounded-lg' },
            React.createElement('p', { className: 'font-semibold' }, processingMessage)
        ),
        view === 'main' && renderMainView(),
        view === 'import' && renderImportView(),
        view === 'resolveAmbiguity' && renderResolveAmbiguityView(),
        view === 'refineBlueprint' && renderRefineBlueprintView(),
        view === 'shotByShot' && renderShotByShotView()
    );
};
