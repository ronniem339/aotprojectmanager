// creators-hub/js/components/ProjectView/tasks/ScriptingV2/Step3_OnCameraScripting.js

const { useState, useEffect } = React;
// mapTranscriptToBlueprintAI and refineBlueprintFromTranscriptAI are now called via handlers.triggerAiTask
// const { mapTranscriptToBlueprintAI, refineBlueprintFromTranscriptAI = window;

window.Step3_OnCameraScripting = ({ blueprint, setBlueprint, video, settings }) => {
    // Access handlers from useAppState
    const { handlers } = window.useAppState();

    // Initialize state for view and fullTranscript from the blueprint for persistence
    const [view, setViewInternal] = useState(blueprint?.scriptingV2_view_mode || 'main'); // 'main', 'import', 'shotByShot', 'refineBlueprint', 'resolveAmbiguity'
    const [fullTranscript, setFullTranscriptInternal] = useState(blueprint?.fullTranscript || '');

    const [isProcessing, setIsProcessing] = useState(false); // Local state for button disabling/immediate feedback
    const [processingMessage, setProcessingMessage] = useState(''); // Local message for immediate feedback
    const [error, setError] = useState(''); // Local error for direct component display
    const [blueprintSuggestions, setBlueprintSuggestions] = useState([]);
    const [selectedSuggestions, setSelectedSuggestions] = useState(new Set());

    const [ambiguousDialogueSegments, setAmbiguousDialogueSegments] = useState([]);
    const [resolvedAmbiguityChoices, setResolvedAmbiguityChoices] = useState({});

    // Helper to update view state and persist to blueprint
    const setViewAndPersist = (newView) => {
        setViewInternal(newView);
        setBlueprint(prevBlueprint => ({
            ...prevBlueprint,
            scriptingV2_view_mode: newView
        }));
    };

    // Helper to update fullTranscript state and persist to blueprint
    const setFullTranscriptAndPersist = (newTranscript) => {
        setFullTranscriptInternal(newTranscript);
        setBlueprint(prevBlueprint => ({
            ...prevBlueprint,
            fullTranscript: newTranscript
        }));
    };

    // Effect to re-hydrate local states if blueprint changes externally (e.g., loaded from Firestore)
    useEffect(() => {
        if (blueprint?.fullTranscript !== undefined && blueprint.fullTranscript !== fullTranscript) {
            setFullTranscriptInternal(blueprint.fullTranscript || '');
        }
        if (blueprint?.scriptingV2_view_mode !== undefined && blueprint.scriptingV2_view_mode !== view) {
            setViewInternal(blueprint.scriptingV2_view_mode || 'main');
        }
    }, [blueprint]); // Depend on the entire blueprint object

    // Effect to clean up local errors when view changes or process completes/starts
    useEffect(() => {
        setError('');
        setProcessingMessage('');
    }, [view, isProcessing]);


    const handleMapTranscript = async () => {
        if (!fullTranscript.trim()) {
            setError("Transcript cannot be empty.");
            handlers.displayNotification("Transcript cannot be empty.", 'error');
            return;
        }
        setIsProcessing(true);
        setProcessingMessage('Mapping transcript to shots...'); // ADDED: Initial message for local status bar
        setError(''); // Clear previous local errors

        const mapTaskId = `scriptingV2-map-transcript-${video.id}-${Date.now()}`;

        try {
            // 1. Map Dialogue to Existing Shots (AI will now return both types of dialogue)
            const mappedDialogueResult = await handlers.triggerAiTask({
                id: mapTaskId,
                type: 'scriptingV2-map-transcript',
                name: 'Mapping Transcript',
                aiFunction: window.aiUtils.mapTranscriptToBlueprintAI,
                args: {
                    fullTranscript,
                    blueprint,
                    video,
                    settings
                },
                onSuccess: (result) => {
                    if (!result) {
                        throw new Error("AI did not return a valid dialogue mapping.");
                    }

                    let tempBlueprintForProcessing = {
                        ...blueprint,
                        // Persist the fullTranscript entered by the user
                        fullTranscript: fullTranscript,
                        shots: blueprint.shots.map(shot => ({
                            ...shot,
                            // Clear ai_reason when re-processing to ensure fresh state
                            ai_reason: '',
                            on_camera_dialogue: result[shot.shot_id]?.on_camera_dialogue || '',
                            voiceover_script: result[shot.shot_id]?.voiceover_script || ''
                        }))
                    };

                    // Identify ambiguous dialogue segments for user confirmation
                    const ambiguities = [];
                    tempBlueprintForProcessing.shots.forEach(shot => {
                        const isNonOnCameraShot = ['B-Roll', 'Location', 'Activity', 'Product', 'Footage_Only'].includes(shot.shot_type);
                        const isDroneShot = shot.shot_type === 'Drone';

                        // An ambiguity arises if an On-Camera dialogue is found on a non-On-Camera/non-Drone shot type.
                        if (isNonOnCameraShot && !isDroneShot && shot.on_camera_dialogue.trim() !== '') {
                            ambiguities.push({
                                shot_id: shot.shot_id,
                                shot_type: shot.shot_type,
                                shot_description: shot.shot_description,
                                location_tag: shot.location_tag,
                                dialogue: shot.on_camera_dialogue,
                                ai_classification: 'on_camera_dialogue' // AI thinks it's on-camera but type suggests voiceover
                            });
                            // Temporarily move to voiceover_script, user will confirm
                            shot.voiceover_script = shot.on_camera_dialogue;
                            shot.on_camera_dialogue = '';
                        }
                    });

                    setBlueprint(tempBlueprintForProcessing); // Update blueprint with mapped dialogue and persisted transcript

                    if (ambiguities.length > 0) {
                        setAmbiguousDialogueSegments(ambiguities);
                        setProcessingMessage('Ambiguous dialogue detected. Awaiting your confirmation.');
                        setViewAndPersist('resolveAmbiguity'); // Use the new setter
                    } else {
                        // If no ambiguities, directly proceed to blueprint refinement
                        handleRefineBlueprint(tempBlueprintForProcessing);
                    }
                },
                onFailure: (err) => {
                    setError(`Failed to map transcript: ${err.message || 'An unknown error occurred.'}`);
                }
            });

        } catch (err) {
            console.error("Unhandled error in handleMapTranscript:", err);
            setError(`An unexpected error occurred during transcript mapping: ${err.message || 'Please check console.'}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRefineBlueprint = async (currentBlueprintState) => {
        setIsProcessing(true);
        setError(''); // Clear previous local errors
        setProcessingMessage('Analyzing transcript for blueprint refinements...'); // Already present and good

        const refineTaskId = `scriptingV2-refine-blueprint-${video.id}-${Date.now()}`;

        try {
            const refinementResults = await handlers.triggerAiTask({
                id: refineTaskId,
                type: 'scriptingV2-refine-blueprint',
                name: 'Refining Blueprint',
                aiFunction: window.aiUtils.refineBlueprintFromTranscriptAI,
                args: {
                    fullTranscript, // Pass the persisted fullTranscript
                    blueprint: currentBlueprintState, // Use the blueprint with applied mappings
                    settings
                },
                onSuccess: (result) => {
                    if (result && result.suggestions && result.suggestions.length > 0) {
                        setBlueprintSuggestions(result.suggestions);
                        setSelectedSuggestions(new Set(result.suggestions.map((_, i) => i))); // Select all by default
                        setProcessingMessage('Refinement suggestions ready for review.');
                        setViewAndPersist('refineBlueprint'); // Use the new setter
                    } else {
                        setProcessingMessage('No refinement suggestions generated. Moving to shot-by-shot view.');
                        setViewAndPersist('shotByShot'); // Use the new setter
                    }
                },
                onFailure: (err) => {
                    setError(`Failed to refine blueprint: ${err.message || 'An unknown error occurred.'}`);
                }
            });

        } catch (err) {
            console.error("Unhandled error in handleRefineBlueprint:", err);
            setError(`An unexpected error occurred during blueprint refinement: ${err.message || 'Please check console.'}`);
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
                // Ensure unique scene_id for new shots if it's a new narrative purpose
                const newShot = {
                    shot_id: `generated_shot_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    shot_type: suggestion.shot_type || 'New Shot',
                    shot_description: suggestion.shot_description || 'New shot based on transcript insight.',
                    on_camera_dialogue: '',
                    voiceover_script: '',
                    ai_research_notes: [],
                    creator_experience_notes: '',
                    estimated_time_seconds: suggestion.estimated_time_seconds || 5, // Use AI provided time if available
                    scene_id: suggestion.scene_id || `scene_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, // Ensure scene_id for new shots
                    scene_narrative_purpose: suggestion.scene_narrative_purpose || 'New Scene', // Ensure purpose for new shots
                    ai_reason: suggestion.reason
                };

                const placement = suggestion.placement_suggestion;
                if (placement && placement.relative_to_shot_id) {
                    const relativeShotIndex = currentShots.findIndex(s => s.shot_id === placement.relative_to_shot_id);
                    if (relativeShotIndex !== -1) {
                        if (placement.position === 'before') {
                            currentShots.splice(relativeShotIndex, 0, newShot);
                        } else if (placement.position === 'after') {
                            currentShots.splice(relativeShotIndex + 1, 0, newShot);
                        } else {
                            currentShots.push(newShot); // Default to end if position is invalid
                        }
                    } else {
                        currentShots.push(newShot); // Default to end if relative_to_shot_id not found
                    }
                } else {
                    currentShots.push(newShot); // Default to end if no placement suggestion
                }

            } else if (suggestion.type === 'modify') {
                currentShots = currentShots.map(shot => {
                    if (shot.shot_id === suggestion.shot_id) {
                        return {
                            ...shot,
                            shot_description: suggestion.shot_description || shot.shot_description,
                            // If AI suggests new narrative purpose, update it
                            scene_narrative_purpose: suggestion.scene_narrative_purpose || shot.scene_narrative_purpose,
                            ai_reason: suggestion.reason // Add reason for modification for clarity
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
        setViewAndPersist('shotByShot'); // Use the new setter
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
                            ai_reason: `Resolved ambiguity: classified as ${choice}` // Add reason for classification
                        };
                    }
                    return shot;
                });
            }
        });

        const tempBlueprintAfterResolution = { ...blueprint, shots: updatedShots };
        setBlueprint(tempBlueprintAfterResolution); // Update blueprint with resolved dialogue

        // After resolving ambiguities, proceed to blueprint refinement
        handleRefineBlueprint(tempBlueprintAfterResolution);

        setIsProcessing(false); // This will be set to false by handleRefineBlueprint's finally block
    };


    const renderMainView = () => (
        React.createElement('div', { className: 'text-center' },
            React.createElement('h3', { className: 'text-xl font-semibold text-primary-accent mb-3' }, "Step 3: On-Camera Scripting"),
            React.createElement('p', { className: 'text-gray-400 mb-6' }, "How would you like to add your on-camera dialogue?"),
            React.createElement('div', { className: 'flex justify-center gap-4' },
                React.createElement('button', {
                    onClick: () => setViewAndPersist('import'), // Use the new setter
                    className: 'button-primary'
                }, '📝 Import Full Transcript'),
                React.createElement('button', {
                    onClick: () => setViewAndPersist('shotByShot'), // Use the new setter
                    className: 'button-secondary'
                }, '✍️ Write Shot-by-Shot')
            )
        )
    );

    const renderImportView = () => (
        React.createElement('div', {},
            React.createElement('div', { className: 'flex items-center gap-4 mb-4' },
                React.createElement('button', { onClick: () => setViewAndPersist('main'), className: 'button-secondary-small' }, '‹ Back'), // Use the new setter
                React.createElement('h3', { className: 'text-xl font-semibold text-primary-accent' }, "Import Transcript"),
            ),
            React.createElement('p', { className: 'text-gray-400 mb-4' }, "Paste your entire on-camera transcript below. The AI will attempt to assign dialogue to shots. You may be asked to clarify ambiguous segments."),
            React.createElement('textarea', {
                value: fullTranscript,
                onChange: (e) => setFullTranscriptAndPersist(e.target.value), // Use the new setter
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
                React.createElement('button', { onClick: () => setViewAndPersist('main'), className: 'button-secondary-small' }, '‹ Back'), // Use the new setter
                React.createElement('h3', { className: 'text-xl font-semibold text-primary-accent' }, "Resolve Ambiguous Dialogue"),
            ),
            React.createElement('p', { className: 'text-gray-400 mb-4' }, "The AI found dialogue segments that could be either on-camera or voiceover based on the shot type. Please clarify for each:"),
            ambiguousDialogueSegments.length > 0 ?
                React.createElement('div', { className: 'flex-grow overflow-y-auto pr-2' },
                    ambiguousDialogueSegments.map((segment, index) =>
                        React.createElement('div', { key: segment.shot_id, className: 'bg-gray-800/70 p-4 rounded-xl border border-gray-700 mb-4' },
                            React.createElement('h4', { className: 'font-bold text-lg text-white' }, `Shot: ${segment.shot_type} - "${segment.shot_description}"`),
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
                React.createElement('button', { onClick: () => setViewAndPersist('main'), className: 'button-secondary-small' }, '‹ Back'), // Use the new setter
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
                                    onChange: () => handleToggleSuggestion(index), // Use onChange here as well for direct checkbox interaction
                                    className: 'h-5 w-5 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent'
                                })
                            ),
                            // Display user-friendly information based on suggestion type
                            suggestion.type === 'add' && React.createElement('div', null,
                                React.createElement('p', { className: 'text-sm text-gray-300' }, `Type: ${suggestion.shot_type}`),
                                React.createElement('p', { className: 'text-sm text-gray-300' }, `New Description: ${suggestion.shot_description}`),
                                // ADDED: Display placement suggestion for new shots
                                suggestion.placement_suggestion && React.createElement('p', { className: 'text-sm text-gray-500 mt-1' },
                                    `Suggested Placement: ${suggestion.placement_suggestion.position} existing shot "${
                                        blueprint.shots.find(s => s.shot_id === suggestion.placement_suggestion.relative_to_shot_id)?.shot_description || suggestion.placement_suggestion.relative_to_shot_id
                                    }"`
                                )
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
                React.createElement('button', { onClick: () => setViewAndPersist('main'), className: 'button-secondary-small' }, '‹ Back'), // Use the new setter
                React.createElement('h3', { className: 'text-xl font-semibold text-primary-accent' }, "Shot-by-Shot Dialogue"),
            ),
            React.createElement('div', { className: 'flex-grow overflow-y-auto pr-2' },
                (blueprint?.shots || []).map(shot =>
                    React.createElement('div', { key: shot.shot_id, className: 'bg-gray-800/70 p-4 rounded-xl border border-gray-700 mb-4' },
                        React.createElement('h4', { className: 'font-bold text-lg text-white' }, shot.shot_type),
                        shot.location_tag && React.createElement('p', { className: 'text-sm text-gray-500 mb-2' }, `Location: ${shot.location_tag}`),
                        React.createElement('p', { className: 'text-sm text-gray-400 mb-3' }, shot.shot_description),
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
