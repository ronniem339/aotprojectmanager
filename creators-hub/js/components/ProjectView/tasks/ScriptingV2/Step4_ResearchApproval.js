const { useState: useState4, useEffect: useEffect4, useRef: useRef4 } = React;

window.Step4_ResearchApproval = ({ video, settings, handlers }) => {
    const blueprint = video?.tasks?.scriptingV2_blueprint || {};
    const [researchNotes, setResearchNotes] = useState4(blueprint.researchNotes || {});
    const [isProcessing, setIsProcessing] = useState4(false);

    useEffect4(() => {
        setResearchNotes(blueprint.researchNotes || {});
    }, [blueprint.researchNotes]);

    const autosaveTimeout = useRef4(null);
    useEffect4(() => {
        if (autosaveTimeout.current) clearTimeout(autosaveTimeout.current);
        autosaveTimeout.current = setTimeout(() => {
            if (!isProcessing && JSON.stringify(researchNotes) !== JSON.stringify(blueprint.researchNotes || {})) {
                const newBlueprint = { ...blueprint, researchNotes: researchNotes };
                handlers.updateVideo(video.id, { tasks: { ...video.tasks, scriptingV2_blueprint: newBlueprint } }, true);
            }
        }, 2000);
        return () => clearTimeout(autosaveTimeout.current);
    }, [researchNotes, isProcessing, blueprint.researchNotes, video.id, handlers]);

    const handleToggleApproval = (locationTag, noteIndex) => {
        const newResearch = JSON.parse(JSON.stringify(researchNotes));
        newResearch[locationTag][noteIndex].approved = !newResearch[locationTag][noteIndex].approved;
        setResearchNotes(newResearch);
    };

    const handleNext = async () => {
        setIsProcessing(true);
        const taskId = `scriptingV2-draft-voiceover-${video.id}-${Date.now()}`;
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
                intensity: 'heavy',
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
                researchNotes,
                draftScript: draftScriptResult,
                workflowStatus: 'draft_review'
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
            return <p className="text-gray-400 text-center p-4">No research notes found. Please go back a step.</p>;
        }
        return locationKeys.map(locationTag => (
            <div key={locationTag} className="mb-4">
                <h3 className="font-bold text-lg text-primary-accent mb-2 border-b border-gray-700 pb-1">{locationTag}</h3>
                <div className="space-y-2 pl-2">
                    {researchNotes[locationTag].map((note, index) => (
                        <div key={index} className="flex items-start space-x-3">
                            <input
                                type="checkbox"
                                checked={note.approved}
                                onChange={() => handleToggleApproval(locationTag, index)}
                                className="h-5 w-5 rounded mt-1 bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent"
                            />
                            <p className={`flex-1 text-gray-300 ${!note.approved ? 'line-through text-gray-500' : ''}`}>{note.fact || note.story}</p>
                        </div>
                    ))}
                </div>
            </div>
        ));
    };

    return (
        <div className="p-4 border border-gray-700 rounded-lg">
            <h2 className="text-xl font-bold text-white mb-3">Step 4: Approve Research</h2>
            <p className="mb-4 text-gray-400">Review the AI's research findings. Uncheck any facts or stories you don't want to include in the voiceover.</p>
            <div>{renderResearchList()}</div>
            <div className="mt-4 flex justify-end">
                <button onClick={handleNext} disabled={isProcessing} className="btn btn-primary disabled:opacity-50">
                    {isProcessing ? '🤖 Writing Voiceover...' : '✅ Approve Research & Draft Script'}
                </button>
            </div>
        </div>
    );
};
