// creators-hub/js/components/ProjectView/tasks/ScriptingTask.js

const { useState, useEffect } = React;

// Stepper component for navigation
const ScriptingStepper = ({ stages, currentStage, highestCompletedStageId, onStageClick }) => {
    const highestCompletedIndex = stages.findIndex(s => s.id === highestCompletedStageId);

    return (
        <div className="flex justify-center items-center space-x-2 sm:space-x-4 mb-6 pb-4 border-b border-gray-700 overflow-x-auto">
            {stages.map((stage, index) => {
                const isUnlocked = index <= highestCompletedIndex;
                const isCurrent = currentStage === stage.id;
                const isClickable = isUnlocked && !isCurrent;

                return (
                    <React.Fragment key={stage.id}>
                        <button
                            onClick={() => isClickable && onStageClick(stage.id)}
                            disabled={!isUnlocked}
                            className={`flex items-center space-x-2 text-xs sm:text-sm p-2 rounded-lg transition-colors ${
                                isCurrent
                                    ? 'bg-primary-accent text-white font-semibold'
                                    : 'bg-gray-800 text-gray-400'
                            } ${isClickable ? 'hover:bg-primary-accent-darker cursor-pointer' : ''}
                              ${!isUnlocked ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        >
                            <span className={`flex-shrink-0 h-6 w-6 sm:h-8 sm:w-8 rounded-full flex items-center justify-center font-bold ${isCurrent ? 'bg-white text-primary-accent' : (isUnlocked ? 'bg-green-600 text-white' : 'bg-gray-700')}`}>
                                {isUnlocked ? '✓' : index + 1}
                            </span>
                            <span className="hidden sm:inline">{stage.name}</span>
                        </button>
                        {index < stages.length - 1 && <div className="h-1 w-4 sm:w-8 bg-gray-700 rounded-full"></div>}
                    </React.Fragment>
                );
            })}
        </div>
    );
};


/**
 * A full-screen modal for the entire multi-step scripting process.
 */
const ScriptingWorkspaceModal = ({
    video,
    taskData,
    onClose,
    onSave,
    stageOverride,
    // AI action handlers
    onGenerateInitialQuestions,
    onGenerateDraftOutline,
    onRefineOutline,
    onGenerateRefinementPlan,
    onProceedToScripting,
    onGenerateFullScript,
    onRefineScript,
}) => {
    const [currentStage, setCurrentStage] = useState(stageOverride || taskData.scriptingStage || 'initial_thoughts');
    const [localTaskData, setLocalTaskData] = useState(taskData);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        setLocalTaskData(taskData);
    }, [taskData]);
    
    useEffect(() => {
        if(taskData.scriptingStage && taskData.scriptingStage !== currentStage) {
            setCurrentStage(taskData.scriptingStage);
        }
    }, [taskData.scriptingStage]);
    
    const handleDataChange = (field, value) => {
        setLocalTaskData(prev => ({ ...prev, [field]: value }));
    };

    const handleOnCameraDescriptionChange = (locationName, description) => {
        const newDescriptions = { 
            ...(localTaskData.onCameraDescriptions || {}), 
            [locationName]: description 
        };
        handleDataChange('onCameraDescriptions', newDescriptions);
    };

    const handleRemoveQuestion = (indexToRemove) => {
        const newQuestions = localTaskData.locationQuestions.filter((_, index) => index !== indexToRemove);
        
        // Re-key the userExperiences to keep them aligned with the new questions array
        const oldExperiences = localTaskData.userExperiences || {};
        const newExperiences = {};
        let newIndex = 0;
        for (let i = 0; i < localTaskData.locationQuestions.length; i++) {
            if (i !== indexToRemove) {
                if (oldExperiences[i] !== undefined) {
                    newExperiences[newIndex] = oldExperiences[i];
                }
                newIndex++;
            }
        }

        setLocalTaskData(prev => ({
            ...prev,
            locationQuestions: newQuestions,
            userExperiences: newExperiences
        }));
    };

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
    
    const handleClose = () => onClose(localTaskData);
    const handleSaveAndComplete = () => onSave(localTaskData);

    const stages = [
        { id: 'initial_thoughts', name: 'Brain Dump' },
        { id: 'initial_qa', name: 'Clarify Vision' },
        { id: 'draft_outline_review', name: 'Review Outline' },
        { id: 'refinement_qa', name: 'Refinement Q&A' },
        { id: 'on_camera_qa', name: 'On-Camera Notes' },
        { id: 'full_script_review', name: 'Final Script' },
    ];


    const renderContent = () => {
        switch (currentStage) {
            case 'initial_thoughts':
                // This case remains the same
                return (
                    <div>
                        <h3 className="text-xl font-semibold text-primary-accent mb-3">Step 1: Brain Dump</h3>
                        <p className="text-gray-400 mb-6">Jot down everything you're thinking for this video. The more you add, the better the AI's clarifying questions will be.</p>
                        <textarea
                            value={localTaskData.initialThoughts || ''}
                            onChange={(e) => handleDataChange('initialThoughts', e.target.value)}
                            rows="15"
                            className="w-full form-textarea"
                            placeholder="Paste your notes, describe your experience, list key points..."
                        />
                         <div className="text-center mt-8">
                            <button onClick={() => handleAction(onGenerateInitialQuestions, localTaskData.initialThoughts)} disabled={isLoading || !(localTaskData.initialThoughts || '').trim()} className="px-6 py-3 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold text-lg disabled:opacity-50">
                                {isLoading ? <window.LoadingSpinner isButton={true} /> : 'Clarify My Vision'}
                            </button>
                        </div>
                    </div>
                );
            
            case 'initial_qa':
                // This case remains the same
                return (
                    <div>
                        <h3 className="text-xl font-semibold text-primary-accent mb-3">Step 2: Clarify Your Vision</h3>
                        <p className="text-gray-400 mb-6">Let's refine the core idea. Your answers here will guide the entire script structure.</p>
                        <div className="space-y-6 max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar">
                            {(localTaskData.initialQuestions || []).map((question, index) => (
                                <div key={index} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                                    <label className="block text-gray-200 text-md font-medium mb-2">{question}</label>
                                    <textarea
                                        value={(localTaskData.initialAnswers || {})[index] || ''}
                                        onChange={(e) => {
                                            const newAnswers = { ...(localTaskData.initialAnswers || {}), [index]: e.target.value };
                                            handleDataChange('initialAnswers', newAnswers);
                                        }}
                                        rows="3"
                                        className="w-full form-textarea bg-gray-900 border-gray-600 focus:ring-primary-accent focus:border-primary-accent"
                                    ></textarea>
                                </div>
                            ))}
                        </div>
                         <div className="text-center mt-8">
                            <button onClick={() => handleAction(onGenerateDraftOutline)} disabled={isLoading} className="px-6 py-3 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold text-lg">
                                {isLoading ? <window.LoadingSpinner isButton={true} /> : 'Generate Draft Outline'}
                            </button>
                        </div>
                    </div>
                );

            case 'draft_outline_review':
                 // This case remains the same
                return (
                    <div>
                        <h3 className="text-xl font-semibold text-primary-accent mb-3">Step 3: Review AI-Generated Outline</h3>
                        <p className="text-gray-400 mb-4">Here's a potential structure based on your notes and goals. Review it, edit it, or use the refinement box to ask for changes.</p>
                        <textarea
                            value={localTaskData.scriptPlan || ''}
                            onChange={e => handleDataChange('scriptPlan', e.target.value)}
                            rows="15"
                            className="w-full form-textarea whitespace-pre-wrap leading-relaxed"
                        />
                        <div className="mt-6">
                            <h4 className="text-md font-semibold text-amber-400 mb-2">Refinement Instructions</h4>
                            <textarea
                                value={localTaskData.outlineRefinementText || ''}
                                onChange={(e) => handleDataChange('outlineRefinementText', e.target.value)}
                                className="form-textarea w-full" rows="2" placeholder="E.g., Make the intro shorter..."
                            />
                            <button 
                                onClick={() => handleAction(onRefineOutline, localTaskData.scriptPlan, localTaskData.outlineRefinementText)} 
                                disabled={isLoading || !(localTaskData.outlineRefinementText || '').trim()}
                                className="button-secondary-small mt-2 disabled:opacity-50">
                                    {isLoading ? <window.LoadingSpinner isButton={true} /> : '✍️ Refine Outline'}
                            </button>
                        </div>
                        <div className="flex justify-between items-center mt-8">
                            <button onClick={() => setCurrentStage('initial_thoughts')} className="button-secondary">Start Over</button>
                            <button onClick={() => handleAction(onGenerateRefinementPlan)} disabled={isLoading} className="px-6 py-3 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold text-lg">
                                {isLoading ? <window.LoadingSpinner isButton={true} /> : 'Looks Good, Ask Me More'}
                            </button>
                        </div>
                    </div>
                );
            
            case 'refinement_qa':
                return (
                    <div>
                        <h3 className="text-xl font-semibold text-primary-accent mb-3">Step 4: Answer a Few More Questions</h3>
                        <p className="text-gray-400 mb-6">Let's get specific. Your answers here will be woven directly into the final script. You can leave questions blank or remove any that aren't helpful.</p>
                        <div className="space-y-6 max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar">
                            {(localTaskData.locationQuestions || []).map((item, index) => (
                                <div key={index} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                                    <div className="flex justify-between items-start mb-2">
                                        <label className="block text-gray-200 text-md font-medium flex-grow pr-4">{item.question}</label>
                                        <button 
                                            onClick={() => handleRemoveQuestion(index)}
                                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-800/50 rounded-full flex-shrink-0" 
                                            title="Remove this question">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </div>
                                    <textarea
                                        value={(localTaskData.userExperiences || {})[index] || ''}
                                        onChange={(e) => {
                                            const newExperiences = { ...(localTaskData.userExperiences || {}), [index]: e.target.value };
                                            handleDataChange('userExperiences', newExperiences);
                                        }}
                                        rows="4"
                                        className="w-full form-textarea bg-gray-900 border-gray-600 focus:ring-primary-accent focus:border-primary-accent"
                                    ></textarea>
                                </div>
                            ))}
                        </div>
                         <div className="text-center mt-8">
                            <button onClick={() => handleAction(onProceedToScripting)} disabled={isLoading} className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold text-lg">
                                {isLoading ? <window.LoadingSpinner isButton={true} /> : 'Continue to Scripting'}
                            </button>
                        </div>
                    </div>
                );

            case 'on_camera_qa':
                 // This case remains the same
                return (
                    <div>
                        <h3 className="text-xl font-semibold text-primary-accent mb-3">Step 4.5: Describe Your On-Camera Segments</h3>
                        <p className="text-gray-400 mb-6">You indicated you have on-camera footage for the following locations. To ensure the voiceover flows naturally, briefly describe what you say or do in these segments.</p>
                        <div className="space-y-6 max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar">
                            {(localTaskData.onCameraLocations || []).map((locationName) => (
                                <div key={locationName} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                                    <label className="block text-gray-200 text-md font-medium mb-2">{locationName}</label>
                                    <textarea
                                        value={(localTaskData.onCameraDescriptions || {})[locationName] || ''}
                                        onChange={(e) => handleOnCameraDescriptionChange(locationName, e.target.value)}
                                        rows="3"
                                        className="w-full form-textarea bg-gray-900 border-gray-600 focus:ring-primary-accent focus:border-primary-accent"
                                        placeholder="E.g., 'I introduce the location here' or 'I taste the food and give my reaction.'"
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
                // This case remains the same
                return (
                       <div>
                        <h3 className="text-xl font-semibold text-primary-accent mb-3">Step 5: Final Script Review</h3>
                        <p className="text-gray-400 mb-4">Here is the complete script. You can edit it directly, or use the refinement box to ask the AI for changes.</p>
                        <textarea
                            value={localTaskData.script}
                            onChange={e => handleDataChange('script', e.target.value)}
                            rows="20"
                            className="w-full form-textarea leading-relaxed h-[50vh]"
                            placeholder="Your final script will appear here."
                        />
                        <div className="mt-6">
                            <h4 className="text-md font-semibold text-amber-400 mb-2">Refinement Instructions</h4>
                            <textarea
                                value={localTaskData.scriptRefinementText || ''}
                                onChange={(e) => handleDataChange('scriptRefinementText', e.target.value)}
                                className="form-textarea w-full" rows="2" placeholder="E.g., Make the conclusion more powerful..."
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
                return <p className="text-red-400 text-center p-4">Invalid scripting stage: {currentStage}</p>;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4 sm:p-8">
            <div className="glass-card rounded-lg p-8 w-full h-[90vh] flex flex-col relative">
                <button onClick={handleClose} className="absolute top-4 right-6 text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                <h2 className="text-3xl font-bold text-white mb-2 text-center">Scripting Workspace: <span className="text-primary-accent">{video.title}</span></h2>
                
                <ScriptingStepper 
                    stages={stages}
                    currentStage={currentStage}
                    highestCompletedStageId={localTaskData.scriptingStage || 'initial_thoughts'}
                    onStageClick={setCurrentStage}
                />

                <div className="flex-grow overflow-y-auto pr-4 custom-scrollbar">
                    {error && <p className="text-red-400 mb-4 bg-red-900/50 p-3 rounded-lg">{error}</p>}
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

// The rest of the ScriptingTask component remains the same
window.ScriptingTask = ({ video, settings, onUpdateTask, isLocked, project, userId, db }) => {
    // This part of the component remains unchanged...
    const [showWorkspace, setShowWorkspace] = useState(false);
    const [workspaceStageOverride, setWorkspaceStageOverride] = useState(null);
    
    const taskData = {
        scriptingStage: video.tasks?.scriptingStage || 'pending',
        initialThoughts: video.tasks?.initialThoughts || '',
        initialQuestions: video.tasks?.initialQuestions || [],
        initialAnswers: video.tasks?.initialAnswers || {},
        scriptPlan: video.tasks?.scriptPlan || '',
        locationQuestions: video.tasks?.locationQuestions || [],
        userExperiences: video.tasks?.userExperiences || {},
        onCameraLocations: video.tasks?.onCameraLocations || [],
        onCameraDescriptions: video.tasks?.onCameraDescriptions || {},
        script: video.script || '',
        outlineRefinementText: '',
        scriptRefinementText: '',
    };
    
    const handleOpenWorkspace = async (startStage = null) => {
        setWorkspaceStageOverride(null); 
        let stageToOpen = startStage;

        if (!stageToOpen) {
            const currentStage = taskData.scriptingStage;
            if (video.tasks?.scripting === 'complete') {
                 stageToOpen = 'full_script_review';
            } else {
                 stageToOpen = (currentStage === 'pending' || !currentStage) ? 'initial_thoughts' : currentStage;
            }
        }
        
        setWorkspaceStageOverride(stageToOpen);

        if (taskData.scriptingStage === 'pending' || !taskData.scriptingStage) {
            await onUpdateTask('scripting', 'in-progress', { 'tasks.scriptingStage': 'initial_thoughts' });
        }
        
        setShowWorkspace(true);
    };

    const handleGenerateInitialQuestions = async (thoughtsText) => {
        await onUpdateTask('scripting', 'in-progress', { 'tasks.initialThoughts': thoughtsText });
        
        const response = await window.aiUtils.generateInitialQuestionsAI({
            initialThoughts: thoughtsText,
            settings: settings
        });

        if (!response || !Array.isArray(response.questions)) {
            console.error("AI response did not contain 'questions' array:", response);
            throw new Error("The AI failed to generate clarifying questions. Please try again.");
        }

        await onUpdateTask('scripting', 'in-progress', {
            'tasks.scriptingStage': 'initial_qa',
            'tasks.initialQuestions': response.questions,
            'tasks.initialAnswers': {}
        });
    };

    const handleGenerateDraftOutline = async () => {
        const answersText = (taskData.initialQuestions || []).map((q, index) =>
            `Q: ${q}\nA: ${(taskData.initialAnswers || {})[index] || 'No answer.'}`
        ).join('\n\n');

        await onUpdateTask('scripting', 'in-progress', { 'tasks.initialAnswers': taskData.initialAnswers });

        const response = await window.aiUtils.generateDraftOutlineAI({
            videoTitle: video.chosenTitle || video.title,
            videoConcept: video.concept,
            initialThoughts: taskData.initialThoughts,
            initialAnswers: answersText,
            settings: settings
        });

        if (!response || typeof response.draftOutline !== 'string') {
            console.error("AI response did not contain 'draftOutline' string:", response);
            throw new Error("The AI failed to generate a valid outline. Please try again.");
        }

        await onUpdateTask('scripting', 'in-progress', {
            'tasks.scriptingStage': 'draft_outline_review',
            'tasks.scriptPlan': response.draftOutline
        });
    };
    
    const handleRefineOutline = async (currentOutline, refinementText) => {
         const answersText = (taskData.initialQuestions || []).map((q, index) =>
            `Q: ${q}\nA: ${(taskData.initialAnswers || {})[index] || 'No answer.'}`
        ).join('\n\n');
        
        const response = await window.aiUtils.generateDraftOutlineAI({
            videoTitle: video.chosenTitle || video.title,
            videoConcept: video.concept,
            initialThoughts: taskData.initialThoughts,
            initialAnswers: answersText,
            settings: settings,
            refinementText: refinementText
        });

        if (!response || typeof response.draftOutline !== 'string') {
            console.error("AI response did not contain 'draftOutline' string for refinement:", response);
            throw new Error("The AI failed to refine the outline. Please try again.");
        }

        await onUpdateTask('scripting', 'in-progress', { 'tasks.scriptPlan': response.draftOutline });
    };
    
    const handleGenerateRefinementPlan = async () => {
        const response = await window.aiUtils.generateScriptPlanAI({
            videoTitle: video.chosenTitle || video.title,
            draftOutline: taskData.scriptPlan,
            settings: settings,
        });

        if (!response || !response.scriptPlan || !Array.isArray(response.locationQuestions)) {
             console.error("AI response did not contain valid script plan/questions:", response);
            throw new Error("The AI failed to generate the next set of questions. Please try again.");
        }

        await onUpdateTask('scripting', 'in-progress', {
            'tasks.scriptingStage': 'refinement_qa',
            'tasks.scriptPlan': response.scriptPlan,
            'tasks.locationQuestions': response.locationQuestions,
            'tasks.userExperiences': {}
        });
    };
    
    const handleProceedToScripting = async () => {
        await onUpdateTask('scripting', 'in-progress', { 'tasks.userExperiences': taskData.userExperiences });

        const onCameraLocations = (video.locations_featured || [])
            .filter(locName => {
                const inventoryItem = Object.values(project.footageInventory || {}).find(inv => inv.name === locName);
                return inventoryItem && inventoryItem.onCamera;
            });

        if (onCameraLocations.length > 0) {
            await onUpdateTask('scripting', 'in-progress', {
                'tasks.scriptingStage': 'on_camera_qa',
                'tasks.onCameraLocations': onCameraLocations,
                'tasks.onCameraDescriptions': taskData.onCameraDescriptions || {}
            });
        } else {
            await handleGenerateFullScript();
        }
    };

    const handleGenerateFullScript = async () => {
        const answersText = (taskData.locationQuestions || []).map((q, index) =>
            `Q: ${q.question}\nA: ${(taskData.userExperiences || {})[index] || 'No answer.'}`
        ).join('\n\n');

        const response = await window.aiUtils.generateFinalScriptAI({
            scriptPlan: taskData.scriptPlan,
            userAnswers: answersText,
            videoTitle: video.chosenTitle || video.title,
            settings: settings,
            onCameraDescriptions: taskData.onCameraDescriptions
        });

        if (!response || typeof response.finalScript !== 'string') {
            console.error("AI response did not contain 'finalScript' string:", response);
            throw new Error("The AI failed to generate the final script. Please try again.");
        }

        await onUpdateTask('scripting', 'in-progress', {
            'tasks.scriptingStage': 'full_script_review',
            'script': response.finalScript
        });
    };

    const handleRefineScript = async (refinementText) => {
        const answersText = (taskData.locationQuestions || []).map((q, index) =>
            `Q: ${q.question}\nA: ${(taskData.userExperiences || {})[index] || 'No answer.'}`
        ).join('\n\n');

        const response = await window.aiUtils.generateFinalScriptAI({
            scriptPlan: taskData.scriptPlan,
            userAnswers: answersText,
            videoTitle: video.chosenTitle || video.title,
            settings: settings,
            refinementText: refinementText,
            onCameraDescriptions: taskData.onCameraDescriptions
        });
        
        if (!response || typeof response.finalScript !== 'string') {
            console.error("AI response did not contain 'finalScript' string for refinement:", response);
            throw new Error("The AI failed to refine the script. Please try again.");
        }

        await onUpdateTask('scripting', 'in-progress', {
            'script': response.finalScript
        });
    };

    const handleUpdateAndCloseWorkspace = (updatedTaskData) => {
        const fieldsToUpdate = {
            'tasks.scriptingStage': updatedTaskData.scriptingStage,
            'tasks.initialThoughts': updatedTaskData.initialThoughts,
            'tasks.initialQuestions': updatedTaskData.initialQuestions,
            'tasks.initialAnswers': updatedTaskData.initialAnswers,
            'tasks.scriptPlan': updatedTaskData.scriptPlan,
            'tasks.locationQuestions': updatedTaskData.locationQuestions,
            'tasks.userExperiences': updatedTaskData.userExperiences,
            'tasks.onCameraLocations': updatedTaskData.onCameraLocations,
            'tasks.onCameraDescriptions': updatedTaskData.onCameraDescriptions,
            'script': updatedTaskData.script,
        };
        if(video.tasks?.scripting !== 'complete'){
             onUpdateTask('scripting', 'in-progress', fieldsToUpdate);
        }
        setShowWorkspace(false);
    };

    const handleSaveAndComplete = (finalTaskData) => {
        onUpdateTask('scripting', 'complete', {
            'tasks.scriptingStage': 'complete',
            'tasks.initialThoughts': finalTaskData.initialThoughts,
            'tasks.initialQuestions': finalTaskData.initialQuestions,
            'tasks.initialAnswers': finalTaskData.initialAnswers,
            'tasks.scriptPlan': finalTaskData.scriptPlan,
            'tasks.locationQuestions': finalTaskData.locationQuestions,
            'tasks.userExperiences': finalTaskData.userExperiences,
            'tasks.onCameraLocations': finalTaskData.onCameraLocations,
            'tasks.onCameraDescriptions': finalTaskData.onCameraDescriptions,
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
                    <button onClick={() => handleOpenWorkspace()} className="mt-2 px-4 py-2 text-sm bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold">
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
                    taskData={taskData}
                    stageOverride={workspaceStageOverride}
                    onClose={handleUpdateAndCloseWorkspace}
                    onSave={handleSaveAndComplete}
                    onGenerateInitialQuestions={handleGenerateInitialQuestions}
                    onGenerateDraftOutline={handleGenerateDraftOutline}
                    onRefineOutline={handleRefineOutline}
                    onGenerateRefinementPlan={handleGenerateRefinementPlan}
                    onProceedToScripting={handleProceedToScripting}
                    onGenerateFullScript={handleGenerateFullScript}
                    onRefineScript={handleRefineScript}
                />,
                document.body
            )}
        </div>
    );
};
