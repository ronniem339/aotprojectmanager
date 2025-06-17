// js/components/ProjectView/tasks/ScriptingTask.js

const { useState, useEffect, useRef } = React;

/**
 * Custom hook for debouncing a value.
 * Useful for delaying updates, e.g., for auto-saving.
 * @param {*} value - The value to debounce.
 * @param {number} delay - The delay in milliseconds.
 * @returns {*} The debounced value.
 */
window.useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};


/**
 * A full-screen modal for the entire multi-step scripting process.
 * This component contains the UI for each stage of the new workflow.
 */
const ScriptingWorkspaceModal = ({
    video,
    taskData,
    onClose,
    onSave, // For final completion
    onUpdate, // For intermediate saves
    onGenerateDraftOutline,
    onGenerateRefinementPlan,
    onGenerateFullScript,
    onRefineScript, // New function for script refinement
    settings
}) => {
    const [localTaskData, setLocalTaskData] = useState(taskData);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [refinementInstructions, setRefinementInstructions] = useState(''); // State for refinement input

    // Debounce localTaskData for auto-saving
    const debouncedTaskData = window.useDebounce(localTaskData, 1500); // Save every 1.5 seconds of inactivity

    // Effect to trigger auto-save when debouncedTaskData changes
    useEffect(() => {
        // Only save if the data has actually changed from the initial load
        // and if it's not the very first render or an immediate update from parent
        if (debouncedTaskData && JSON.stringify(debouncedTaskData) !== JSON.stringify(taskData)) {
            // Check if the current stage is one that should be auto-saved
            if (['initial_thoughts', 'draft_outline_review', 'refinement_qa', 'full_script_review'].includes(debouncedTaskData.scriptingStage)) {
                onUpdate(debouncedTaskData);
                console.log("Auto-saving scripting task progress...");
            }
        }
    }, [debouncedTaskData]); // Depend on the debounced value

    useEffect(() => {
        // Update local state if parent taskData changes (e.g., after an AI generation)
        setLocalTaskData(taskData);
    }, [taskData]);

    const handleInitialThoughtsChange = (value) => {
        setLocalTaskData(prev => ({ ...prev, initialThoughts: value }));
    };

    const handleExperienceChange = (locationName, value) => {
        const newExperiences = { ...(localTaskData.userExperiences || {}), [locationName]: value };
        setLocalTaskData(prev => ({ ...prev, userExperiences: newExperiences }));
    };

    const handleScriptChange = (e) => {
        setLocalTaskData(prev => ({ ...prev, script: e.target.value }));
    };

    const handleRefinementInstructionsChange = (e) => {
        setRefinementInstructions(e.target.value);
    };

    const handleAction = async (action, ...args) => {
        setIsLoading(true);
        setError('');
        try {
            await action(...args);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSaveAndClose = () => {
        // Save final data and close
        onSave(localTaskData.script, localTaskData);
    };

    const handleRefineScriptClick = async () => {
        await handleAction(onRefineScript, localTaskData.script, refinementInstructions, settings);
        setRefinementInstructions(''); // Clear instructions after refining
    };

    const renderContent = () => {
        const stage = localTaskData.scriptingStage || 'pending';

        switch (stage) {
            case 'pending': // Fallback for initial state
            case 'initial_thoughts': // New first step
                return (
                    <div>
                        <h3 className="text-xl font-semibold text-primary-accent mb-3">Your Raw Experience & Ideas</h3>
                        <p className="text-gray-400 mb-6">This is your creative space. Paste or write down everything you can remember or want to include—key moments, specific shots, feelings, funny anecdotes, important facts. The more you add, the better the AI's first draft will be.</p>
                        <textarea
                            value={localTaskData.initialThoughts || ''}
                            onChange={(e) => handleInitialThoughtsChange(e.target.value)}
                            rows="15"
                            className="w-full form-textarea"
                            placeholder="Paste your script notes, brain dump, or describe your experience here..."
                        />
                         <div className="text-center mt-8">
                            <button onClick={() => handleAction(onGenerateDraftOutline, localTaskData.initialThoughts)} disabled={isLoading || !(localTaskData.initialThoughts || '').trim()} className="px-6 py-3 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold text-lg disabled:opacity-50">
                                {isLoading ? <window.LoadingSpinner isButton={true} /> : 'Generate Draft Outline'}
                            </button>
                        </div>
                    </div>
                );

            case 'draft_outline_review':
                 return (
                    <div>
                        <h3 className="text-xl font-semibold text-primary-accent mb-3">Draft Outline Review</h3>
                        <p className="text-gray-400 mb-4">Here is a draft outline based on your notes. Review it, then we'll generate specific questions to flesh it out.</p>
                        <textarea
                            value={localTaskData.scriptPlan}
                            onChange={e => setLocalTaskData(prev => ({...prev, scriptPlan: e.target.value}))}
                            rows="15"
                            className="w-full form-textarea whitespace-pre-wrap leading-relaxed"
                        />
                        <div className="text-center mt-8">
                            <button onClick={() => handleAction(onGenerateRefinementPlan)} disabled={isLoading} className="px-6 py-3 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold text-lg">
                                {isLoading ? <window.LoadingSpinner isButton={true} /> : 'Looks Good, Ask Me More'}
                            </button>
                        </div>
                    </div>
                );

            case 'refinement_qa':
                return (
                    <div>
                        <h3 className="text-xl font-semibold text-primary-accent mb-3">Refinement Details</h3>
                        <p className="text-gray-400 mb-6">Now, let's get specific. Answer these questions based on the outline to provide the AI with details for the full script.</p>
                        <div className="space-y-6">
                            {(localTaskData.locationQuestions || []).map((item, index) => (
                                <div key={index} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                                    <label className="block text-gray-200 text-md font-medium mb-2">
                                        {item.locationName && <span className="font-semibold text-primary-accent mr-1">{item.locationName}:</span>}
                                        {item.question}
                                    </label>
                                    <textarea
                                        value={(localTaskData.userExperiences || {})[item.locationName || `general_${index}`] || ''}
                                        onChange={(e) => handleExperienceChange(item.locationName || `general_${index}`, e.target.value)}
                                        placeholder="Be specific about what you did, saw, or captured... (e.g., 'At the market, I filmed a lady making fresh pasta and bought some local cheese.')"
                                        rows="4"
                                        className="w-full form-textarea bg-gray-900 border-gray-600 focus:ring-primary-accent focus:border-primary-accent"
                                    ></textarea>
                                </div>
                            ))}
                        </div>
                        <div className="text-center mt-8">
                             <button onClick={() => handleAction(onGenerateFullScript)} disabled={isLoading} className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold text-lg">
                                {isLoading ? <window.LoadingSpinner isButton={true} /> : 'Generate Full Script'}
                            </button>
                        </div>
                    </div>
                );

            case 'full_script_review':
                 return (
                    <div>
                        <h3 className="text-xl font-semibold text-primary-accent mb-3">Final Script Review</h3>
                        <p className="text-gray-400 mb-4">Here is the complete script. You can edit it directly, or provide instructions below to have the AI refine it further.</p>
                        <textarea
                            value={localTaskData.script}
                            onChange={handleScriptChange}
                            rows="20"
                            className="w-full form-textarea leading-relaxed mb-4"
                            placeholder="Your final script will appear here."
                        />
                        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 mb-6">
                            <label className="block text-gray-200 text-md font-medium mb-2">
                                Refinement Instructions (Optional):
                            </label>
                            <textarea
                                value={refinementInstructions}
                                onChange={handleRefinementInstructionsChange}
                                placeholder="e.g., 'Make the intro more energetic', 'Shorten the segment about the museum', 'Add a call to action at the end.'"
                                rows="3"
                                className="w-full form-textarea bg-gray-900 border-gray-600 focus:ring-primary-accent focus:border-primary-accent"
                            ></textarea>
                            <div className="text-center mt-4">
                                <button onClick={handleRefineScriptClick} disabled={isLoading || !refinementInstructions.trim()} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-lg disabled:opacity-50">
                                    {isLoading ? <window.LoadingSpinner isButton={true} /> : 'Refine Script with AI'}
                                </button>
                            </div>
                        </div>
                         <div className="text-center mt-8">
                             <button onClick={handleSaveAndClose} className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold text-lg">
                                Save and Complete Task
                            </button>
                        </div>
                    </div>
                );

            default:
                return <p>Invalid scripting stage.</p>;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4 sm:p-8">
            <div className="glass-card rounded-lg p-8 w-full h-[90vh] flex flex-col relative">
                {/* When closing, ensure to save the current local task data */}
                <button onClick={() => onUpdate(localTaskData)} className="absolute top-4 right-6 text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                <h2 className="text-3xl font-bold text-white mb-6 text-center">Scripting Workspace: <span className="text-primary-accent">{video.title}</span></h2>
                
                <div className="flex-grow overflow-y-auto pr-4 custom-scrollbar">
                    {error && <p className="text-red-400 mb-4 bg-red-900/50 p-3 rounded-lg">{error}</p>}
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};


window.ScriptingTask = ({ video, settings, onUpdateTask, isLocked, project, userId, db }) => {
    const [showWorkspace, setShowWorkspace] = useState(false);
    
    // Initialize taskData from video prop, ensuring all necessary fields are present
    const taskData = {
        scriptingStage: video.tasks?.scriptingStage || 'pending',
        initialThoughts: video.tasks?.initialThoughts || '',
        scriptPlan: video.tasks?.scriptPlan || '',
        locationQuestions: video.tasks?.locationQuestions || [],
        userExperiences: video.tasks?.userExperiences || {},
        script: video.script || '' // Use video.script as the source for the current script
    };

    const handleOpenWorkspace = () => {
        // When opening, if the task is pending, immediately move to the first step.
        if (taskData.scriptingStage === 'pending') {
            onUpdateTask('scripting', 'in-progress', { 
                'tasks.scriptingStage': 'initial_thoughts'
            });
        }
        setShowWorkspace(true);
    };

    const handleGenerateDraftOutline = async (thoughtsText) => {
        // First, save the user's thoughts to Firestore (this will be debounced by the modal's internal state now)
        // onUpdateTask('scripting', 'in-progress', { 'tasks.initialThoughts': thoughtsText }); // Removed, as useDebounce in modal handles it

        // Then, call the AI
        const { draftOutline } = await window.aiUtils.generateDraftOutlineAI({
            videoTitle: video.chosenTitle || video.title,
            videoConcept: video.concept,
            initialThoughts: thoughtsText,
            apiKey: settings.geminiApiKey
        });
        
        // Finally, update the state with the new outline and move to the next stage
        await onUpdateTask('scripting', 'in-progress', {
            'tasks.scriptingStage': 'draft_outline_review',
            'tasks.scriptPlan': draftOutline
        });
    };

    const handleGenerateRefinementPlan = async () => {
        const projectDocRef = db.collection(`artifacts/${window.CREATOR_HUB_CONFIG.APP_ID}/users/${userId}/projects`).doc(project.id);
        const projectSnap = await projectDocRef.get();
        const projectData = projectSnap.data();

        const planData = await window.aiUtils.generateScriptPlanAI({
            videoTitle: video.chosenTitle || video.title,
            videoConcept: taskData.scriptPlan, // Use the current scriptPlan for refinement
            videoLocationsFeatured: video.locations_featured || [],
            projectFootageInventory: projectData.footageInventory || {},
            whoAmI: settings.knowledgeBases?.youtube?.whoAmI,
            styleGuideText: settings.styleGuideText,
            apiKey: settings.geminiApiKey
        });
        
        await onUpdateTask('scripting', 'in-progress', {
            'tasks.scriptingStage': 'refinement_qa',
            'tasks.scriptPlan': planData.scriptPlan, // Update with refined plan from AI
            'tasks.locationQuestions': planData.locationQuestions,
            'tasks.userExperiences': {} // Reset user experiences for new questions
        });
    };
    
    const handleGenerateFullScript = async () => {
        const fullScript = await window.aiUtils.generateFullScriptAI({
            scriptPlan: taskData.scriptPlan,
            generalFeedback: '', // No direct general feedback field in UI, can be extended if needed
            locationExperiences: taskData.userExperiences,
            videoTitle: video.chosenTitle || video.title,
            whoAmI: settings.knowledgeBases?.youtube?.whoAmI,
            styleGuideText: settings.styleGuideText,
            apiKey: settings.geminiApiKey
        });
        await onUpdateTask('scripting', 'in-progress', {
            'tasks.scriptingStage': 'full_script_review',
            'script': fullScript // Update the main video script field
        });
    };

    const handleRefineScript = async (currentScript, refinementInstructions) => {
        const refinedScript = await window.aiUtils.refineScriptAI({
            currentScript: currentScript,
            refinementInstructions: refinementInstructions,
            whoAmI: settings.knowledgeBases?.youtube?.whoAmI,
            styleGuideText: settings.styleGuideText,
            apiKey: settings.geminiApiKey
        });

        // Update the script in the task data and re-save
        await onUpdateTask('scripting', 'in-progress', {
            'script': refinedScript
        });
    };


    const handleUpdateAndCloseWorkspace = (updatedTaskData) => {
        // This function is called by the modal to update data back to the parent and close.
        // It's effectively the "auto-save" trigger from the modal.
        onUpdateTask('scripting', 'in-progress', {
            'tasks.scriptingStage': updatedTaskData.scriptingStage,
            'tasks.initialThoughts': updatedTaskData.initialThoughts,
            'tasks.scriptPlan': updatedTaskData.scriptPlan,
            'tasks.locationQuestions': updatedTaskData.locationQuestions,
            'tasks.userExperiences': updatedTaskData.userExperiences,
            'script': updatedTaskData.script, // Ensure script changes are also saved
        });
        setShowWorkspace(false);
    };

    const handleSaveAndComplete = (finalScript, finalTaskData) => {
        // This function is for the final completion of the task.
        onUpdateTask('scripting', 'complete', {
             'tasks.scriptingStage': 'complete',
             'tasks.initialThoughts': finalTaskData.initialThoughts,
             'tasks.scriptPlan': finalTaskData.scriptPlan,
             'tasks.locationQuestions': finalTaskData.locationQuestions,
             'tasks.userExperiences': finalTaskData.userExperiences,
             'script': finalScript, // Ensure the final script is saved under video.script
        });
        setShowWorkspace(false);
    };

    // The content inside the accordion
    const renderAccordionContent = () => {
        if (isLocked) {
            return <p className="text-gray-400 text-center py-2 text-sm">Please complete previous steps to begin scripting.</p>;
        }

        if (video.tasks?.scripting === 'complete') {
            return (
                <div className="text-center">
                    <p className="text-gray-400 py-2 text-sm">Scripting is complete.</p>
                    <button onClick={handleOpenWorkspace} className="mt-2 px-4 py-2 text-sm bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold">
                        View/Edit Script
                    </button>
                </div>
            );
        }
        
        return (
            <div className="text-center py-4">
                <button onClick={handleOpenWorkspace} className="w-full max-w-xs mx-auto px-5 py-2.5 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold">
                    Open Scripting Workspace
                </button>
            </div>
        );
    };

    return (
        <div>
            {renderAccordionContent()}
            {showWorkspace && ReactDOM.createPortal(
                <ScriptingWorkspaceModal
                    video={video}
                    taskData={taskData}
                    onClose={() => setShowWorkspace(false)} // This simple close doesn't save
                    onUpdate={handleUpdateAndCloseWorkspace} // This handles auto-saving and closing
                    onSave={handleSaveAndComplete}
                    onGenerateDraftOutline={handleGenerateDraftOutline}
                    onGenerateRefinementPlan={handleGenerateRefinementPlan}
                    onGenerateFullScript={handleGenerateFullScript}
                    onRefineScript={handleRefineScript} // Pass the new refine function
                    settings={settings} // Pass settings for API key
                />,
                document.body
            )}
        </div>
    );
};

