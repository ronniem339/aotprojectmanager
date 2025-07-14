// WRITE to file: ./creators-hub/js/components/ProjectView/tasks/ScriptingV2/Step4_ResearchApproval.js

const { useState: useState4, useEffect: useEffect4, useRef: useRef4 } = React; // Use aliases to avoid redeclaration errors

window.Step4_ResearchApproval = () => {
    // --- ANTI-PROP-DRILLING PATTERN ---
    const { video, settings, handlers } = window.useAppState();
    const blueprint = video?.tasks?.scriptingV2_blueprint || {};
    // ------------------------------------

    const [researchNotes, setResearchNotes] = useState(blueprint.researchNotes || {});
    const [isProcessing, setIsProcessing] = useState(false);

    // Effect to sync local state if the global blueprint changes
    useEffect(() => {
        setResearchNotes(blueprint.researchNotes || {});
    }, [blueprint.researchNotes]);

    // Debounced Autosave Logic
    const autosaveTimeout = useRef(null);
    useEffect(() => {
        if (autosaveTimeout.current) clearTimeout(autosaveTimeout.current);
        autosaveTimeout.current = setTimeout(() => {
            if (!isProcessing && JSON.stringify(researchNotes) !== JSON.stringify(blueprint.researchNotes || {})) {
                console.log('Autosaving research selections...');
                const newBlueprint = { ...blueprint, researchNotes: researchNotes };
                handlers.updateVideo(video.id, { tasks: { ...video.tasks, scriptingV2_blueprint: newBlueprint } }, true);
            }
        }, 2000);
        return () => clearTimeout(autosaveTimeout.current);
    }, [researchNotes, isProcessing, blueprint.researchNotes]);

    const handleToggleApproval = (locationTag, noteIndex) => {
        const newResearch = JSON.parse(JSON.stringify(researchNotes)); // Deep copy
        newResearch[locationTag][noteIndex].approved = !newResearch[locationTag][noteIndex].approved;
        setResearchNotes(newResearch);
    };

    const handleNext = async () => {
        setIsProcessing(true);
        const taskId = `scriptingV2-draft-voiceover-${video.id}-${Date.now()}`;

        // Filter for only the approved notes to send to the AI
        const approvedNotes = {};
        Object.keys(researchNotes).forEach(locationTag => {
            const approvedItems = researchNotes[locationTag].filter(note => note.approved);
            if (approvedItems.length > 0) {
                approvedNotes[locationTag] = approvedItems;
            }
        });

        try {
            const draftScriptResult = await handlers.triggerAiTask({
                id: taskId,
                type: 'scriptingV2-draft-voiceover',
                name: 'Drafting Voiceover Script',
                intensity: 'heavy', // This is a primary creative writing task
                aiFunction: window.aiUtils.draftVoiceoverAI,
                args: {
                    approvedNarrative: blueprint.approvedNarrative,
                    approvedResearch: approvedNotes,
                    dialogueMap: blueprint.dialogueMap,
                    settings
                }
            });

            if (!draftScriptResult) throw new Error("AI did not return a draft script.");

            const newBlueprint = {
                ...blueprint,
                researchNotes, // Save the user's final selections
                draftScript: draftScriptResult,
                workflowStatus: 'draft_review' // Move to the final review step
            };
            handlers.updateVideo(video.id, { tasks: { ...video.tasks, scriptingV2_blueprint: newBlueprint } });

        } catch (error) {
            handlers.displayNotification(`Error drafting voiceover: ${error.message}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    };
    
    const renderResearchList = () => {
        const locationKeys = Object.keys(researchNotes);
        if (locationKeys.length === 0) {
            return React.createElement('p', { className: 'text-gray-400 text-center p-4' }, 'No research notes found. Please go back a step.');
        }

        return locationKeys.map(locationTag => {
            const notesForLocation = researchNotes[locationTag].map((note, index) => {
                return React.createElement('div', { key: index, className: 'flex items-start space-x-3' },
                    React.createElement('input', {
                        type: 'checkbox',
                        checked: note.approved,
                        onChange: () => handleToggleApproval(locationTag, index),
                        className: 'h-5 w-5 rounded mt-1 bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent'
                    }),
                    React.createElement('p', { className: `flex-1 text-gray-300 ${!note.approved ? 'line-through text-gray-500' : ''}`}, note.fact || note.story)
                );
            });

            return React.createElement('div', { key: locationTag, className: 'mb-4' },
                React.createElement('h3', { className: 'font-bold text-lg text-primary-accent mb-2 border-b border-gray-700 pb-1' }, `Location: ${locationTag}`),
                React.createElement('div', { className: 'space-y-2 pl-2' }, ...notesForLocation)
            );
        });
    };

    return React.createElement('div', { className: 'p-4 border border-gray-700 rounded-lg' },
        React.createElement('h2', { className: 'text-xl font-bold text-white mb-3' }, "Step 4: Approve Research"),
        React.createElement('p', { className: 'mb-4 text-gray-400' }, "Review the AI's research findings. Uncheck any facts or stories you don't want to include in the voiceover."),
        
        React.createElement('div', null, renderResearchList()),

        React.createElement('div', { className: 'mt-4 flex justify-end' },
            React.createElement('button', {
                onClick: handleNext,
                disabled: isProcessing,
                className: 'btn btn-primary disabled:opacity-50'
            }, isProcessing ? '🤖 Writing Voiceover...' : '✅ Approve Research & Draft Script')
        )
    );
};
