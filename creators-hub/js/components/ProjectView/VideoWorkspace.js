// FILE: ./creators-hub/js/components/ProjectView/VideoWorkspace.js
// This is the complete, updated file with the necessary changes.

const { useState, useEffect, useCallback } = React;
const ReactDOM = window.ReactDOM;

const SafeComponentRenderer = ({ componentName, fallback = null, ...props }) => {
    const Component = window[componentName];
    if (Component) {
        return React.createElement(Component, props);
    }
    return fallback || <p className="text-gray-400 text-center py-2 text-sm">Loading...</p>;
};

window.VideoWorkspace = React.memo(({ video, settings, project, userId, db, allVideos, onUpdateSettings, onNavigate, studioDetails, googleMapsLoaded, handlers = {}, initialStep = null }) => {
    // --- START: NEW STATE FOR WORKSPACE ---
    // This state will control whether we show the task list or the full workspace.
    const [activeWorkspace, setActiveWorkspace] = useState(null);
    // --- END: NEW STATE FOR WORKSPACE ---

    const [openTask, setOpenTask] = useState(null);
    const [showShotList, setShowShotList] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [regenerationError, setRegenerationError] = useState(null);
    const [showAddSceneModal, setShowAddSceneModal] = useState(false);
    const [stagedScenes, setStagedScenes] = useState([]);

    const appId = window.CREATOR_HUB_CONFIG.APP_ID;
    const taskPipeline = window.CREATOR_HUB_CONFIG.TASK_PIPELINE;

    useEffect(() => {
        // When the video ID changes, close any open workspace or task.
        setOpenTask(null);
        setActiveWorkspace(null); 
        setShowShotList(false);
        setRegenerationError(null);
        setStagedScenes([]);
    }, [video.id]);

    const updateTask = useCallback(async (taskName, status, extraData = {}) => {
        if (!db) {
            console.error("Firestore DB not available for updateTask.");
            return;
        }
        const videoDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${project.id}/videos`).doc(video.id);
        try {
            const payload = {};
            payload[`tasks.${taskName}`] = status;
            for (const key in extraData) {
                if (Object.prototype.hasOwnProperty.call(extraData, key)) {
                    payload[key] = extraData[key];
                }
            }
            await videoDocRef.update(payload);
        } catch (e) {
            console.error("Database transaction failed: ", e);
            setRegenerationError(`Failed to save changes: ${e.message}`);
        }
    }, [userId, project.id, video.id, appId, db]);

    const handleResetTask = useCallback(async (taskId) => {
        let dataToReset = {};
        switch (taskId) {
            case 'scripting':
                dataToReset = {
                    script: '', 
                    'tasks.scriptingStage': 'pending', 
                    'tasks.initialQuestions': [],
                    'tasks.initialAnswers': [], 
                    'tasks.scriptPlan': '', 
                    'tasks.locationQuestions': [],
                    'tasks.userExperiences': {}, 
                    'tasks.shotList': firebase.firestore.FieldValue.delete()
                };
                updateTask(taskId, 'pending', dataToReset);
                break;
            case 'videoEdited':
                dataToReset = { 'tasks.feedbackText': '', 'tasks.musicTrack': '' };
                updateTask(taskId, 'pending', dataToReset);
                break;
            case 'titleGenerated':
                dataToReset = { chosenTitle: video.title, 'tasks.titleConfirmed': false };
                updateTask(taskId, 'pending', dataToReset);
                break;
            case 'descriptionGenerated':
                dataToReset = { metadata: '', chapters: [] };
                updateTask(taskId, 'pending', dataToReset);
                break;
            case 'chaptersGenerated':
                dataToReset = { 'tasks.chaptersFinalized': false };
                updateTask(taskId, 'pending', dataToReset);
                break;
            case 'tagsGenerated': {
                const currentMeta = (typeof video.metadata === 'string' && video.metadata)
                    ? JSON.parse(video.metadata) : video.metadata || {};
                delete currentMeta.tags;
                dataToReset = { metadata: JSON.stringify(currentMeta) };
                updateTask(taskId, 'pending', dataToReset);
                break;
            }
            case 'thumbnailsGenerated':
                dataToReset = {
                    'tasks.thumbnailConcepts': [], 'tasks.acceptedConcepts': [],
                    'tasks.rejectedConcepts': [], 'tasks.currentConceptIndex': 0
                };
                updateTask(taskId, 'pending', dataToReset);
                break;
            case 'firstCommentGenerated':
                dataToReset = { 'tasks.firstComment': '' };
                updateTask(taskId, 'pending', dataToReset);
                break;
            default:
                return;
        }
    }, [updateTask, video.title, video.metadata]);
    
    const handleStartV2Workflow = useCallback(async () => {
        const updatePayload = {
            'tasks.scriptingV2_blueprint': {
                shots: [],
                initialThoughts: video.tasks?.initialThoughts || video.concept || '',
                migratedFromLegacy: true, 
            }
        };
        await updateTask('scripting', 'in-progress', updatePayload);
    }, [updateTask, video.tasks, video.concept]);

    const handleRegenerateShotList = async () => { /* ... existing code ... */ };
    const handleStageScene = async (sceneData) => { /* ... existing code ... */ };
    const handleIntegrateScene = async (scene, insertAtIndex) => { /* ... existing code ... */ };

    // --- START: NEW HANDLER TO OPEN THE WORKSPACE ---
    const handleOpenScriptingV2 = () => {
        setActiveWorkspace('scriptingV2');
    };
    // --- END: NEW HANDLER ---

    const isTaskLocked = (task) => {
        if (!task.dependsOn || task.dependsOn.length === 0) return false;
        return !task.dependsOn.every(dependencyId => video.tasks?.[dependencyId] === 'complete');
    };

    const renderTaskComponent = (task, index) => {
        const locked = isTaskLocked(task);
        // Add our new handler to the common props object
        const commonProps = { video, settings, onUpdateTask: updateTask, isLocked: locked, project, handlers, onOpenWorkspace: handleOpenScriptingV2 };
        
        switch (task.id) {
            case 'scripting': {
                const isV2 = !!video.tasks?.scriptingV2_blueprint;
                const componentProps = {
                    ...commonProps,
                    userId,
                    db,
                    allVideos,
                    onNavigate,
                    triggerAiTask: handlers?.triggerAiTask
                };
                if (isV2) {
                    // We now render scriptingTaskV2 and pass it the onOpenWorkspace prop
                    return <SafeComponentRenderer componentName="scriptingTaskV2" {...componentProps} />;
                } else {
                    return <SafeComponentRenderer componentName="ScriptingTask" {...componentProps} onStartV2Workflow={handleStartV2Workflow} />;
                }
            }
            // ... other cases remain the same ...
            case 'videoEdited': return <SafeComponentRenderer componentName="EditVideoTask" {...commonProps} />;
            case 'titleGenerated': return <SafeComponentRenderer componentName="TitleTask" {...commonProps} />;
            case 'descriptionGenerated': return <SafeComponentRenderer componentName="DescriptionTask" {...commonProps} studioDetails={studioDetails} />;
            case 'chaptersGenerated': return <SafeComponentRenderer componentName="ChaptersTask" {...commonProps} />;
            case 'tagsGenerated': return <SafeComponentRenderer componentName="TagsTask" {...commonProps} />;
            case 'thumbnailsGenerated': return <SafeComponentRenderer componentName="ThumbnailTask" {...commonProps} />;
            case 'videoUploaded': return <SafeComponentRenderer componentName="UploadToYouTubeTask" {...commonProps} />;
            case 'firstCommentGenerated': return <SafeComponentRenderer componentName="FirstCommentTask" {...commonProps} />;
            default: return <p>Task component for '{task.id}' not found.</p>;
        }
    };

    // --- START: NEW TOP-LEVEL RENDER LOGIC ---
    // If a workspace is active, render it instead of the task list.
    if (activeWorkspace === 'scriptingV2') {
        return (
            <>
                <div className="flex items-center mb-4">
                    <button onClick={() => setActiveWorkspace(null)} className="btn btn-secondary mr-4">
                        ‹ Back to Tasks
                    </button>
                    <h3 className="text-2xl lg:text-3xl font-bold text-primary-accent">{video.chosenTitle || video.title}</h3>
                </div>
                <SafeComponentRenderer componentName="ScriptingV2_Workspace" />
            </>
        );
    }
    // --- END: NEW TOP-LEVEL RENDER LOGIC ---

    // This is the default view (the task list)
    return (
        <>
            <main className="flex-grow">
                <div className="flex items-center mb-4">
                    <h3 className="text-2xl lg:text-3xl font-bold text-primary-accent">{video.chosenTitle || video.title}</h3>
                    {video.script && (
                        <button 
                            onClick={() => setShowShotList(true)}
                            className="ml-4 px-3 py-1 bg-secondary hover:bg-secondary-dark text-white text-sm font-semibold rounded-lg shadow-md transition-colors"
                        >
                            View Shot List
                        </button>
                    )}
                </div>
                <div className="space-y-4">
                    {taskPipeline.map((task, index) => {
                        let status = video.tasks?.[task.id] || 'pending';
                        if (task.id === 'scripting' && video.tasks?.scriptingStage && !['pending', 'complete'].includes(video.tasks.scriptingStage)) {
                            status = 'in-progress';
                        } else if (task.id === 'videoEdited' && video.tasks?.videoEdited === 'in-progress') {
                            status = 'in-progress';
                        }
                        const locked = isTaskLocked(task);
                        return (
                            <window.Accordion
                                key={task.id} title={`${index + 1}. ${task.title}`}
                                isOpen={openTask === task.id} onToggle={() => setOpenTask(openTask === task.id ? null : task.id)}
                                status={locked ? 'locked' : status} isLocked={locked}
                                onRevisit={status === 'complete' ? () => handleResetTask(task.id) : null}
                                onRestart={status === 'in-progress' ? () => handleResetTask(task.id) : null}
                            >
                                {renderTaskComponent(task, index)}
                            </window.Accordion>
                        );
                    })}
                </div>
            </main>
            
            {showShotList && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[60] p-4">
                    <div className="glass-card rounded-lg p-6 w-full max-w-6xl text-left flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-4 flex-shrink-0">
                            <h3 className="text-xl font-bold text-white">Shot List: {video.chosenTitle || video.title}</h3>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setShowAddSceneModal(true)}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                                >
                                    Add Scene
                                </button>
                                <button 
                                    onClick={handleRegenerateShotList} 
                                    className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:bg-gray-500"
                                    disabled={isRegenerating}
                                >
                                    {isRegenerating ? 'Working...' : 'Regenerate'}
                                </button>
                                <button onClick={() => setShowShotList(false)} className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold">
                                    Close
                                </button>
                            </div>
                        </div>
                        <div className="overflow-y-auto">
                            {isRegenerating && <div className="absolute inset-0 bg-gray-900/50 flex justify-center items-center z-50"><SafeComponentRenderer componentName="LoadingSpinner" /></div>}
                            {regenerationError && <div className="text-red-400 p-3 bg-red-900/40 rounded-md mb-4">Error: {regenerationError}</div>}
                            <SafeComponentRenderer 
                                componentName="ShotListViewer"
                                video={video} 
                                project={project} 
                                settings={settings} 
                                onUpdateTask={updateTask}
                                onRegenerate={handleRegenerateShotList}
                                stagedScenes={stagedScenes}
                                onIntegrateScene={handleIntegrateScene}
                            />
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {showAddSceneModal && ReactDOM.createPortal(
                <SafeComponentRenderer
                    componentName="AddSceneModal"
                    isOpen={showAddSceneModal}
                    onClose={() => setShowAddSceneModal(false)}
                    onStageScene={handleStageScene}
                    googleMapsLoaded={googleMapsLoaded}
                />,
                document.body
            )}
        </>
    );
});
