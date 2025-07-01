// creators-hub/js/components/ProjectView/VideoWorkspace.js

const { useState, useEffect, useCallback } = React;
const ReactDOM = window.ReactDOM;
const ShotListViewer = window.ShotListViewer; 

window.VideoWorkspace = React.memo(({ video, settings, project, userId, db, allVideos, onUpdateSettings, onNavigate, studioDetails }) => {
    const [openTask, setOpenTask] = useState(null);
    const [showShotList, setShowShotList] = useState(false); 

    const appId = window.CREATOR_HUB_CONFIG.APP_ID;
    const taskPipeline = window.CREATOR_HUB_CONFIG.TASK_PIPELINE;

    useEffect(() => {
        setOpenTask(null);
        setShowShotList(false);
    }, [video.id]);

    const updateTask = useCallback(async (taskName, status, extraData = {}) => {
        if (!db) {
            console.error("Firestore DB not available for updateTask.");
            return;
        }
        const videoDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${project.id}/videos`).doc(video.id);

        try {
            await db.runTransaction(async (transaction) => {
                const videoDoc = await transaction.get(videoDocRef);
                if (!videoDoc.exists) {
                    throw "Document does not exist!";
                }
                const currentData = videoDoc.data();
                const currentTasks = currentData.tasks || {};
                const topLevelUpdates = {};
                const updatesForTasks = {};
                updatesForTasks[taskName] = status;

                for (const key in extraData) {
                    if (Object.prototype.hasOwnProperty.call(extraData, key)) {
                        if (key.startsWith('tasks.')) {
                            const subKey = key.substring(6);
                            updatesForTasks[subKey] = extraData[key];
                        } else {
                            topLevelUpdates[key] = extraData[key];
                        }
                    }
                }
                const newTasksObject = { ...currentTasks, ...updatesForTasks };
                const payload = { ...topLevelUpdates, tasks: newTasksObject };
                transaction.update(videoDocRef, payload);
            });
        } catch (e) {
            console.error("Database transaction failed: ", e);
        }
    }, [userId, project.id, video.id, appId, db]);

    const handleResetTask = useCallback(async (taskId) => {
        let dataToReset = {};
        switch (taskId) {
            case 'scripting':
                dataToReset = {
                    script: '', 'tasks.scriptingStage': 'pending', 'tasks.initialQuestions': [],
                    'tasks.initialAnswers': [], 'tasks.scriptPlan': '', 'tasks.locationQuestions': [],
                    'tasks.userExperiences': {}, 'tasks.shotList': firebase.firestore.FieldValue.delete()
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

    const handleRegenerateShotList = async () => {
        if (!db) {
            console.error("Firestore DB not available for update.");
            return;
        }
        const videoDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${project.id}/videos`).doc(video.id);
        
        try {
            // THIS IS THE FIX: To delete a nested field, we must use dot notation
            // directly in the update call. The generic 'updateTask' function
            // was not designed for this specific operation.
            await videoDocRef.update({
                'tasks.shotList': firebase.firestore.FieldValue.delete()
            });
        } catch (e) {
            console.error("Failed to delete shot list for regeneration:", e);
        }
    };

    const isTaskLocked = (task) => {
        if (!task.dependsOn || task.dependsOn.length === 0) return false;
        return !task.dependsOn.every(dependencyId => video.tasks?.[dependencyId] === 'complete');
    };

    const renderTaskComponent = (task, index) => {
        const locked = isTaskLocked(task);
        const commonProps = { video, settings, onUpdateTask: updateTask, isLocked: locked, project };
        switch (task.id) {
            case 'scripting':
                return <window.ScriptingTask {...commonProps} userId={userId} db={db} allVideos={allVideos} onNavigate={onNavigate} />;
            case 'videoEdited':
                return <window.EditVideoTask {...commonProps} />;
            case 'titleGenerated':
                return <window.TitleTask {...commonProps} />;
            case 'descriptionGenerated':
                return <window.DescriptionTask {...commonProps} studioDetails={studioDetails} />;
            case 'chaptersGenerated':
                return <window.ChaptersTask {...commonProps} />;
            case 'tagsGenerated':
                return <window.TagsTask {...commonProps} />;
            case 'thumbnailsGenerated':
                return <window.ThumbnailTask {...commonProps} />;
            case 'videoUploaded':
                return <window.UploadToYouTubeTask {...commonProps} />;
            case 'firstCommentGenerated':
                 return <window.FirstCommentTask {...commonProps} />;
            default:
                return <p>Task component for '{task.id}' not found.</p>;
        }
    };

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
                                <button onClick={handleRegenerateShotList} className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-semibold rounded-lg transition-colors">
                                    Regenerate
                                </button>
                                <button onClick={() => setShowShotList(false)} className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold">
                                    Close
                                </button>
                            </div>
                        </div>
                        <div className="overflow-y-auto">
                            <ShotListViewer 
                                video={video} 
                                project={project} 
                                settings={settings} 
                                onUpdateTask={updateTask} 
                            />
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
});
