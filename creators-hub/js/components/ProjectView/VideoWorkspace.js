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
        const payload = { [`tasks.${taskName}`]: status, ...extraData };
        await videoDocRef.update(payload);
    }, [userId, project.id, video.id, appId]);

    /**
     * Handles the logic for revisiting a completed task. It identifies which
     * data fields need to be cleared for that specific task and updates Firestore.
     * @param {string} taskId - The ID of the task to revisit (e.g., 'scripting').
     */
    const handleRevisit = (taskId) => {
        let dataToReset = {};
        // Use a switch statement for clear, task-specific reset logic
        switch (taskId) {
            case 'scripting':
                dataToReset = { script: '' };
                break;
            case 'videoEdited': // Updated revisit logic for the combined task
                dataToReset = { 
                    'tasks.feedbackText': '',
                    'tasks.musicTrack': ''
                 };
                break;
            case 'metadataGenerated':
                dataToReset = {
                    metadata: '',
                    chosenTitle: '',
                    chapters: [],
                    'tasks.rejectedTitles': [],
                    'tasks.descriptionAccepted': false,
                    'tasks.chaptersFinalized': false
                };
                break;
            case 'thumbnailsGenerated':
                dataToReset = {
                    'tasks.thumbnailConcepts': [],
                    'tasks.acceptedConcepts': [],
                    'tasks.rejectedConcepts': [],
                    'tasks.currentConceptIndex': 0
                };
                break;
            case 'firstCommentGenerated':
                dataToReset = { 'tasks.firstComment': '' };
                break;
            default:
                break;
        }
        // Update the task status to 'pending' and clear the relevant data
        updateTask(taskId, 'pending', dataToReset);
    };

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
            case 'videoEdited': // Render the new EditVideoTask component
                return <window.EditVideoTask video={video} onUpdateTask={updateTask} isLocked={locked} />;
            // The 'feedbackProvided' case is now removed.
            case 'metadataGenerated':
                return <window.MetadataTask video={video} settings={settings} onUpdateTask={updateTask} isLocked={locked} />;
            case 'thumbnailsGenerated':
                return <window.ThumbnailTask video={video} settings={settings} onUpdateTask={updateTask} isLocked={locked} />;
            case 'videoUploaded':
                return <window.SimpleConfirmationTask status={status} onUpdate={() => updateTask(task.id, 'complete')} buttonText="Mark as Uploaded" />;
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
                    // The Accordion needs to know about the 'in-progress' state
                    if (task.id === 'videoEdited' && video.tasks?.videoEdited === 'in-progress') {
                        status = 'in-progress';
                    }
                    const locked = isTaskLocked(index);
                    
                    return (
                        <window.Accordion
                            key={task.id}
                            title={`${index + 1}. ${task.title}`}
                            isOpen={openTask === task.id}
                            onToggle={() => setOpenTask(openTask === task.id ? null : task.id)}
                            status={locked ? 'locked' : status}
                            isLocked={locked}
                            onRevisit={status === 'complete' ? () => handleRevisit(task.id) : null}
                        >
                            {renderTaskComponent(task, index)}
                        </window.Accordion>
                    );
                })}
            </div>
        </main>
    );
});
