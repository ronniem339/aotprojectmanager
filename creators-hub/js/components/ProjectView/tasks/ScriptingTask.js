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
    onGenerateInitialQuestions,
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

    const handleAnswerChange = (index, value) => {
        const newAnswers = [...(localTaskData.initialAnswers || [])];
        newAnswers[index] = value;
        setLocalTaskData(prev => ({ ...prev, initialAnswers: newAnswers }));
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
            case 'pending':
                return (
                    <div className="text-center">
                        <p className="text-lg text-gray-300 mb-6">Let's start by gathering your core ideas for this video.</p>
                        <button onClick={() => handleAction(onGenerateInitialQuestions)} disabled={isLoading} className="px-6 py-3 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold text-lg">
                            {isLoading ? <window.LoadingSpinner isButton={true} /> : 'Start Scripting'}
                        </button>
                    </div>
                );
            
            case 'initial_qa':
                return (
                    <div>
                        <h3 className="text-xl font-semibold text-primary-accent mb-3">Initial Thoughts & Experiences</h3>
                        <p className="text-gray-400 mb-6">Answer these high-level questions to form the foundation of your script.</p>
                        <div className="space-y-6">
                            {(localTaskData.initialQuestions || []).map((q, i) => (
                                <div key={i}>
                                    <label className="block text-md font-medium text-gray-200 mb-2">{q}</label>
                                    <textarea
                                        value={(localTaskData.initialAnswers || [])[i] || ''}
                                        onChange={(e) => handleAnswerChange(i, e.target.value)}
                                        rows="3"
                                        className="w-full form-textarea"
                                        placeholder="Your thoughts, key moments, best footage..."
                                    />
                                </div>
                            ))}
                        </div>
                         <div className="text-center mt-8">
                            <button onClick={() => handleAction(onGenerateDraftOutline, localTaskData.initialAnswers.join('\n\n'))} disabled={isLoading} className="px-6 py-3 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold text-lg">
                                {isLoading ? <window.LoadingSpinner isButton={true} /> : 'Generate Draft Outline'}
                            </button>
                        </div>
                    </div>
                );

            case 'draft_outline_review':
                 return (
                    <div>
                        <h3 className="text-xl font-semibold text-primary-accent mb-3">Draft Outline Review</h3>
                        <p className="text-gray-400 mb-4">Here is a draft outline based on your answers. Review it, then we'll generate specific questions to flesh it out.</p>
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
    
    // Simplified task data structure for the new flow
    const taskData = {
        scriptingStage: video.tasks?.scriptingStage || 'pending',
        initialQuestions: video.tasks?.initialQuestions || [],
        initialAnswers: video.tasks?.initialAnswers || [],
        scriptPlan: video.tasks?.scriptPlan || '', // Will hold the draft outline
        locationQuestions: video.tasks?.locationQuestions || [], // For refinement questions
        userExperiences: video.tasks?.userExperiences || {},
        script: video.script || ''
    };

    const handleGenerateInitialQuestions = async () => {
        const { questions } = await window.aiUtils.generateInitialScriptQuestionsAI({
            videoTitle: video.chosenTitle || video.title,
            videoConcept: video.concept,
            apiKey: settings.geminiApiKey
        });
        await onUpdateTask('scripting', 'in-progress', { 
            'tasks.scriptingStage': 'initial_qa',
            'tasks.initialQuestions': questions,
            'tasks.initialAnswers': new Array(questions.length).fill('')
        });
    };

    const handleGenerateDraftOutline = async (answersText) => {
        const { draftOutline } = await window.aiUtils.generateDraftOutlineAI({
            videoTitle: video.chosenTitle || video.title,
            videoConcept: video.concept,
            initialAnswers: answersText,
            apiKey: settings.geminiApiKey
        });
        await onUpdateTask('scripting', 'in-progress', {
            'tasks.scriptingStage': 'draft_outline_review',
            'tasks.scriptPlan': draftOutline // Storing the draft outline in the scriptPlan field
        });
    };

    const handleGenerateRefinementPlan = async () => {
        const projectDocRef = db.collection(`artifacts/${window.CREATOR_HUB_CONFIG.APP_ID}/users/${userId}/projects`).doc(project.id);
        const projectSnap = await projectDocRef.get();
        const projectData = projectSnap.data();

        const planData = await window.aiUtils.generateScriptPlanAI({
            videoTitle: video.chosenTitle || video.title,
            videoConcept: taskData.scriptPlan, // Use the draft outline as the new concept
            videoLocationsFeatured: video.locations_featured || [],
            projectFootageInventory: projectData.footageInventory || {},
            whoAmI: settings.knowledgeBases?.youtube?.whoAmI,
            styleGuideText: settings.styleGuideText,
            apiKey: settings.geminiApiKey
        });
        
        await onUpdateTask('scripting', 'in-progress', {
            'tasks.scriptingStage': 'refinement_qa',
            'tasks.scriptPlan': planData.scriptPlan, // The refined plan
            'tasks.locationQuestions': planData.locationQuestions,
            'tasks.userExperiences': {} // Reset experiences for new questions
        });
    };
    
    const handleGenerateFullScript = async () => {
        const fullScript = await window.aiUtils.generateFullScriptAI({
            scriptPlan: taskData.scriptPlan,
            generalFeedback: '', // This can be added back if needed
            locationExperiences: taskData.userExperiences,
            videoTitle: video.chosenTitle || video.title,
            whoAmI: settings.knowledgeBases?.youtube?.whoAmI,
            styleGuideText: settings.styleGuideText,
            apiKey: settings.geminiApiKey
        });
        await onUpdateTask('scripting', 'in-progress', {
            'tasks.scriptingStage': 'full_script_review',
            'script': fullScript
        });
    };

    const handleUpdateAndCloseWorkspace = (updatedTaskData) => {
        // Just save the intermediate state without changing the status
        onUpdateTask('scripting', 'in-progress', {
            'tasks.scriptingStage': updatedTaskData.scriptingStage,
            'tasks.initialQuestions': updatedTaskData.initialQuestions,
            'tasks.initialAnswers': updatedTaskData.initialAnswers,
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
             'tasks.initialQuestions': finalTaskData.initialQuestions,
             'tasks.initialAnswers': finalTaskData.initialAnswers,
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
                    <button onClick={() => setShowWorkspace(true)} className="mt-2 px-4 py-2 text-sm bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold">
                        View/Edit Script
                    </button>
                </div>
            );
        }
        
        return (
            <div className="text-center py-4">
                <button onClick={() => setShowWorkspace(true)} className="w-full max-w-xs mx-auto px-5 py-2.5 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold">
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
                    onGenerateInitialQuestions={handleGenerateInitialQuestions}
                    onGenerateDraftOutline={handleGenerateDraftOutline}
                    onGenerateRefinementPlan={handleGenerateRefinementPlan}
                    onGenerateFullScript={handleGenerateFullScript}
                />,
                document.body
            )}
        </div>
    );
};
