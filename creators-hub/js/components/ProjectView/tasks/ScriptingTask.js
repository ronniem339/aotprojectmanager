// js/components/ProjectView/tasks/ScriptingTask.js

const { useState, useEffect } = React;

/**
 * A full-screen modal for the entire multi-step scripting process.
 * This component contains the UI for each stage of the new workflow.
 */
const ScriptingWorkspaceModal = ({
    video,
    taskData,
    onClose, // This function syncs state and closes the modal
    onSave, // This function saves the final script and completes the task
    // AI action handlers passed as props
    onGenerateDraftOutline,
    onRefineOutline,
    onGenerateRefinementPlan,
    onGenerateFullScript,
    onRefineScript,
}) => {
    const [localTaskData, setLocalTaskData] = useState(taskData);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // This effect keeps the modal's local state in sync with the parent's data.
        // This is crucial for seeing updates after an AI action completes.
        setLocalTaskData(taskData);
    }, [taskData]);
    
    // Generic handler to update any field in the local task data state
    const handleDataChange = (field, value) => {
        setLocalTaskData(prev => ({ ...prev, [field]: value }));
    };

    // Wrapper to handle loading states and errors for any AI action
    const handleAction = async (action, ...args) => {
        setIsLoading(true);
        setError('');
        try {
            await action(...args);
        } catch (err) {
            setError(err.message);
            console.error("Error during AI action:", err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleClose = () => {
        onClose(localTaskData);
    };

    const handleSaveAndComplete = () => {
        onSave(localTaskData);
    };

    const renderContent = () => {
        // The stage is now always read from the synchronized localTaskData
        const stage = localTaskData.scriptingStage || 'initial_thoughts';

        switch (stage) {
            case 'initial_thoughts':
                return (
                    <div>
                        <h3 className="text-xl font-semibold text-primary-accent mb-3">Step 1: Brain Dump</h3>
                        <p className="text-gray-400 mb-6">Let's start with your raw ideas. Don't worry about structure. Just jot down everything you're thinking for this video: key points, locations, things to say, emotions to convey, etc.</p>
                        <textarea
                            value={localTaskData.initialThoughts || ''}
                            onChange={(e) => handleDataChange('initialThoughts', e.target.value)}
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
                        <h3 className="text-xl font-semibold text-primary-accent mb-3">Step 2: Review AI-Generated Outline</h3>
                        <p className="text-gray-400 mb-4">Here's a potential structure based on your notes. Review it, edit it directly, or use the refinement box below to ask the AI for changes.</p>
                        <textarea
                            value={localTaskData.scriptPlan || ''}
                            onChange={e => handleDataChange('scriptPlan', e.target.value)}
                            rows="15"
                            className="w-full form-textarea whitespace-pre-wrap leading-relaxed"
                        />

                        {/* REFINEMENT UI BLOCK */}
                        <div className="mt-6">
                            <h4 className="text-md font-semibold text-amber-400 mb-2">Refinement Instructions</h4>
                            <p className="text-gray-400 text-sm mb-2">Tell the AI what to change. E.g., "Make the intro shorter and more mysterious," or "Add a section about the local food."</p>
                            <textarea
                                value={localTaskData.outlineRefinementText || ''}
                                onChange={(e) => handleDataChange('outlineRefinementText', e.target.value)}
                                className="form-textarea w-full" 
                                rows="2" 
                                placeholder="Your refinement instructions..."
                            />
                            <button 
                                onClick={() => handleAction(onRefineOutline, localTaskData.scriptPlan, localTaskData.outlineRefinementText)} 
                                disabled={isLoading || !(localTaskData.outlineRefinementText || '').trim()}
                                className="button-secondary-small mt-2 disabled:opacity-50">
                                    {isLoading ? <window.LoadingSpinner isButton={true} /> : '✍️ Refine Outline'}
                            </button>
                        </div>
                        
                        <div className="flex justify-between items-center mt-8">
                            <button onClick={() => handleDataChange('scriptingStage', 'initial_thoughts')} className="button-secondary">Start Over</button>
                            <button onClick={() => handleAction(onGenerateRefinementPlan)} disabled={isLoading} className="px-6 py-3 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold text-lg">
                                {isLoading ? <window.LoadingSpinner isButton={true} /> : 'Looks Good, Ask Me More'}
                            </button>
                        </div>
                    </div>
                );
            
            case 'refinement_qa':
                return (
                    <div>
                        <h3 className="text-xl font-semibold text-primary-accent mb-3">Step 3: Answer a Few Questions</h3>
                        <p className="text-gray-400 mb-6">To make your script sound authentic, please answer these specific questions. Your answers will be woven directly into the final script.</p>
                        <div className="space-y-6 max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar">
                            {(localTaskData.locationQuestions || []).map((item, index) => (
                                <div key={index} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                                    <label className="block text-gray-200 text-md font-medium mb-2">
                                        {item.question}
                                    </label>
                                    <textarea
                                        value={(localTaskData.userExperiences || {})[index] || ''}
                                        onChange={(e) => {
                                            const newExperiences = { ...(localTaskData.userExperiences || {}), [index]: e.target.value };
                                            handleDataChange('userExperiences', newExperiences);
                                        }}
                                        placeholder="Be specific about what you did, saw, or captured..."
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
                        <h3 className="text-xl font-semibold text-primary-accent mb-3">Step 4: Final Script Review</h3>
                        <p className="text-gray-400 mb-4">Here is the complete script. You can edit it directly, or use the refinement box to ask the AI for changes.</p>
                        <textarea
                            value={localTaskData.script}
                            onChange={e => handleDataChange('script', e.target.value)}
                            rows="20"
                            className="w-full form-textarea leading-relaxed h-[50vh]"
                            placeholder="Your final script will appear here."
                        />

                         {/* SCRIPT REFINEMENT UI BLOCK */}
                        <div className="mt-6">
                            <h4 className="text-md font-semibold text-amber-400 mb-2">Refinement Instructions</h4>
                            <p className="text-gray-400 text-sm mb-2">E.g., "Make the conclusion more powerful," or "Rewrite the intro to be funnier."</p>
                            <textarea
                                value={localTaskData.scriptRefinementText || ''}
                                onChange={(e) => handleDataChange('scriptRefinementText', e.target.value)}
                                className="form-textarea w-full" 
                                rows="2" 
                                placeholder="Your refinement instructions..."
                            />
                            <button 
                                onClick={() => handleAction(onRefineScript, localTaskData.scriptRefinementText)} 
                                disabled={isLoading || !(localTaskData.scriptRefinementText || '').trim()}
                                className="button-secondary-small mt-2 disabled:opacity-50">
                                    {isLoading ? <window.LoadingSpinner isButton={true} /> : '✍️ Refine Script'}
                            </button>
                        </div>

                         <div className="text-center mt-8">
                              <button onClick={handleSaveAndComplete} className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold text-lg">
                                 Save and Complete Task
                            </button>
                        </div>
                    </div>
                );
            default:
                return <p>Invalid scripting stage: {stage}</p>;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4 sm:p-8">
            <div className="glass-card rounded-lg p-8 w-full h-[90vh] flex flex-col relative">
                <button onClick={handleClose} className="absolute top-4 right-6 text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
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
    
    // Consolidate task data from the video prop. This is the single source of truth.
    const taskData = {
        scriptingStage: video.tasks?.scriptingStage || 'initial_thoughts',
        initialThoughts: video.tasks?.initialThoughts || '',
        scriptPlan: video.tasks?.scriptPlan || '',
        locationQuestions: video.tasks?.locationQuestions || [],
        userExperiences: video.tasks?.userExperiences || {},
        script: video.script || '',
        outlineRefinementText: '', // This is transient UI state, so it's fine here
        scriptRefinementText: '',  // This is transient UI state, so it's fine here
    };
    
    // Logic to decide which stage to open the modal at
    const handleOpenWorkspace = (startStage = null) => {
        // If a specific start stage is requested (like 'full_script_review' for the paste button), use it.
        // Otherwise, determine the current stage from the existing video data.
        let stageToOpen = startStage;
        if (!stageToOpen) {
            stageToOpen = taskData.scriptingStage;
        }

        // If the task has never been started, update its stage in Firestore.
        if (video.tasks?.scriptingStage === 'pending' || !video.tasks?.scriptingStage) {
            onUpdateTask('scripting', 'in-progress', { 'tasks.scriptingStage': stageToOpen });
        }
        
        setShowWorkspace(true);
    };

    const handleGenerateDraftOutline = async (thoughtsText) => {
        await onUpdateTask('scripting', 'in-progress', { 'tasks.initialThoughts': thoughtsText });
        const { draftOutline } = await window.aiUtils.generateDraftOutlineAI({
            videoTitle: video.chosenTitle || video.title,
            videoConcept: video.concept,
            initialThoughts: thoughtsText,
            settings: settings
        });
        await onUpdateTask('scripting', 'in-progress', {
            'tasks.scriptingStage': 'draft_outline_review',
            'tasks.scriptPlan': draftOutline
        });
    };
    
    const handleRefineOutline = async (currentOutline, refinementText) => {
        const { draftOutline } = await window.aiUtils.generateDraftOutlineAI({
            videoTitle: video.chosenTitle || video.title,
            videoConcept: video.concept,
            initialThoughts: taskData.initialThoughts,
            settings: settings,
            refinementText: refinementText // Pass the new text
        });
        await onUpdateTask('scripting', 'in-progress', {
            'tasks.scriptPlan': draftOutline
        });
    };
    
    const handleGenerateRefinementPlan = async () => {
        const planData = await window.aiUtils.generateScriptPlanAI({
            videoTitle: video.chosenTitle || video.title,
            draftOutline: taskData.scriptPlan,
            settings: settings,
        });
        await onUpdateTask('scripting', 'in-progress', {
            'tasks.scriptingStage': 'refinement_qa',
            'tasks.scriptPlan': planData.scriptPlan,
            'tasks.locationQuestions': planData.locationQuestions,
            'tasks.userExperiences': {} // Reset answers for new questions
        });
    };
    
    const handleGenerateFullScript = async () => {
        const answersText = (taskData.locationQuestions || []).map((q, index) =>
            `Q: ${q.question}\nA: ${(taskData.userExperiences || {})[index] || 'No answer.'}`
        ).join('\n\n');

        const { finalScript } = await window.aiUtils.generateFinalScriptAI({
            scriptPlan: taskData.scriptPlan,
            userAnswers: answersText,
            videoTitle: video.chosenTitle || video.title,
            settings: settings
        });
        await onUpdateTask('scripting', 'in-progress', {
            'tasks.scriptingStage': 'full_script_review',
            'script': finalScript
        });
    };

    const handleRefineScript = async (refinementText) => {
        const answersText = (taskData.locationQuestions || []).map((q, index) =>
            `Q: ${q.question}\nA: ${(taskData.userExperiences || {})[index] || 'No answer.'}`
        ).join('\n\n');

        const { finalScript } = await window.aiUtils.generateFinalScriptAI({
            scriptPlan: taskData.scriptPlan,
            userAnswers: answersText,
            videoTitle: video.chosenTitle || video.title,
            settings: settings,
            refinementText: refinementText // Pass refinement text
        });
        await onUpdateTask('scripting', 'in-progress', {
            'script': finalScript
        });
    };

    // This function is called when the modal is closed via the 'X' button.
    // It syncs any direct edits the user made in textareas before closing.
    const handleUpdateAndCloseWorkspace = (updatedTaskData) => {
        const fieldsToUpdate = {
            'tasks.scriptingStage': updatedTaskData.scriptingStage,
            'tasks.initialThoughts': updatedTaskData.initialThoughts,
            'tasks.scriptPlan': updatedTaskData.scriptPlan,
            'tasks.locationQuestions': updatedTaskData.locationQuestions,
            'tasks.userExperiences': updatedTaskData.userExperiences,
            'script': updatedTaskData.script,
        };
        // Only update if the task is not yet complete
        if(video.tasks?.scripting !== 'complete'){
             onUpdateTask('scripting', 'in-progress', fieldsToUpdate);
        }
        setShowWorkspace(false);
    };

    // This function is called by the final "Save and Complete" button
    const handleSaveAndComplete = (finalTaskData) => {
        onUpdateTask('scripting', 'complete', {
            'tasks.scriptingStage': 'complete',
            'tasks.initialThoughts': finalTaskData.initialThoughts,
            'tasks.scriptPlan': finalTaskData.scriptPlan,
            'tasks.locationQuestions': finalTaskData.locationQuestions,
            'tasks.userExperiences': finalTaskData.userExperiences,
            'script': finalTaskData.script,
        });
        setShowWorkspace(false);
    };

    const renderAccordionContent = () => {
        if (isLocked) {
            return <p className="text-gray-400 text-center py-2 text-sm">Please complete previous steps to begin scripting.</p>;
        }

        if (video.tasks?.scripting === 'complete') {
            return (
                <div className="text-center py-4">
                     <p className="text-gray-400 pb-2 text-sm">Scripting is complete.</p>
                    <button onClick={() => handleOpenWorkspace('full_script_review')} className="mt-2 px-4 py-2 text-sm bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold">
                        View/Edit Script
                    </button>
                </div>
            );
        }
        
        return (
            <div className="text-center py-4">
                <p className="text-gray-400 mb-4">Use our AI-powered scripting assistant to go from a rough idea to a full script.</p>
                <div className="flex space-x-2 justify-center">
                    <button onClick={() => handleOpenWorkspace()} className="button-primary">
                        Open Scripting Workspace
                    </button>
                    {/* NEW BUTTON ADDED HERE */}
                    <button onClick={() => handleOpenWorkspace('full_script_review')} className="button-secondary">
                        Paste Final Script
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div>
            {renderAccordionContent()}
            {showWorkspace && ReactDOM.createPortal(
                <ScriptingWorkspaceModal
                    video={video}
                    taskData={taskData} // Pass the single source of truth directly
                    onClose={handleUpdateAndCloseWorkspace}
                    onSave={handleSaveAndComplete}
                    onGenerateDraftOutline={handleGenerateDraftOutline}
                    onRefineOutline={handleRefineOutline}
                    onGenerateRefinementPlan={handleGenerateRefinementPlan}
                    onGenerateFullScript={handleGenerateFullScript}
                    onRefineScript={handleRefineScript}
                />,
                document.body
            )}
        </div>
    );
};
