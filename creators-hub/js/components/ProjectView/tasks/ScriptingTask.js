// js/components/ProjectView/tasks/ScriptingTask.js

const { useState, useEffect } = React;

/**
 * A full-screen modal for the entire multi-step scripting process.
 * This component contains the UI for each stage of the new workflow.
 */
const ScriptingWorkspaceModal = ({
    video,
    taskData,
    onClose,
    onSave,
    onUpdate, // Function to update intermediate data
    onGenerateDraftOutline,
    onGenerateRefinementPlan,
    onGenerateFullScript
}) => {
    const [localTaskData, setLocalTaskData] = useState(taskData);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
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

    const renderContent = () => {
        const stage = localTaskData.scriptingStage || 'pending';

        switch (stage) {
            case 'pending': // Fallback
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
                        <h3 className="text-xl font-semibold text-primary-accent mb-3">Final Script Review</h3>
                        <p className="text-gray-400 mb-4">Here is the complete script. You can edit it directly in this text area.</p>
                        <textarea
                            value={localTaskData.script}
                            onChange={handleScriptChange}
                            rows="20"
                            className="w-full form-textarea leading-relaxed"
                            placeholder="Your final script will appear here."
                        />
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
    
    const taskData = {
        scriptingStage: video.tasks?.scriptingStage || 'pending',
        initialThoughts: video.tasks?.initialThoughts || '',
        scriptPlan: video.tasks?.scriptPlan || '',
        locationQuestions: video.tasks?.locationQuestions || [],
        userExperiences: video.tasks?.userExperiences || {},
        script: video.script || ''
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
        // First, save the user's thoughts to Firestore
        await onUpdateTask('scripting', 'in-progress', { 'tasks.initialThoughts': thoughtsText });

        // Then, call the AI
        const { draftOutline } = await window.aiUtils.generateDraftOutlineAI({
            videoTitle: video.chosenTitle || video.title,
            videoConcept: video.concept,
            initialThoughts: thoughtsText,
            settings: settings
        });
        
        // Finally, update the state with the new outline
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
            videoConcept: taskData.scriptPlan,
            videoLocationsFeatured: video.locations_featured || [],
            projectFootageInventory: projectData.footageInventory || {},
            whoAmI: settings.knowledgeBases?.youtube?.whoAmI,
            styleGuideText: settings.styleGuideText,
            settings: settings
        });
        
        await onUpdateTask('scripting', 'in-progress', {
            'tasks.scriptingStage': 'refinement_qa',
            'tasks.scriptPlan': planData.scriptPlan,
            'tasks.locationQuestions': planData.locationQuestions,
            'tasks.userExperiences': {}
        });
    };
    
    const handleGenerateFullScript = async () => {
        const fullScript = await window.aiUtils.generateFullScriptAI({
            scriptPlan: taskData.scriptPlan,
            generalFeedback: '',
            locationExperiences: taskData.userExperiences,
            videoTitle: video.chosenTitle || video.title,
            whoAmI: settings.knowledgeBases?.youtube?.whoAmI,
            styleGuideText: settings.styleGuideText,
            settings: settings
        });
        await onUpdateTask('scripting', 'in-progress', {
            'tasks.scriptingStage': 'full_script_review',
            'script': fullScript
        });
    };

    const handleUpdateAndCloseWorkspace = (updatedTaskData) => {
        onUpdateTask('scripting', 'in-progress', {
            'tasks.scriptingStage': updatedTaskData.scriptingStage,
            'tasks.initialThoughts': updatedTaskData.initialThoughts,
            'tasks.scriptPlan': updatedTaskData.scriptPlan,
            'tasks.locationQuestions': updatedTaskData.locationQuestions,
            'tasks.userExperiences': updatedTaskData.userExperiences,
            'script': updatedTaskData.script,
        });
        setShowWorkspace(false);
    };

    const handleSaveAndComplete = (finalScript, finalTaskData) => {
        onUpdateTask('scripting', 'complete', {
             'tasks.scriptingStage': 'complete',
             'tasks.initialThoughts': finalTaskData.initialThoughts,
             'tasks.scriptPlan': finalTaskData.scriptPlan,
             'tasks.locationQuestions': finalTaskData.locationQuestions,
             'tasks.userExperiences': finalTaskData.userExperiences,
             'script': finalScript,
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
                    onClose={() => setShowWorkspace(false)}
                    onUpdate={handleUpdateAndCloseWorkspace}
                    onSave={handleSaveAndComplete}
                    onGenerateDraftOutline={handleGenerateDraftOutline}
                    onGenerateRefinementPlan={handleGenerateRefinementPlan}
                    onGenerateFullScript={handleGenerateFullScript}
                />,
                document.body
            )}
        </div>
    );
};
