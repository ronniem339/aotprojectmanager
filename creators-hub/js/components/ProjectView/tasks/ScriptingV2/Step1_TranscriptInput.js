// WRITE to file: ./creators-hub/js/components/ProjectView/tasks/ScriptingV2/Step1_TranscriptInput.js

const { useState, useEffect, useRef } = React;

window.Step1_TranscriptInput = () => {
    // --- CORRECTED: ANTI-PROP-DRILLING PATTERN ---
    // Fetch all necessary state and handlers directly from the global hook.
    const { video, settings, handlers } = window.useAppState();
    const blueprint = video?.tasks?.scriptingV2_blueprint || {};
    // ---------------------------------------------

    const [transcript, setTranscript] = useState(blueprint.rawTranscript || '');
    const [isProcessing, setIsProcessing] = useState(false);

    // --- CORRECTED: Debounced Autosave Logic ---
    const autosaveTimeout = useRef(null);
    useEffect(() => {
        if (autosaveTimeout.current) clearTimeout(autosaveTimeout.current);

        autosaveTimeout.current = setTimeout(() => {
            // Only save if not processing and text has changed.
            if (!isProcessing && transcript !== (blueprint.rawTranscript || '')) {
                console.log('Autosaving transcript...');
                const newBlueprint = { ...blueprint, rawTranscript: transcript };
                // Use the handler from useAppState to update the video.
                handlers.updateVideo(video.id, { tasks: { ...video.tasks, scriptingV2_blueprint: newBlueprint } }, true); // silent update
            }
        }, 1500);

        return () => clearTimeout(autosaveTimeout.current);
    }, [transcript, isProcessing, blueprint.rawTranscript]);
    // --- End Corrected Autosave ---

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
                args: { transcript, footage_log: video.footage_log, settings }
            });

            if (!dialogueMapResult) throw new Error("AI did not return a valid dialogue map.");

            const newBlueprint = {
                ...blueprint,
                rawTranscript: transcript,
                dialogueMap: dialogueMapResult,
                workflowStatus: 'dialogue_mapping'
            };
            
            // Use the handler to perform the final state update for this step
            handlers.updateVideo(video.id, { tasks: { ...video.tasks, scriptingV2_blueprint: newBlueprint } });

        } catch (error) {
            handlers.displayNotification(`Error mapping dialogue: ${error.message}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    return React.createElement('div', { className: 'p-4 border border-gray-700 rounded-lg' },
        React.createElement('h2', { className: 'text-xl font-bold text-white mb-3' }, "Step 1: Input Your On-Camera Transcript"),
        React.createElement('p', { className: 'mb-4 text-gray-400' }, "Paste the full, unedited transcript of all your on-camera dialogue here."),
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
