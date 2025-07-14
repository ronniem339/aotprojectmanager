const { useState: useState2, useEffect: useEffect2, useRef: useRef2 } = React;

window.Step2_DialogueMapper = ({ video, settings, handlers }) => {
    const blueprint = video?.tasks?.scriptingV2_blueprint || {};
    const [dialogueMap, setDialogueMap] = useState2(blueprint.dialogueMap || []);
    const [isProcessing, setIsProcessing] = useState2(false);

    useEffect2(() => {
        setDialogueMap(blueprint.dialogueMap || []);
    }, [blueprint.dialogueMap]);

    const autosaveTimeout = useRef2(null);
    useEffect2(() => {
        if (autosaveTimeout.current) clearTimeout(autosaveTimeout.current);
        autosaveTimeout.current = setTimeout(() => {
            if (!isProcessing && JSON.stringify(dialogueMap) !== JSON.stringify(blueprint.dialogueMap || [])) {
                const newBlueprint = { ...blueprint, dialogueMap: dialogueMap };
                handlers.updateVideo(video.id, { tasks: { ...video.tasks, scriptingV2_blueprint: newBlueprint } }, true);
            }
        }, 2000);
        return () => clearTimeout(autosaveTimeout.current);
    }, [dialogueMap, isProcessing, blueprint.dialogueMap, video.id, handlers]);

    const handleLocationChange = (index, newLocationTag) => {
        const updatedMap = [...dialogueMap];
        updatedMap[index].locationTag = newLocationTag;
        updatedMap[index].status = 'confirmed';
        setDialogueMap(updatedMap);
    };

    const handleNext = async () => {
        setIsProcessing(true);
        const taskId = `scriptingV2-propose-narrative-${video.id}-${Date.now()}`;
        try {
            const narrativeProposal = await handlers.triggerAiTask({
                id: taskId,
                type: 'scriptingV2-propose-narrative',
                name: 'Proposing Story Narrative',
                intensity: 'heavy',
                aiFunction: window.aiUtils.proposeNarrativeAI,
                args: { dialogueMap, footage_log: video.footage_log, settings }
            });
            if (!narrativeProposal) throw new Error("AI did not return a valid narrative proposal.");
            const newBlueprint = {
                ...blueprint,
                dialogueMap,
                narrativeProposals: [narrativeProposal],
                workflowStatus: 'narrative_refinement'
            };
            handlers.updateVideo(video.id, { tasks: { ...video.tasks, scriptingV2_blueprint: newBlueprint } });
        } catch (error) {
            handlers.displayNotification(`Error proposing narrative: ${error.message}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const locationTags = [...new Set(video.footage_log?.map(item => item.location_tag) || [])];
    locationTags.unshift('Unassigned');
    const allDialogueAssigned = dialogueMap.every(item => item.locationTag && item.locationTag !== 'Unassigned');

    return (
        <div className="p-4 border border-gray-700 rounded-lg">
            <h2 className="text-xl font-bold text-white mb-3">Step 2: Verify Dialogue Mapping</h2>
            <p className="mb-4 text-gray-400">The AI has analyzed your transcript. Please review its work and assign each dialogue chunk to the correct location.</p>
            <div className="space-y-4">
                {dialogueMap.length > 0 ? dialogueMap.map((item, index) => (
                    <div key={index} className="p-3 border border-gray-700 rounded-md bg-gray-800/70 flex flex-col sm:flex-row sm:items-start">
                        <p className="flex-grow mb-2 sm:mb-0 sm:mr-4 text-gray-300">{item.dialogueChunk}</p>
                        <select
                            value={item.locationTag || 'Unassigned'}
                            onChange={(e) => handleLocationChange(index, e.target.value)}
                            className="p-2 border border-gray-600 rounded bg-gray-900 text-white w-full sm:w-auto"
                        >
                            {locationTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                        </select>
                    </div>
                )) : <p className="text-center text-gray-500">No dialogue to map. Please go back and provide a transcript.</p>}
            </div>
            <div className="mt-4 flex justify-end">
                <button
                    onClick={handleNext}
                    disabled={!allDialogueAssigned || isProcessing}
                    className="btn btn-primary disabled:opacity-50"
                >
                    {isProcessing ? '🤖 Proposing Narrative...' : 'Confirm Mapping & Propose Narrative'}
                </button>
            </div>
        </div>
    );
};
