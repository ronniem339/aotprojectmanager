// js/components/ProjectView/VideoWorkspace.js

window.VideoWorkspace = React.memo(({ video, settings, project, userId }) => {
    const { useState, useEffect, useCallback } = React;
    const [openTask, setOpenTask] = useState(null);
    const appId = window.CREATOR_HUB_CONFIG.APP_ID;
    const taskPipeline = window.CREATOR_HUB_CONFIG.TASK_PIPELINE;

    // This effect closes any open accordion when the user selects a different video
    useEffect(() => {
        setOpenTask(null); 
    }, [video.id]);

    // A single, memoized function to update Firestore for any task
    const updateTask = useCallback(async (taskName, status, extraData = {}) => {
        const videoDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${project.id}/videos`).doc(video.id);
        const updatePayload = { [`tasks.${taskName}`]: status, ...extraData };
        await videoDocRef.update(updatePayload);
    }, [userId, project.id, video.id, appId]);

    // Determines if a task should be locked based on the completion of the previous task
    const isTaskLocked = (index) => {
        if (index === 0) return false;
        const previousTaskId = taskPipeline[index - 1].id;
        return video.tasks?.[previousTaskId] !== 'complete';
    };

    // This function decides which specialized component to render for a given task
    const renderTaskComponent = (task, index) => {
        const status = video.tasks?.[task.id] || 'pending';
        const locked = isTaskLocked(index);

        switch (task.id) {
            case 'scripting':
                return <window.ScriptingTask video={video} settings={settings} onUpdateTask={updateTask} isLocked={locked} />;
            
            case 'videoEdited':
                return <window.SimpleConfirmationTask status={status} onUpdate={() => updateTask(task.id, 'complete')} />;
            
            case 'feedbackProvided':
                 return <window.LogChangesTask video={video} onUpdateTask={updateTask} isLocked={locked} />;
            
            case 'metadataGenerated':
                return <window.MetadataTask video={video} settings={settings} onUpdateTask={updateTask} isLocked={locked} />;

            case 'thumbnailsGenerated':
                return <window.ThumbnailTask video={video} settings={settings} onUpdateTask={updateTask} isLocked={locked} />;

            case 'videoUploaded':
                return <window.SimpleConfirmationTask status={status} onUpdate={() => updateTask(task.id, 'complete')} buttonText="Mark as Uploaded" />;

            case 'firstCommentGenerated':
                 return <window.FirstCommentTask video={video} settings={settings} onUpdateTask={updateTask} isLocked={locked} />;

            default:
                return <p>Task component not found.</p>;
        }
    };

    return (
        <main className="flex-grow">
            <h3 className="text-2xl lg:text-3xl font-bold text-primary-accent mb-4">{video.chosenTitle || video.title}</h3>
            <div className="space-y-4">
                {taskPipeline.map((task, index) => {
                    const status = video.tasks?.[task.id] || 'pending';
                    const locked = isTaskLocked(index);
                    const onRevisit = () => {
                         // When revisiting, reset the task status and any relevant data.
                         // This logic can be expanded per task if needed.
                         const resetData = { 'tasks.feedbackText': '', 'metadata': '', 'tasks.firstComment': '' };
                         updateTask(task.id, 'pending', resetData);
                    };

                    return (
                        <window.Accordion
                            key={task.id}
                            title={`${index + 1}. ${task.title}`}
                            isOpen={openTask === task.id}
                            onToggle={() => setOpenTask(openTask === task.id ? null : task.id)}
                            status={locked ? 'locked' : status}
                            isLocked={locked}
                            onRevisit={status === 'complete' ? onRevisit : null}
                        >
                            {renderTaskComponent(task, index)}
                        </window.Accordion>
                    );
                })}
            </div>
        </main>
    );
});
