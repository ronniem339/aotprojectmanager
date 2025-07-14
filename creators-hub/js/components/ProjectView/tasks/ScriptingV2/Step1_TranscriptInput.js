const { useState: useState1, useEffect: useEffect1, useRef: useRef1 } = React; // Use aliases to avoid redeclaration errors

window.Step1_TranscriptInput = ({ video, settings, handlers }) => {
    const blueprint = video?.tasks?.scriptingV2_blueprint || {};
    const [transcript, setTranscript] = useState1(blueprint.rawTranscript || '');
    const [isProcessing, setIsProcessing] = useState1(false);

    const autosaveTimeout = useRef1(null);
    useEffect1(() => {
        if (autosaveTimeout.current) clearTimeout(autosaveTimeout.current);
        autosaveTimeout.current = setTimeout(() => {
            if (!isProcessing && transcript !== (blueprint.rawTranscript || '')) {
                const newBlueprint = { ...blueprint, rawTranscript: transcript };
                handlers.updateVideo(video.id, { tasks: { ...video.tasks, scriptingV2_blueprint: newBlueprint } }, true);
            }
        }, 1500);
        return () => clearTimeout(autosaveTimeout.current);
    }, [transcript, isProcessing, blueprint.rawTranscript, video.id, handlers]);

    const handleNext = async () => {
        if (!video.footage_log || video.footage_log.length === 0) {
            handlers.displayNotification("Error: Footage log is empty. Please add footage before mapping dialogue.", "error");
            return;
        }

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
            
            handlers.updateVideo(video.id, { tasks: { ...video.tasks, scriptingV2_blueprint: newBlueprint } });
        } catch (error) {
            handlers.displayNotification(`Error mapping dialogue: ${error.message}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="p-4 border border-gray-700 rounded-lg">
            <h2 className="text-xl font-bold text-white mb-3">Step 1: Input Your On-Camera Transcript</h2>
            <p className="mb-4 text-gray-400">Paste the full, unedited transcript of all your on-camera dialogue here.</p>
            <textarea
                className="w-full h-64 p-2 border border-gray-600 rounded bg-gray-900 text-white"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste your transcript here..."
            />
            <div className="mt-4 flex justify-end">
                <button
                    onClick={handleNext}
                    disabled={!transcript.trim() || isProcessing}
                    className="btn btn-primary disabled:opacity-50"
                >
                    {isProcessing ? '🤖 Analyzing Transcript...' : 'Map Dialogue to Locations'}
                </button>
            </div>
        </div>
    );
};
