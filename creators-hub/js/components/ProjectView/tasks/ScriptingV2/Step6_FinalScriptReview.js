const { useState: useState6, useEffect: useEffect6, useRef: useRef6 } = React;

window.Step6_FinalScriptReview = ({ video, settings, handlers, project }) => {
    const blueprint = video?.tasks?.scriptingV2_blueprint || {};
    const [fullScript, setFullScript] = useState6(blueprint.finalScript || '');
    const [recordableVoiceover, setRecordableVoiceover] = useState6(blueprint.recordableVoiceover || '');
    const [globalFeedback, setGlobalFeedback] = useState6('');
    const [isProcessing, setIsProcessing] = useState6(false);
    const [viewMode, setViewMode] = useState6('full'); // 'full' or 'recordable'

    useEffect6(() => {
        setFullScript(blueprint.finalScript || '');
        setRecordableVoiceover(blueprint.recordableVoiceover || '');
    }, [blueprint.finalScript, blueprint.recordableVoiceover]);

    const autosaveTimeout = useRef6(null);
    useEffect6(() => {
        if (autosaveTimeout.current) clearTimeout(autosaveTimeout.current);
        autosaveTimeout.current = setTimeout(() => {
            if (!isProcessing && (
                fullScript !== (blueprint.finalScript || '') ||
                recordableVoiceover !== (blueprint.recordableVoiceover || '')
            )) {
                const newBlueprint = { ...blueprint, finalScript: fullScript, recordableVoiceover };
                handlers.updateVideo(video.id, { tasks: { ...video.tasks, scriptingV2_blueprint: newBlueprint } }, true);
            }
        }, 2000);
        return () => clearTimeout(autosaveTimeout.current);
    }, [fullScript, recordableVoiceover, isProcessing, blueprint.finalScript, blueprint.recordableVoiceover, video.id, handlers]);

    const handleGlobalRefine = async () => {
        if (!globalFeedback.trim()) {
            handlers.displayNotification("Global feedback cannot be empty.", 'warning');
            return;
        }
        setIsProcessing(true);
        const taskId = `scriptingV2-refine-entire-script-final-${video.id}-${Date.now()}`;
        try {
            const refinedScript = await handlers.triggerAiTask({
                id: taskId,
                type: 'scriptingV2-refine-entire-script',
                name: 'Applying Global Refinements to Final Script',
                intensity: 'heavy',
                aiFunction: window.aiUtils.refineEntireScriptAI,
                args: { draftScript: [{ content: viewMode === 'full' ? fullScript : recordableVoiceover, type: 'full_script' }], globalFeedback, settings } // Pass as a single block
            });
            if (!refinedScript) throw new Error("AI did not return a refined script.");
            if (viewMode === 'full') {
                setFullScript(refinedScript[0].content);
            } else {
                setRecordableVoiceover(refinedScript[0].content);
            }
            setGlobalFeedback('');
        } catch (error) {
            handlers.displayNotification(`Error applying global refinements: ${error.message}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFinalize = () => {
        const newBlueprint = {
            ...blueprint,
            finalScript: fullScript,
            recordableVoiceover,
            workflowStatus: 'voiceover_recording'
        };
        handlers.updateVideo(video.id, { tasks: { ...video.tasks, scriptingV2_blueprint: newBlueprint } });
        handlers.displayNotification("Script finalized! Proceed to voiceover recording.", 'success');
    };

    return (
        <div className="p-4 border border-gray-700 rounded-lg">
            <h2 className="text-xl font-bold text-white mb-3">Step 6: Final Script Review</h2>
            <p className="mb-4 text-gray-400">Review the complete, assembled script. Make any final edits or apply global refinements.</p>
            <div className="flex justify-center mb-4">
                <button
                    onClick={() => setViewMode('full')}
                    className={`px-4 py-2 rounded-l-lg text-sm font-semibold ${viewMode === 'full' ? 'bg-primary-accent text-white' : 'bg-gray-700 text-gray-300'}`}
                >
                    Full Script
                </button>
                <button
                    onClick={() => setViewMode('recordable')}
                    className={`px-4 py-2 rounded-r-lg text-sm font-semibold ${viewMode === 'recordable' ? 'bg-primary-accent text-white' : 'bg-gray-700 text-gray-300'}`}
                >
                    Recordable Voiceover
                </button>
            </div>
            <textarea
                value={viewMode === 'full' ? fullScript : recordableVoiceover}
                onChange={(e) => viewMode === 'full' ? setFullScript(e.target.value) : setRecordableVoiceover(e.target.value)}
                className="w-full h-96 p-2 border border-gray-600 rounded bg-gray-900 text-white font-mono text-sm"
                disabled={isProcessing}
            />
            <div className="p-4 border-t border-gray-700 mt-4">
                <h3 className="font-bold text-lg text-white mb-2">Global Refinement</h3>
                <p className="mb-3 text-gray-400">Give a high-level instruction to adjust the tone or style of the entire script.</p>
                <textarea
                    className="w-full h-20 p-2 border border-gray-600 rounded bg-gray-900 text-white"
                    value={globalFeedback}
                    onChange={(e) => setGlobalFeedback(e.target.value)}
                    placeholder="e.g., 'Make the whole thing a bit more sarcastic and use shorter sentences.'"
                    disabled={isProcessing}
                />
                <button
                    onClick={handleGlobalRefine}
                    disabled={!globalFeedback.trim() || isProcessing}
                    className="btn btn-secondary mt-2 w-full disabled:opacity-50"
                >
                    {isProcessing ? '🤖 Applying Global Changes...' : 'Apply Global Refinement'}
                </button>
            </div>
            <div className="mt-6 flex justify-end">
                <button
                    onClick={handleFinalize}
                    disabled={isProcessing}
                    className="btn btn-primary btn-large disabled:opacity-50"
                >
                    ✅ Mark Script as Complete
                </button>
            </div>
        </div>
    );
};
