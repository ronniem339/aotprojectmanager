// WRITE to file: ./creators-hub/js/components/ProjectView/tasks/ScriptingV2/Step2_DialogueMapper.js

const { useState, useEffect, useRef } = React;

window.Step2_DialogueMapper = () => {
    // --- ANTI-PROP-DRILLING PATTERN ---
    const { video, settings, handlers } = window.useAppState();
    const blueprint = video?.tasks?.scriptingV2_blueprint || {};
    // ------------------------------------

    const [dialogueMap, setDialogueMap] = useState(blueprint.dialogueMap || []);
    const [isProcessing, setIsProcessing] = useState(false);

    // Effect to sync local state if the global blueprint changes
    useEffect(() => {
        setDialogueMap(blueprint.dialogueMap || []);
    }, [blueprint.dialogueMap]);

    // Debounced Autosave Logic for the dialogue map state
    const autosaveTimeout = useRef(null);
    useEffect(() => {
        if (autosaveTimeout.current) clearTimeout(autosaveTimeout.current);
        autosaveTimeout.current = setTimeout(() => {
            if (!isProcessing && JSON.stringify(dialogueMap) !== JSON.stringify(blueprint.dialogueMap || [])) {
                console.log('Autosaving dialogue map...');
                const newBlueprint = { ...blueprint, dialogueMap: dialogueMap };
                handlers.updateVideo(video.id, { tasks: { ...video.tasks, scriptingV2_blueprint: newBlueprint } }, true);
            }
        }, 2000); // A longer debounce for more complex data
        return () => clearTimeout(autosaveTimeout.current);
    }, [dialogueMap, isProcessing, blueprint.dialogueMap]);

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
                intensity: 'heavy', // This is a significant creative task
                aiFunction: window.aiUtils.proposeNarrativeAI,
                args: { 
                    dialogueMap, // Pass the user-verified map
                    footage_log: video.footage_log, 
                    settings 
                }
            });

            if (!narrativeProposal) throw new Error("AI did not return a valid narrative proposal.");

            const newBlueprint = {
                ...blueprint,
                dialogueMap,
                narrativeProposals: [narrativeProposal], // Initialize the proposal history
                workflowStatus: 'narrative_refinement'
            };
            handlers.updateVideo(video.id, { tasks: { ...video.tasks, scriptingV2_blueprint: newBlueprint } });

        } catch (error) {
            handlers.displayNotification(`Error proposing narrative: ${error.message}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    // Prepare dropdown options from the footage log
    const locationTags = [...new Set(video.footage_log?.map(item => item.location_tag) || [])];
    locationTags.unshift('Unassigned');
    
    const allDialogueAssigned = dialogueMap.every(item => item.locationTag && item.locationTag !== 'Unassigned');

    const dialogueRows = dialogueMap.map((item, index) => {
        const selectOptions = locationTags.map(tag => React.createElement('option', { key: tag, value: tag }, tag));
        
        return React.createElement('div', { key: index, className: 'p-3 border border-gray-700 rounded-md bg-gray-800/70 flex flex-col sm:flex-row sm:items-start' },
            React.createElement('p', { className: 'flex-grow mb-2 sm:mb-0 sm:mr-4 text-gray-300' }, item.dialogueChunk),
            React.createElement('select', {
                value: item.locationTag || 'Unassigned',
                onChange: (e) => handleLocationChange(index, e.target.value),
                className: 'p-2 border border-gray-600 rounded bg-gray-900 text-white w-full sm:w-auto'
            }, ...selectOptions)
        );
    });

    return React.createElement('div', { className: 'p-4 border border-gray-700 rounded-lg' },
        React.createElement('h2', { className: 'text-xl font-bold text-white mb-3' }, "Step 2: Verify Dialogue Mapping"),
        React.createElement('p', { className: 'mb-4 text-gray-400' }, "The AI has analyzed your transcript. Please review its work and assign each dialogue chunk to the correct location. This ensures the story is built on an accurate foundation."),
        React.createElement('div', { className: 'space-y-4' }, dialogueMap.length > 0 ? dialogueRows : React.createElement('p', {className: 'text-center text-gray-500'}, 'No dialogue to map. Please go back and provide a transcript.')),
        React.createElement('div', { className: 'mt-4 flex justify-end' },
            React.createElement('button', {
                onClick: handleNext,
                disabled: !allDialogueAssigned || isProcessing,
                className: 'btn btn-primary disabled:opacity-50'
            }, isProcessing ? '🤖 Proposing Narrative...' : 'Confirm Mapping & Propose Narrative')
        )
    );
};
