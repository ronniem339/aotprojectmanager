const { useState, useEffect, useCallback } = React;
const ReactDOM = window.ReactDOM;

const SafeComponentRenderer = ({ componentName, fallback = null, ...props }) => {
    const Component = window[componentName];
    if (Component) {
        return <Component {...props} />;
    }
    return fallback || <p className="text-gray-400 text-center py-2 text-sm">Loading...</p>;
};

window.VideoWorkspace = React.memo(({ video, settings, project, userId, db, allVideos, onUpdateSettings, onNavigate, studioDetails, googleMapsLoaded, handlers = {}, initialStep = null }) => {
    const [activeWorkspace, setActiveWorkspace] = useState(null);
    const [openTask, setOpenTask] = useState(null);
    const [showShotList, setShowShotList] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [regenerationError, setRegenerationError] = useState(null);
    const [showAddSceneModal, setShowAddSceneModal] = useState(false);
    const [stagedScenes, setStagedScenes] = useState([]);

    const appId = window.CREATOR_HUB_CONFIG.APP_ID;
    const taskPipeline = window.CREATOR_HUB_CONFIG.TASK_PIPELINE;

    useEffect(() => {
        setOpenTask(null);
        setActiveWorkspace(null); 
        setShowShotList(false);
        setRegenerationError(null);
        setStagedScenes([]);
    }, [video.id]);

    const updateVideo = useCallback(async (videoId, dataToUpdate) => {
        if (!db) {
            console.error("Firestore DB not available for updateVideo.");
            return;
        }
        const videoDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${project.id}/videos`).doc(videoId);
        try {
            await videoDocRef.update(dataToUpdate);
        } catch (e) {
            console.error("Database transaction failed: ", e);
            setRegenerationError(`Failed to save changes: ${e.message}`);
        }
    }, [userId, project.id, db, appId]);

    const handleResetTask = useCallback(async (taskId) => {
        let dataToReset = {};
        switch (taskId) {
            case 'scripting':
                dataToReset = {
                    'tasks.scripting': 'pending',
                    'tasks.scriptingV2_blueprint': firebase.firestore.FieldValue.delete(),
                    'tasks.scriptingStage': firebase.firestore.FieldValue.delete(),
                    'tasks.initialQuestions': firebase.firestore.FieldValue.delete(),
                    'tasks.initialAnswers': firebase.firestore.FieldValue.delete(),
                    'tasks.scriptPlan': firebase.firestore.FieldValue.delete(),
                    'tasks.locationQuestions': firebase.firestore.FieldValue.delete(),
                    'tasks.userExperiences': firebase.firestore.FieldValue.delete(),
                    'tasks.shotList': firebase.firestore.FieldValue.delete(),
                    script: ''
                };
                break;
            // ... other reset cases
        }
        if (Object.keys(dataToReset).length > 0) {
            await updateVideo(video.id, dataToReset);
        }
    }, [updateVideo, video.id]);
    
    const handleStartV2Workflow = useCallback(async () => {
        const updatePayload = {
            'tasks.scripting': 'in-progress',
            'tasks.scriptingV2_blueprint': {
                shots: [],
                initialThoughts: video.tasks?.initialThoughts || video.concept || '',
                migratedFromLegacy: true,
            }
        };
        await updateVideo(video.id, updatePayload);
    }, [updateVideo, video.id, video.tasks, video.concept]);

    const handleRegenerateShotList = async () => { /* ... existing code ... */ };
    const handleStageScene = async (sceneData) => { /* ... existing code ... */ };
    const handleIntegrateScene = async (scene, insertAtIndex) => { /* ... existing code ... */ };

    const handleOpenScriptingV2 = () => {
        setActiveWorkspace('scriptingV2');
    };

    const isTaskLocked = (task) => {
        if (!task.dependsOn || task.dependsOn.length === 0) return false;
        return !task.dependsOn.every(dependencyId => video.tasks?.[dependencyId] === 'complete');
    };

    const renderTaskComponent = (task, index) => {
        const locked = isTaskLocked(task);
        const commonProps = { video, settings, updateVideo, isLocked: locked, project, handlers, onOpenWorkspace: handleOpenScriptingV2 };
        
        switch (task.id) {
            case 'scripting': {
                const isV2 = !!video.tasks?.scriptingV2_blueprint;
                const componentProps = { ...commonProps, userId, db, allVideos, onNavigate, triggerAiTask: handlers?.triggerAiTask };
                if (isV2) {
                    return <SafeComponentRenderer componentName="scriptingTaskV2" {...componentProps} />;
                } else {
                    return <SafeComponentRenderer componentName="ScriptingTask" {...componentProps} onStartV2Workflow={handleStartV2Workflow} />;
                }
            }
            case 'videoEdited': return <SafeComponentRenderer componentName="EditVideoTask" {...commonProps} project={project} handlers={handlers} />;
            // ... other task cases
            default:
                return <SafeComponentRenderer componentName="SimpleConfirmationTask" {...commonProps} />;
        }
    };

    if (activeWorkspace === 'scriptingV2') {
        return (
            <React.Fragment>
                <div className="flex items-center mb-4">
                    <button onClick={() => setActiveWorkspace(null)} className="btn btn-secondary mr-4">
                        ‹ Back to Tasks
                    </button>
                    <h3 className="text-2xl lg:text-3xl font-bold text-primary-accent">{video.chosenTitle || video.title}</h3>
                </div>
                <SafeComponentRenderer 
                    componentName="ScriptingV2_Workspace" 
                    video={video} 
                    settings={settings} 
                    handlers={{...handlers, updateVideo}}
                    project={project}
                />
            </React.Fragment>
        );
    }

    return (
        <React.Fragment>
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
                        if (task.id === 'scripting') {
                            const scriptingBlueprint = video.tasks?.scriptingV2_blueprint;
                            if (scriptingBlueprint) {
                                if (scriptingBlueprint.workflowStatus === 'final') {
                                    status = 'complete';
                                } else if (scriptingBlueprint.workflowStatus) {
                                    status = 'in-progress';
                                }
                            }
                        case 'videoEdited': return <SafeComponentRenderer componentName="EditVideoTask" {...commonProps} project={project} handlers={handlers} />;
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
                    {/* ... modal content ... */}
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
        </React.Fragment>
    );
});
