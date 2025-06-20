// js/components/ProjectView/tasks/ScriptingTask.js

const { useState, useEffect, useRef } = React;

// PASTE THIS CODE AT THE TOP OF THE FILE
const EngagingLoader = ({ durationInSeconds = 120 }) => {
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState("Kicking off the creative process...");

    const messages = [
        { time: 0, text: "Powering up the AI's brain cell..." },
        { time: 10, text: "Reading your notes with our one good eye..." },
        { time: 25, text: "Consulting the ghost of a goldfish for ideas..." },
        { time: 40, text: "Untangling the plot spaghetti..." },
        { time: 60, text: "Adding a dramatic plot twist (it involves a squirrel)..." },
        { time: 80, text: "Trying to remember what a 'character arc' is..." },
        { time: 100, text: "Making sure the script is at least 1% better than a cat walking on a keyboard..." },
        { time: 115, text: "Putting the script in a tiny, fancy hat. It's ready!" }
    ];

    useEffect(() => {
        const intervalTime = 1000; // update every second
        const totalSteps = durationInSeconds;

        const interval = setInterval(() => {
            setProgress(prevProgress => {
                const newProgress = prevProgress + (100 / totalSteps);

                const elapsedTime = (newProgress / 100) * durationInSeconds;
                const currentMessage = messages.slice().reverse().find(m => elapsedTime >= m.time);

                if (currentMessage) {
                    setMessage(currentMessage.text);
                }

                if (newProgress >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return newProgress;
            });
        }, intervalTime);

        return () => clearInterval(interval);
    }, [durationInSeconds]);

    return (
        <div className="text-center p-8">
            <h3 className="text-xl font-semibold text-primary-accent mb-4">Crafting Your Script...</h3>
            <p className="text-gray-400 mb-6">{message}</p>
            <div className="w-full bg-gray-700 rounded-full h-4">
                <div
                    className="bg-primary-accent h-4 rounded-full transition-width duration-1000 ease-linear"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
            <p className="text-sm text-gray-500 mt-4 font-semibold">{Math.round(progress)}%</p>
        </div>
    );
};


window.LocationRemovalOptionsModal = ({ isOpen, locationName, onConfirm, onCancel }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4" style={{ zIndex: 1500 }}>
            <div className="glass-card rounded-lg p-8 w-full max-w-lg text-center">
                <h3 className="text-2xl font-bold text-amber-400 mb-4">Update Location Use</h3>
                <p className="text-gray-300 mb-6">
                    For the location <strong className="text-white">"{locationName}"</strong>, what would you like to do?
                </p>

                <div className="space-y-4">
                    <button
                        onClick={() => onConfirm(locationName, 'script-only')}
                        className="w-full text-left p-4 bg-gray-700 hover:bg-gray-600 rounded-lg border border-gray-600 hover:border-primary-accent transition-all"
                    >
                        <p className="font-semibold text-lg text-white">Exclude from this Script's On-Camera Notes</p>
                        <p className="text-gray-400 text-sm">This is temporary. The location will still be marked as "On-Camera" for the project, but will be ignored for this script generation.</p>
                    </button>

                    <button
                        onClick={() => onConfirm(locationName, 'video-remove')}
                        className="w-full text-left p-4 bg-red-900/50 hover:bg-red-800/50 rounded-lg border border-red-700 hover:border-red-500 transition-all"
                    >
                        <p className="font-semibold text-lg text-red-300">Remove Location from this Video</p>
                        <p className="text-gray-400 text-sm">Permanently removes this location from this video's "featured" list. If no other videos use it, it will be removed from the project inventory.</p>
                    </button>
                </div>

                <div className="mt-8">
                    <button onClick={onCancel} className="px-8 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};
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
// REPLACE the start of your ScriptingWorkspaceModal with this
const ScriptingWorkspaceModal = ({
    video,
    taskData,
    onClose,
    onSave,
    stageOverride,
    onInitiateRemoveLocation,
    onGenerateInitialQuestions,
    onGenerateDraftOutline,
    onRefineOutline,
    onProceedToOnCamera, // Formerly onGenerateRefinementPlan, now renamed
    onGenerateFullScript, // Formerly part of onProceedToScripting
    onRefineScript,
    settings, // Pass settings down
    project, // Pass project down
}) => {
    const [currentStage, setCurrentStage] = useState(stageOverride || taskData.scriptingStage || 'initial_thoughts');
    const [localTaskData, setLocalTaskData] = useState(taskData);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    // NEW: State for the style guide checkbox
    const [shouldUpdateStyleGuide, setShouldUpdateStyleGuide] = useState(false);

    useEffect(() => {
        setLocalTaskData(taskData);
    }, [taskData]);

    useEffect(() => {
        if (taskData.scriptingStage && taskData.scriptingStage !== currentStage) {
            setCurrentStage(taskData.scriptingStage);
        }
    }, [taskData.scriptingStage]);

    // RESTORED: These helper functions are required for the component to work.
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

    const handleClose = (shouldClose = true) => {
        onClose(localTaskData, shouldClose);
    };

    const handleStageClick = (targetStage) => {
        onClose(localTaskData, false); // Save current state before switching stage
        setCurrentStage(targetStage);
    };

    const handleSaveAndComplete = () => {
        onSave(localTaskData);
    };

    // ADD this new handler function inside ScriptingWorkspaceModal
    const initiateScriptGeneration = async () => {
        setCurrentStage('full_script_review');
        await handleAction(onGenerateFullScript, localTaskData);
    };


    const stages = [
        { id: 'initial_thoughts', name: 'Brain Dump' },
        { id: 'initial_qa', name: 'Clarify Vision' },
        { id: 'draft_outline_review', name: 'Review Outline' },
        { id: 'refinement_qa', name: 'Refinement Q&A' },
        { id: 'on_camera_qa', name: 'On-Camera Notes' },
        { id: 'full_script_review', name: 'Final Script' },
    ];


    // REPLACE the entire renderContent function with this
    const renderContent = () => {
        switch (currentStage) {
            case 'initial_thoughts':
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
                            <button onClick={() => handleAction(onGenerateDraftOutline, localTaskData)} disabled={isLoading} className="px-6 py-3 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold text-lg">
                                {isLoading ? <window.LoadingSpinner isButton={true} /> : 'Generate Draft Outline'}
                            </button>
                        </div>
                    </div>
                );

            case 'draft_outline_review':
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
                            <button onClick={() => handleStageClick('initial_thoughts')} className="button-secondary">Start Over</button>
                            <button onClick={() => handleAction(onProceedToOnCamera, localTaskData)} disabled={isLoading} className="px-6 py-3 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold text-lg">
                                {isLoading ? <window.LoadingSpinner isButton={true} /> : 'Looks Good, Ask Me More'}
                            </button>
                        </div>
                    </div>
                );

            case 'refinement_qa': // This is Step 4
                return (
                    <div>
                        <h3 className="text-xl font-semibold text-primary-accent mb-3">Step 4: Answer a Few More Questions</h3>
                        <p className="text-gray-400 mb-6">Let's get specific. Your answers here will be woven directly into the final script. You can leave questions blank or remove any that aren't helpful.</p>
                        <div className="space-y-6 max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar">
                            {(localTaskData.locationQuestions || []).map((item, index) => (
                                <div key={index} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                                    <div className="flex justify-between items-start mb-2">
                                        <label className="block text-gray-200 text-md font-medium flex-grow pr-4">{item.question}</label>
                                        <button onClick={() => handleRemoveQuestion(index)} className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-800/50 rounded-full flex-shrink-0" title="Remove this question">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                        </button>
                                    </div>
                                    <textarea value={(localTaskData.userExperiences || {})[index] || ''} onChange={(e) => { const newExperiences = { ...(localTaskData.userExperiences || {}), [index]: e.target.value }; handleDataChange('userExperiences', newExperiences); }} rows="4" className="w-full form-textarea bg-gray-900 border-gray-600 focus:ring-primary-accent focus:border-primary-accent"></textarea>
                                </div>
                            ))}
                        </div>
                        <div className="text-center mt-8">
                            <button
                                onClick={async () => {
                                    const onCameraLocations = (video.locations_featured || []).filter(locName => {
                                        const inventoryItem = Object.values(project.footageInventory || {}).find(inv => inv.name === locName);
                                        return inventoryItem && inventoryItem.onCamera;
                                    });
                                    if (onCameraLocations.length > 0) {
                                        await handleAction(onProceedToOnCamera, localTaskData);
                                    } else {
                                        await initiateScriptGeneration();
                                    }
                                }}
                                disabled={isLoading}
                                className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold text-lg"
                            >
                                {isLoading ? <window.LoadingSpinner isButton={true} /> : 'Continue to Scripting'}
                            </button>
                        </div>
                    </div>
                );

            case 'on_camera_qa': // This is Step 4.5
                return (
                    <div>
                        <h3 className="text-xl font-semibold text-primary-accent mb-3">Step 4.5: Describe Your On-Camera Segments</h3>
                        <p className="text-gray-400 mb-6">You indicated you have on-camera footage for the following locations. To ensure the voiceover flows naturally, briefly describe what you say or do in these segments.</p>
                        <div className="space-y-6 max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar">
                            {(localTaskData.onCameraLocations || []).map((locationName) => (
                                <div key={locationName} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                                    <div className="flex justify-between items-start mb-2">
                                        <label className="block text-gray-200 text-md font-medium">{locationName}</label>
                                        <button onClick={() => onInitiateRemoveLocation(locationName)} className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-800/50 rounded-full flex-shrink-0" title={`Update use of ${locationName}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                    <textarea value={(localTaskData.onCameraDescriptions || {})[locationName] || ''} onChange={(e) => handleOnCameraDescriptionChange(locationName, e.target.value)} rows="3" className="w-full form-textarea bg-gray-900 border-gray-600 focus:ring-primary-accent focus:border-primary-accent" placeholder="E.g., 'I introduce the location here' or 'I taste the food and give my reaction.'"></textarea>
                                </div>
                            ))}
                        </div>
                        <div className="text-center mt-8">
                            <button onClick={initiateScriptGeneration} disabled={isLoading} className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold text-lg">
                                {isLoading ? <window.LoadingSpinner isButton={true} /> : 'Generate Full Script'}
                            </button>
                        </div>
                    </div>
                );

            case 'full_script_review':
                if (isLoading) {
                    return <EngagingLoader durationInSeconds={120} />;
                }
                return (
                    <div>
                        <h3 className="text-xl font-semibold text-primary-accent mb-3">Step 5: Final Script Review</h3>
                        <p className="text-gray-400 mb-4">Here is the complete script. You can edit it directly, or use the refinement box to ask for changes.</p>
                        <textarea value={localTaskData.script} onChange={e => handleDataChange('script', e.target.value)} rows="20" className="w-full form-textarea leading-relaxed h-[50vh]" placeholder="Your final script will appear here." />
                        <div className="mt-6">
                            <h4 className="text-md font-semibold text-amber-400 mb-2">Refinement Instructions</h4>
                            <textarea value={localTaskData.scriptRefinementText || ''} onChange={(e) => handleDataChange('scriptRefinementText', e.target.value)} className="form-textarea w-full" rows="2" placeholder="E.g., Make the conclusion more powerful, be more sarcastic..." />
                            <div className="flex items-center mt-3">
                                <input type="checkbox" id="updateStyleGuide" className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-primary-accent focus:ring-primary-accent" checked={shouldUpdateStyleGuide} onChange={(e) => setShouldUpdateStyleGuide(e.target.checked)} />
                                <label htmlFor="updateStyleGuide" className="ml-2 text-sm text-gray-300">Update my Style Guide with this feedback for all future scripts</label>
                            </div>
                            <button onClick={() => handleAction(onRefineScript, { ...localTaskData, shouldUpdateStyleGuide })} disabled={isLoading || !(localTaskData.scriptRefinementText || '').trim()} className="button-secondary-small mt-3 disabled:opacity-50">
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
                <button onClick={() => handleClose(true)} className="absolute top-4 right-6 text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                <h2 className="text-3xl font-bold text-white mb-2 text-center">Scripting Workspace: <span className="text-primary-accent">{video.title}</span></h2>

                <ScriptingStepper
                    stages={stages}
                    currentStage={currentStage}
                    highestCompletedStageId={localTaskData.scriptingStage || 'initial_thoughts'}
                    onStageClick={handleStageClick}
                />

                <div className="flex-grow overflow-y-auto pr-4 custom-scrollbar">
                    {error && <p className="text-red-400 mb-4 bg-red-900/50 p-3 rounded-lg">{error}</p>}
                    {renderContent()}
                </div>

                <div className="flex-shrink-0 pt-3 mt-3 border-t border-gray-700 flex justify-end items-center h-10">
                </div>

            </div>
        </div>
    );
};

window.ScriptingTask = ({ video, settings, onUpdateTask, isLocked, project, userId, db, allVideos, onUpdateSettings }) => {
    const [showWorkspace, setShowWorkspace] = useState(false);
    const [workspaceStageOverride, setWorkspaceStageOverride] = useState(null);
    const [locationToModify, setLocationToModify] = useState(null);

    const appId = window.CREATOR_HUB_CONFIG.APP_ID;
    const [localOnCameraLocations, setLocalOnCameraLocations] = useState(null);

    // In creators-hub/js/components/ProjectView/tasks/scriptingTask.js

    const handleLocationModification = async (locationName, modificationType) => {
        if (modificationType === 'script-only') {
            // Add the location to a new "removed" list, implementing the user's flag idea.
            const currentRemoved = video.tasks?.scripting_locations_removed || [];
            if (currentRemoved.includes(locationName)) {
                setLocationToModify(null);
                return; // Already removed, nothing to do.
            }
            const newRemovedList = [...currentRemoved, locationName];

            // Save this new list of removed locations to the database.
            await onUpdateTask('scripting', 'in-progress', { 'tasks.scripting_locations_removed': newRemovedList });

            // Update the local UI by re-calculating the list to display.
            const freshOnCameraLocations = (video.locations_featured || []).filter(locName => {
                const inventoryItem = Object.values(project.footageInventory || {}).find(inv => inv.name === locName);
                return inventoryItem && inventoryItem.onCamera;
            });
            const removedSet = new Set(newRemovedList);
            const derivedOnCameraLocations = freshOnCameraLocations.filter(loc => !removedSet.has(loc));
            setLocalOnCameraLocations(derivedOnCameraLocations);

            setLocationToModify(null); // This closes the confirmation modal.
            return;
        }

        if (modificationType === 'video-remove') {
            // This logic for permanent removal remains the same.
            const videoRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${project.id}/videos`).doc(video.id);
            const newLocationsForVideo = video.locations_featured.filter(loc => loc !== locationName);

            await videoRef.update({ 'locations_featured': newLocationsForVideo });

            const isLocationUsedElsewhere = allVideos.some(v => v.id !== video.id && (v.locations_featured || []).includes(locationName));

            if (!isLocationUsedElsewhere) {
                const projectRef = db.collection(`artifacts/${appId}/users/${userId}/projects`).doc(project.id);
                const newProjectLocations = project.locations.filter(loc => loc.name !== locationName);
                const footageKey = `footageInventory.${locationName}`;
                await projectRef.update({
                    locations: newProjectLocations,
                    [footageKey]: firebase.firestore.FieldValue.delete()
                });
            }

            const newLocations = localOnCameraLocations.filter(loc => loc !== locationName);
            setLocalOnCameraLocations(newLocations);

            setLocationToModify(null);
        }
    };
    const taskData = {
        scriptingStage: video.tasks?.scriptingStage || 'pending',
        initialThoughts: video.tasks?.initialThoughts || '',
        initialQuestions: video.tasks?.initialQuestions || [],
        initialAnswers: video.tasks?.initialAnswers || {},
        scriptPlan: video.tasks?.scriptPlan || '',
        locationQuestions: video.tasks?.locationQuestions || [],
        userExperiences: video.tasks?.userExperiences || {},
        onCameraLocations: localOnCameraLocations !== null ? localOnCameraLocations : video.tasks?.onCameraLocations || [],
        onCameraDescriptions: video.tasks?.onCameraDescriptions || {},
        script: video.script || '',
        outlineRefinementText: '',
        scriptRefinementText: '',
    };


    // creators-hub/js/components/ProjectView/tasks/scriptingTask.js

    const handleOpenWorkspace = async (startStage = null) => {
        setWorkspaceStageOverride(null);
        let stageToOpen = startStage;
        const allStages = ['initial_thoughts', 'initial_qa', 'draft_outline_review', 'refinement_qa', 'on_camera_qa', 'full_script_review', 'complete'];
        const currentStage = video.tasks?.scriptingStage || 'pending';

        // --- Start of Targeted Change ---

        // This block is now the single source of truth for what locations to display.
        // It derives the list on-the-fly, rather than reading a saved list.

        // 1. Get the master list of all on-camera locations from the project inventory.
        const freshOnCameraLocations = (video.locations_featured || []).filter(locName => {
            const inventoryItem = Object.values(project.footageInventory || {}).find(inv => inv.name === locName);
            return inventoryItem && inventoryItem.onCamera;
        });

        // 2. Get our new "flag" list of locations the user has specifically removed for this script.
        const removedLocations = video.tasks?.scripting_locations_removed || [];
        const removedSet = new Set(removedLocations);

        // 3. The correct list to display is the master list MINUS the removed list.
        const derivedOnCameraLocations = freshOnCameraLocations.filter(loc => !removedSet.has(loc));

        // 4. Set the component's local state with this freshly calculated list.
        setLocalOnCameraLocations(derivedOnCameraLocations);

        // --- End of Targeted Change ---

        if (!stageToOpen) {
            stageToOpen = (currentStage === 'pending' || !currentStage) ? 'initial_thoughts' : currentStage;
        }

        setWorkspaceStageOverride(stageToOpen);
        setShowWorkspace(true);
    };
    const handleGenerateInitialQuestions = async (thoughtsText) => {
        const response = await window.aiUtils.generateInitialQuestionsAI({
            initialThoughts: thoughtsText,
            settings: settings
        });

        if (!response || !Array.isArray(response.questions)) {
            throw new Error("The AI failed to generate clarifying questions. Please try again.");
        }

        await onUpdateTask('scripting', 'in-progress', {
            'tasks.initialThoughts': thoughtsText,
            'tasks.scriptingStage': 'initial_qa',
            'tasks.initialQuestions': response.questions,
            'tasks.initialAnswers': {}
        });
    };

    const handleGenerateDraftOutline = async (currentTaskData) => {
        const answersText = (currentTaskData.initialQuestions || []).map((q, index) =>
            `Q: ${q}\nA: ${(currentTaskData.initialAnswers || {})[index] || 'No answer.'}`
        ).join('\n\n');

        await onUpdateTask('scripting', 'in-progress', { 'tasks.initialAnswers': currentTaskData.initialAnswers });

        const response = await window.aiUtils.generateDraftOutlineAI({
            videoTitle: video.chosenTitle || video.title,
            videoConcept: video.concept,
            initialThoughts: currentTaskData.initialThoughts,
            initialAnswers: answersText,
            settings: settings
        });

        if (!response || typeof response.draftOutline !== 'string') {
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
            throw new Error("The AI failed to refine the outline. Please try again.");
        }

        await onUpdateTask('scripting', 'in-progress', { 'tasks.scriptPlan': response.draftOutline });
    };

    // REPLACE the block of handler functions in ScriptingTask with this

    // This function is now only responsible for moving to the On-Camera QA step.
    const handleProceedToOnCamera = async (currentTaskData) => {
        await onUpdateTask('scripting', 'in-progress', { 'tasks.userExperiences': currentTaskData.userExperiences });

        const onCameraLocations = (video.locations_featured || []).filter(locName => {
            const inventoryItem = Object.values(project.footageInventory || {}).find(inv => inv.name === locName);
            return inventoryItem && inventoryItem.onCamera;
        });

        await onUpdateTask('scripting', 'in-progress', {
            'tasks.scriptingStage': 'on_camera_qa',
            'tasks.onCameraLocations': onCameraLocations,
            'tasks.onCameraDescriptions': currentTaskData.onCameraDescriptions || {}
        });
    };

    // This function now only handles the backend work for generating the script.
    const handleGenerateFullScript = async (currentTaskData) => {
        const answersText = (currentTaskData.locationQuestions || []).map((q, index) =>
            `Q: ${q.question}\nA: ${(currentTaskData.userExperiences || {})[index] || 'No answer.'}`
        ).join('\n\n');

        const onCameraDescriptionsToUse = { ...currentTaskData.onCameraDescriptions };
        for (const key in onCameraDescriptionsToUse) {
            if (!currentTaskData.onCameraLocations.includes(key)) {
                delete onCameraDescriptionsToUse[key];
            }
        }

        const response = await window.aiUtils.generateFinalScriptAI({
            scriptPlan: currentTaskData.scriptPlan,
            userAnswers: answersText,
            videoTitle: video.chosenTitle || video.title,
            settings: settings,
            onCameraDescriptions: onCameraDescriptionsToUse
        });

        if (!response || typeof response.finalScript !== 'string') {
            throw new Error("The AI failed to generate the final script. Please try again.");
        }

        await onUpdateTask('scripting', 'in-progress', {
            'tasks.scriptingStage': 'full_script_review',
            'script': response.finalScript
        });
    };

    // This function handles both refining the script and updating the style guide.
    const handleRefineScript = async (currentTaskData) => {
        const { shouldUpdateStyleGuide, scriptRefinementText } = currentTaskData;

        if (shouldUpdateStyleGuide && scriptRefinementText) {
            const currentStyleGuide = settings.knowledgeBases?.creator?.styleGuideText || '';
            const response = await window.aiUtils.updateStyleGuideAI({
                currentStyleGuide: currentStyleGuide,
                refinementFeedback: scriptRefinementText,
                settings: settings
            });
            const newStyleGuideText = response.newStyleGuideText;
            if (onUpdateSettings) {
                await onUpdateSettings({
                    'knowledgeBases.creator.styleGuideText': newStyleGuideText
                });
            }
        }

        const answersText = (currentTaskData.locationQuestions || []).map((q, index) =>
            `Q: ${q.question}\nA: ${(currentTaskData.userExperiences || {})[index] || 'No answer.'}`
        ).join('\n\n');

        const scriptResponse = await window.aiUtils.generateFinalScriptAI({
            scriptPlan: currentTaskData.scriptPlan,
            userAnswers: answersText,
            videoTitle: video.chosenTitle || video.title,
            settings: settings,
            refinementText: scriptRefinementText,
            onCameraDescriptions: currentTaskData.onCameraDescriptions
        });

        if (!scriptResponse || typeof scriptResponse.finalScript !== 'string') {
            throw new Error("The AI failed to refine the script. Please try again.");
        }

        await onUpdateTask('scripting', 'in-progress', {
            'script': scriptResponse.finalScript
        });
    };

    const handleUpdateAndCloseWorkspace = (updatedTaskData, shouldClose = true) => {
        const fieldsToUpdate = {
            'tasks.scriptingStage': updatedTaskData.scriptingStage,
            'tasks.initialThoughts': updatedTaskData.initialThoughts,
            'tasks.initialQuestions': updatedTaskData.initialQuestions,
            'tasks.initialAnswers': updatedTaskData.initialAnswers,
            'tasks.scriptPlan': updatedTaskData.scriptPlan,
            'tasks.locationQuestions': updatedTaskData.locationQuestions,
            'tasks.userExperiences': updatedTaskData.userExperiences,
            'tasks.onCameraLocations': localOnCameraLocations,    // Ensure this is using the local state
            'tasks.onCameraDescriptions': updatedTaskData.onCameraDescriptions,
            'script': updatedTaskData.script,
        };
        if (video.tasks?.scripting !== 'complete') {
            onUpdateTask('scripting', 'in-progress', fieldsToUpdate);
        }
        if (shouldClose) {
            setShowWorkspace(false);
            setLocalOnCameraLocations(null);
        }
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
        setLocalOnCameraLocations(null); // <-- ADD THIS
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
                    onInitiateRemoveLocation={setLocationToModify}
                    onGenerateInitialQuestions={handleGenerateInitialQuestions}
                    onGenerateDraftOutline={handleGenerateDraftOutline}
                    onRefineOutline={handleRefineOutline}
                    onProceedToOnCamera={handleProceedToOnCamera}
                    onGenerateFullScript={handleGenerateFullScript}
                    onRefineScript={handleRefineScript}
                    settings={settings}
                    project={project}
                />,
                document.body
            )}

            {/* MOVED AND WRAPPED THE MODAL IN ITS OWN PORTAL */}
            {locationToModify && ReactDOM.createPortal(
                <LocationRemovalOptionsModal
                    isOpen={!!locationToModify}
                    locationName={locationToModify}
                    onConfirm={handleLocationModification}
                    onCancel={() => setLocationToModify(null)}
                />,
                document.body
            )}
        </div>
    );
};
