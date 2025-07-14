// WRITE to file: ./creators-hub/js/components/ProjectView/tasks/ScriptingV2/Step1_TranscriptInput.js

const { useState, useEffect, useRef } = React;

window.Step1_TranscriptInput = ({ video, updateVideo, settings }) => {
    const { handlers } = window.useAppState();
    const blueprint = video?.tasks?.scriptingV2_blueprint || {};
    
    const [transcript, setTranscript] = useState(blueprint.rawTranscript || '');
    const [isProcessing, setIsProcessing] = useState(false);

    // --- NEW: Autosave Logic ---
    const autosaveTimeout = useRef(null);
    useEffect(() => {
        // Clear any existing pending save
        if (autosaveTimeout.current) {
            clearTimeout(autosaveTimeout.current);
        }

        // Set up a new save to run after 1.5 seconds
        autosaveTimeout.current = setTimeout(() => {
            // Only save if an AI task is NOT in progress and the text has actually changed
            if (!isProcessing && transcript !== (blueprint.rawTranscript || '')) {
                console.log('Autosaving transcript...');
                const newBlueprint = {
                    ...blueprint,
                    rawTranscript: transcript
                };
                updateVideo({
                    ...video,
                    tasks: { ...video.tasks, scriptingV2_blueprint: newBlueprint }
                }, true); // Pass true for a 'silent' update that doesn't show a notification
            }
        }, 1500);

        // Cleanup function to clear the timeout if the component unmounts
        return () => {
            if (autosaveTimeout.current) {
                clearTimeout(autosaveTimeout.current);
            }
        };
    }, [transcript, isProcessing, blueprint.rawTranscript, updateVideo]);
    // --- End Autosave Logic ---

    const handleNext = async () => {
        setIsProcessing(true);
        const taskId = `scriptingV2-map-dialogue-${video.id}-${Date.now()}`;
        
        try {
            const dialogueMapResult = await handlers.triggerAiTask({
                id: taskId,
                type: 'scriptingV2-map-dialogue',
                name: 'Mapping Dialogue to Locations',
                intensity: 'medium', 
                aiFunction: window.aiUtils.mapDialogueToLocationsAI,
                args: { 
                    transcript: transcript,
                    footage_log: video.footage_log,
                    settings
                }
            });

            if (!dialogueMapResult) {
                throw new Error("AI did not return a valid dialogue map.");
            }

            const newBlueprint = {
                ...blueprint,
                rawTranscript: transcript,
                dialogueMap: dialogueMapResult,
                workflowStatus: 'dialogue_mapping'
            };
            
            updateVideo({
                ...video,
                tasks: { ...video.tasks, scriptingV2_blueprint: newBlueprint }
            });

        } catch (error) {
            console.error("Failed to map dialogue:", error);
            handlers.displayNotification(`Error mapping dialogue: ${error.message}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    return React.createElement('div', { className: 'p-4 border border-gray-700 rounded-lg' },
        React.createElement('h2', { className: 'text-xl font-bold text-white mb-3' }, "Step 1: Input Your On-Camera Transcript"),
        React.createElement('p', { className: 'mb-4 text-gray-400' },
            "Paste the full, unedited transcript of all your on-camera dialogue here. This will form the foundation of your video's narrative."
        ),
        React.createElement('textarea', {
            className: 'w-full h-64 p-2 border border-gray-600 rounded bg-gray-900 text-white',
            value: transcript,
            onChange: (e) => setTranscript(e.target.value),
            placeholder: 'Paste your transcript here...'
        }),
        React.createElement('div', { className: 'mt-4 flex justify-end' },
            React.createElement('button', {
                onClick: handleNext,
                disabled: !transcript.trim() || isProcessing,
                className: 'btn btn-primary disabled:opacity-50'
            }, isProcessing ? '🤖 Analyzing Transcript...' : 'Map Dialogue to Locations')
        )
    );
};
