// creators-hub/js/components/ProjectView/VideoWorkspace.js

window.VideoWorkspace = React.memo(({ video, settings, project, userId, db, allVideos, onUpdateSettings, onNavigate, studioDetails }) => {
    const { useState, useEffect, useCallback } = React;
    const [openTask, setOpenTask] = useState(null);
    const appId = window.CREATOR_HUB_CONFIG.APP_ID;
    const taskPipeline = window.CREATOR_HUB_CONFIG.TASK_PIPELINE;

    useEffect(() => {
        setOpenTask(null);
    }, [video.id]);

    const updateTask = useCallback(async (taskName, status, extraData = {}) => {
        if (!db) {
            console.error("Firestore DB not available for updateTask.");
            return;
        }
        const videoDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${project.id}/videos`).doc(video.id);

        try {
            // Using a transaction for a robust read-modify-write operation
            await db.runTransaction(async (transaction) => {
                const videoDoc = await transaction.get(videoDocRef);
                if (!videoDoc.exists) {
                    throw "Document does not exist!";
                }

                const currentData = videoDoc.data();
                const currentTasks = currentData.tasks || {};
                const topLevelUpdates = {};
                const updatesForTasks = {};

                // Set the primary task status, e.g., 'scripting': 'in-progress'
                updatesForTasks[taskName] = status;

                // Process extraData to separate keys meant for the 'tasks' object from top-level keys
                for (const key in extraData) {
                    if (Object.prototype.hasOwnProperty.call(extraData, key)) {
                        if (key.startsWith('tasks.')) {
                            const subKey = key.substring(6); // Remove 'tasks.' prefix
                            updatesForTasks[subKey] = extraData[key];
                        } else {
                            topLevelUpdates[key] = extraData[key];
                        }
                    }
                }

                // Merge the updates with the existing tasks object to avoid overwriting other task data
                const newTasksObject = { ...currentTasks, ...updatesForTasks };

                const payload = {
                    ...topLevelUpdates,
                    tasks: newTasksObject
                };
                
                // Perform the update within the transaction
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
                    script: '',
                    'tasks.scriptingStage': 'pending',
                    'tasks.initialQuestions': [],
                    'tasks.initialAnswers': [],
                    'tasks.scriptPlan': '',
                    'tasks.locationQuestions': [],
                    'tasks.userExperiences': {}
                };
                break;
            case 'videoEdited':
                dataToReset = { 'tasks.feedbackText': '', 'tasks.musicTrack': '' };
                break;
            case 'titleGenerated':
                dataToReset = { chosenTitle: video.title, 'tasks.titleConfirmed': false };
                break;
            case 'descriptionGenerated':
                 dataToReset = { metadata: '', chapters: [] };
                 break;
            case 'chaptersGenerated':
                 dataToReset = { 'tasks.chaptersFinalized': false };
                 break;
            case 'tagsGenerated': { // Scoping the constant to the case
                // FIX: Safely handle metadata whether it's an object or a string.
                const currentMeta = (typeof video.metadata === 'string' && video.metadata)
                    ? JSON.parse(video.metadata)
                    : video.metadata || {};

                delete currentMeta.tags;
                dataToReset = { metadata: JSON.stringify(currentMeta) };
                break;
            }
            case 'thumbnailsGenerated':
                dataToReset = {
                    'tasks.thumbnailConcepts': [], 'tasks.acceptedConcepts': [],
                    'tasks.rejectedConcepts': [], 'tasks.currentConceptIndex': 0
                };
                break;
            case 'firstCommentGenerated':
                dataToReset = { 'tasks.firstComment': '' };
                break;
            default:
                break;
        }
        updateTask(taskId, 'pending', dataToReset);
    }, [updateTask, video.title, video.metadata]);


    // **UPDATED**: This function now checks the `dependsOn` array from the config.
    const isTaskLocked = (task) => {
        // A task is locked if it has dependencies that are not yet complete.
        if (!task.dependsOn || task.dependsOn.length === 0) {
            return false; // No dependencies means it's never locked.
        }
    
        // It checks if EVERY task in the 'dependsOn' array has a status of 'complete'.
        // If even one is not complete, the task remains locked.
        return !task.dependsOn.every(dependencyId => 
            video.tasks?.[dependencyId] === 'complete'
        );
    };

    const renderTaskComponent = (task, index) => {
        const locked = isTaskLocked(task); // Pass the entire task object

        // ** THIS IS THE FIX **
        // The 'project={project}' prop is now correctly passed down to all task components that need it for context.
        switch (task.id) {
            case 'scripting':
                return <window.ScriptingTask video={video} settings={settings} onUpdateTask={updateTask} isLocked={locked} project={project} userId={userId} db={db} allVideos={allVideos} onNavigate={onNavigate} />;
            case 'videoEdited':
                return <window.EditVideoTask video={video} settings={settings} onUpdateTask={updateTask} isLocked={locked} />;
            case 'titleGenerated':
                return <window.TitleTask video={video} settings={settings} onUpdateTask={updateTask} isLocked={locked} project={project} />;
            case 'descriptionGenerated':
                return <window.DescriptionTask video={video} settings={settings} onUpdateTask={updateTask} isLocked={locked} project={project} studioDetails={studioDetails} />;
            case 'chaptersGenerated':
                return <window.ChaptersTask video={video} settings={settings} onUpdateTask={updateTask} isLocked={locked} />;
            case 'tagsGenerated':
                return <window.TagsTask video={video} settings={settings} onUpdateTask={updateTask} isLocked={locked} project={project} />;
            case 'thumbnailsGenerated':
                return <window.ThumbnailTask video={video} settings={settings} onUpdateTask={updateTask} isLocked={locked} project={project} />;
            case 'videoUploaded':
                return <window.UploadToYouTubeTask video={video} onUpdateTask={updateTask} isLocked={locked} />;
            case 'firstCommentGenerated':
                 return <window.FirstCommentTask video={video} settings={settings} onUpdateTask={updateTask} isLocked={locked} />;
            default:
                return <p>Task component for '{task.id}' not found.</p>;
        }
    };

    return (
        <main className="flex-grow">
            <h3 className="text-2xl lg:text-3xl font-bold text-primary-accent mb-4">{video.chosenTitle || video.title}</h3>
            <div className="space-y-4">
                {taskPipeline.map((task, index) => {
                    let status = video.tasks?.[task.id] || 'pending';
                    if (task.id === 'scripting' && video.tasks?.scriptingStage && video.tasks.scriptingStage !== 'pending' && video.tasks.scriptingStage !== 'complete') {
                        status = 'in-progress';
                    } else if (task.id === 'videoEdited' && video.tasks?.videoEdited === 'in-progress') {
                        status = 'in-progress';
                    }
                    const locked = isTaskLocked(task); // Use the updated function

                    return (
                        <window.Accordion
                            key={task.id}
                            title={`${index + 1}. ${task.title}`}
                            isOpen={openTask === task.id}
                            onToggle={() => setOpenTask(openTask === task.id ? null : task.id)}
                            status={locked ? 'locked' : status}
                            isLocked={locked}
                            onRevisit={status === 'complete' ? () => handleResetTask(task.id) : null}
                            onRestart={status === 'in-progress' ? () => handleResetTask(task.id) : null}
                        >
                            {renderTaskComponent(task, index)}
                        </window.Accordion>
                    );
                })}
            </div>
        </main>
    );
});
