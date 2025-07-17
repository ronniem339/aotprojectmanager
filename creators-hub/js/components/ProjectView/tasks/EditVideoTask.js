// js/components/ProjectView/tasks/EditVideoTask.js

window.EditVideoTask = ({ video, onUpdateTask, isLocked, settings, project, handlers }) => {
    console.log('EditVideoTask component is rendering');
    const { useState, useEffect } = React;

    // Debugging logs
    console.log('EditVideoTask: video.tasks?.videoEdited', video.tasks?.videoEdited);
    console.log('EditVideoTask: showLogChanges', showLogChanges);
    console.log('EditVideoTask: editingShotList.length', editingShotList.length);

    const [musicTrack, setMusicTrack] = useState('');
    const [changeLog, setChangeLog] = useState('');
    const [showLogChanges, setShowLogChanges] = useState(false);
    const [generatingScript, setGeneratingScript] = useState(false);
    const [updatedScript, setUpdatedScript] = useState(null); // To hold the AI-rewritten script
    const [error, setError] = useState('');
    const [editingShotList, setEditingShotList] = useState(video.tasks?.scriptingV2_blueprint?.editingShotList || []);
    const [isGeneratingShotList, setIsGeneratingShotList] = useState(false);

    // Sync local state with data from Firestore
    useEffect(() => {
        setMusicTrack(video.tasks?.musicTrack || '');
        setChangeLog(video.tasks?.feedbackText || '');
        setUpdatedScript(null); // Reset updated script when video changes
        setError('');
        setEditingShotList(video.tasks?.scriptingV2_blueprint?.editingShotList || []);
        // If the task is already in progress but logging isn't shown, reset the flag
        if (video.tasks?.videoEdited === 'in-progress') {
            setShowLogChanges(false);
        }
    }, [video.id, video.tasks]);

    const handleStartEditing = () => {
        onUpdateTask('videoEdited', 'in-progress');
    };
    
    const handleSaveMusic = () => {
        // This just saves the text, doesn't complete the task
        onUpdateTask('videoEdited', 'in-progress', { 'tasks.musicTrack': musicTrack });
    };

    const handleToggleSequenceComplete = async (index) => {
        const updatedList = [...editingShotList];
        updatedList[index].isComplete = !updatedList[index].isComplete;
        setEditingShotList(updatedList);

        const newBlueprint = {
            ...video.tasks?.scriptingV2_blueprint,
            editingShotList: updatedList
        };
        await handlers.updateVideo(video.id, { tasks: { ...video.tasks, scriptingV2_blueprint: newBlueprint } });
    };

    const handleGenerateShotList = async () => {
        setIsGeneratingShotList(true);
        setError('');
        const taskId = `scriptingV2-generate-shotlist-${video.id}-${Date.now()}`;
        try {
            const blueprint = video?.tasks?.scriptingV2_blueprint || {};
            const featuredLocationNames = video.locations_featured || [];
            const allProjectLocations = project.locations || [];
            const projectFootage = project.footageInventory || {};

            const featuredLocationObjects = allProjectLocations.filter(loc => featuredLocationNames.includes(loc.name));

            const videoSpecificFootageLog = [];
            featuredLocationObjects.forEach(loc => {
                const key = loc.place_id || loc.name;
                if (projectFootage[key]) {
                    videoSpecificFootageLog.push({ 
                        ...projectFootage[key],
                        location_tag: loc.name
                    });
                }
            });

            const shotList = await handlers.triggerAiTask({
                id: taskId,
                type: 'scriptingV2-generate-shotlist',
                name: 'Generating Editing Shot List',
                intensity: 'heavy',
                aiFunction: window.aiUtils.generateShotListForEditingAI,
                args: {
                    approvedNarrative: blueprint.approvedNarrative,
                    dialogueMap: blueprint.dialogueMap,
                    footage_log: videoSpecificFootageLog,
                    finalScript: blueprint.finalScript,
                    recordableVoiceover: blueprint.recordableVoiceover,
                    settings
                }
            });
            if (!shotList) throw new Error("AI did not return a shot list.");
            
            // Update the blueprint with the new shot list
            const newBlueprint = {
                ...blueprint,
                editingShotList: shotList
            };
            await handlers.updateVideo(video.id, { tasks: { ...video.tasks, scriptingV2_blueprint: newBlueprint } });
            setEditingShotList(shotList);
        } catch (err) {
            console.error("Error generating shot list:", err);
            setError(`Failed to generate shot list: ${err.message}`);
        } finally {
            setIsGeneratingShotList(false);
        }
    };

    const handleConfirmAndLog = () => {
        setShowLogChanges(true);
    };

    const handleGenerateUpdatedScript = async () => {
        if (!changeLog) return;
        setGeneratingScript(true);
        setError('');

        const prompt = `You are a script editor. A user has provided an original video script and a description of changes they made during the video editing process.
Your task is to rewrite the original script to reflect these changes.

Original Script:
---
${video.script}
---

Changes Described by User: "${changeLog}"

IMPORTANT: Please provide only the complete, rewritten, raw text script as your response. Do not include any extra commentary, titles, or explanations. The output should be only the spoken dialogue, without visual cues, ready to be used as the new official script.`;
        
        try {
            const payload = {
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "text/plain" }
            };
            const apiKey = settings.geminiApiKey;
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err?.error?.message || 'API Error');
            }
            const result = await response.json();
            setUpdatedScript(result.candidates[0].content.parts[0].text);
        } catch (err) {
            console.error("Error generating updated script:", err);
            setError(`Failed to update script: ${err.message}`);
        } finally {
            setGeneratingScript(false);
        }
    };
    
    const handleSaveUpdatedScriptAndComplete = () => {
        if (!updatedScript) return;
        onUpdateTask('videoEdited', 'complete', { 
            'script': updatedScript, // Overwrite the old script
            'tasks.feedbackText': changeLog // Save the log for reference
        });
    };

    const handleNoChanges = () => {
        onUpdateTask('videoEdited', 'complete', { 'tasks.feedbackText': 'No changes made from the original plan.' });
    };

    const status = video.tasks?.videoEdited || 'pending';

    // -- RENDER LOGIC --

    if (isLocked) {
        return <p className="text-gray-400 text-center py-2 text-sm">Please complete previous steps to begin editing.</p>;
    }

    if (status === 'complete') {
        return (
            <div>
                <p className="text-gray-400 text-center py-2 text-sm">This task is marked as complete.</p>
                <div className="mt-2 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                    <h4 className="font-semibold text-gray-300 mb-1">Selected Music:</h4>
                    <p className="text-gray-400 text-sm italic">{video.tasks?.musicTrack || 'Not specified.'}</p>
                    <h4 className="font-semibold text-gray-300 mt-3 mb-1">Change Log:</h4>
                    <p className="text-gray-400 text-sm whitespace-pre-wrap">{video.tasks?.feedbackText || 'No changes were logged.'}</p>
                </div>
            </div>
        );
    }
    
    if (status === 'pending') {
        return (
            <button onClick={handleStartEditing} className="w-full px-5 py-2.5 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold">
                Start Editing
            </button>
        );
    }
    
    if (status === 'in-progress' && !showLogChanges) {
        return (
            <div className="space-y-4">
                {/* Shot List Section */}
                <div className="p-4 border border-gray-700 rounded-lg">
                    <h3 className="text-lg font-bold text-white mb-3">Editing Shot List</h3>
                    {editingShotList.length === 0 ? (
                        <div className="text-center">
                            <p className="text-gray-400 mb-4">Generate a detailed shot list to guide your video editing process.</p>
                            <button
                                onClick={handleGenerateShotList}
                                disabled={isGeneratingShotList}
                                className="btn btn-primary disabled:opacity-50"
                            >
                                {isGeneratingShotList ? '🤖 Generating Shot List...' : 'Generate Shot List'}
                            </button>
                            {error && <p className="text-red-400 mt-2 text-sm">{error}</p>}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {editingShotList.map((sequence, index) => (
                                <window.Accordion
                                    key={index}
                                    title={`Sequence: ${sequence.name} (${sequence.type})`}
                                    defaultOpen={true}
                                    onToggle={() => { /* No-op, controlled by checkbox */ }}
                                    status={sequence.isComplete ? 'complete' : 'pending'}
                                    isLocked={false}
                                >
                                    <div className="p-3 bg-gray-800/70 rounded-b-lg border border-gray-700 border-t-0">
                                        {sequence.voiceover_script && (
                                            <div className="mb-2">
                                                <h4 className="font-semibold text-gray-300">Voiceover Script:</h4>
                                                <p className="text-gray-400 whitespace-pre-wrap text-sm">{sequence.voiceover_script}</p>
                                            </div>
                                        )}

                                        {sequence.on_camera_dialogue && (
                                            <div className="mb-2">
                                                <h4 className="font-semibold text-gray-300">On-Camera Dialogue:</h4>
                                                <p className="text-gray-400 whitespace-pre-wrap text-sm">{sequence.on_camera_dialogue}</p>
                                            </div>
                                        )}

                                        {sequence.locations && sequence.locations.length > 0 && (
                                            <div>
                                                <h4 className="font-semibold text-gray-300">Locations & Footage:</h4>
                                                <ul className="list-disc list-inside pl-4 text-sm">
                                                    {sequence.locations.map((loc, locIndex) => (
                                                        <li key={locIndex} className="text-gray-400">
                                                            {loc.name} ({loc.footage_types.join(', ')})
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        <div className="mt-4 flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={sequence.isComplete || false}
                                                onChange={() => handleToggleSequenceComplete(index)}
                                                className="h-5 w-5 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent"
                                            />
                                            <label className="ml-2 text-gray-300 text-sm">Mark Sequence as Complete</label>
                                        </div>
                                    </div>
                                </window.Accordion>
                            ))}
                        </div>
                    )}
                </div>

                {/* Music Track Section */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Background Music (Placeholder)</label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={musicTrack}
                            onChange={(e) => setMusicTrack(e.target.value)}
                            className="w-full form-input" 
                            placeholder="e.g., Suno AI - 'Cinematic Travel Vlog'"
                        />
                        <button onClick={handleSaveMusic} className="px-4 text-sm bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold">Save</button>
                    </div>
                     <p className="text-xs text-gray-500 mt-1">Note the name or link of your chosen audio track here.</p>
                </div>
                <div className="pt-4 border-t border-gray-700 text-center">
                    <button onClick={handleConfirmAndLog} className="w-full max-w-sm mx-auto px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold">
                        Confirm Edit is Complete & Log Changes
                    </button>
                </div>
            </div>
        );
    }

    if (status === 'in-progress' && showLogChanges) {
        return (
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-amber-400">Log any changes from the original plan</h3>
                <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                     <h4 className="font-semibold text-gray-300 mb-1">Original Script:</h4>
                     <textarea readOnly value={video.script} rows="8" className="w-full form-textarea bg-gray-800/80 cursor-not-allowed" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Describe Changes Made During Editing</label>
                    <textarea 
                        value={changeLog}
                        onChange={(e) => setChangeLog(e.target.value)}
                        rows="4" 
                        className="w-full form-textarea" 
                        placeholder="e.g., 'Removed the intro section and started directly with the hook. Combined the two final locations into one segment.'"
                    />
                </div>

                {/* --- AI Script Update UI --- */}
                {updatedScript ? (
                    <div className="p-4 bg-green-900/20 rounded-lg border border-green-500">
                        <h4 className="font-semibold text-green-400 mb-2">Proposed Updated Script:</h4>
                        <textarea readOnly value={updatedScript} rows="8" className="w-full form-textarea bg-gray-800/80" />
                        <div className="mt-4 text-right">
                            <button onClick={handleSaveUpdatedScriptAndComplete} className="px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold">
                                Save Updated Script & Complete Task
                            </button>
                        </div>
                    </div>
                ) : (
                     <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-700">
                        <button onClick={handleNoChanges} className="w-full px-5 py-2.5 bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold">
                            No Changes Were Made
                        </button>
                        <button onClick={handleGenerateUpdatedScript} disabled={!changeLog || generatingScript} className="w-full px-5 py-2.5 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            {generatingScript ? <window.LoadingSpinner isButton={true} /> : '🤖 Generate Updated Script'}
                        </button>
                    </div>
                )}
                 {error && <p className="text-red-400 mt-2 text-sm">{error}</p>}
            </div>
        );
    }

    return null; // Fallback
};
