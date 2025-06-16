// js/components/ProjectView/VideoWorkspace.js

window.VideoWorkspace = React.memo(({ video, settings, project, userId, db }) => {
    const { useState, useEffect, useCallback } = React;
    const [openTask, setOpenTask] = useState(null);
    const appId = window.CREATOR_HUB_CONFIG.APP_ID;
    const taskPipeline = window.CREATOR_HUB_CONFIG.TASK_PIPELINE;

    const [showShortsIdeasModal, setShowShortsIdeasModal] = useState(false);

    useEffect(() => {
        setOpenTask(null); 
    }, [video.id]);

    const updateTask = useCallback(async (taskName, status, extraData = {}) => {
        if (!db) {
            console.error("Firestore DB not available for updateTask.");
            return;
        }
        const videoDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${project.id}/videos`).doc(video.id);
        const payload = { [`tasks.${taskName}`]: status, ...extraData };
        await videoDocRef.update(payload);
    }, [userId, project.id, video.id, appId, db]);

    // Renamed from handleRevisit to handleResetTask as it's now used for restarting too
    const handleResetTask = useCallback(async (taskId) => {
        let dataToReset = {};
        // Define the data fields to clear for each task
        switch (taskId) {
            case 'scripting':
                // Reset all scripting-related fields in Firestore
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
            case 'tagsGenerated':
                 dataToReset = { metadata: JSON.stringify({ ...(JSON.parse(video.metadata || '{}')), tags: '' }) };
                 break;
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


    const isTaskLocked = (index) => {
        if (index === 0) return false;
        const previousTaskId = taskPipeline[index - 1].id;
        return video.tasks?.[previousTaskId] !== 'complete';
    };

    const renderTaskComponent = (task, index) => {
        const status = video.tasks?.[task.id] || 'pending';
        const locked = isTaskLocked(index);

        switch (task.id) {
            case 'scripting':
                // FIX: Pass the 'db' prop down to the ScriptingTask component
                return <window.ScriptingTask video={video} settings={settings} onUpdateTask={updateTask} isLocked={locked} project={project} userId={userId} db={db} />;
            case 'videoEdited':
                return <window.EditVideoTask video={video} settings={settings} onUpdateTask={updateTask} isLocked={locked} />;
            case 'titleGenerated':
                return <window.TitleTask video={video} settings={settings} onUpdateTask={updateTask} isLocked={locked} />;
            case 'descriptionGenerated':
                return <window.DescriptionTask video={video} settings={settings} onUpdateTask={updateTask} isLocked={locked} />;
            case 'chaptersGenerated':
                return <window.ChaptersTask video={video} onUpdateTask={updateTask} isLocked={locked} />;
            case 'tagsGenerated':
                return <window.TagsTask video={video} settings={settings} onUpdateTask={updateTask} isLocked={locked} />;
            case 'thumbnailsGenerated':
                return <window.ThumbnailTask video={video} settings={settings} onUpdateTask={updateTask} isLocked={locked} />;
            case 'videoUploaded':
                return <window.UploadToYouTubeTask video={video} onUpdateTask={updateTask} isLocked={locked} />;
            case 'firstCommentGenerated':
                 return <window.FirstCommentTask video={video} settings={settings} onUpdateTask={updateTask} isLocked={locked} />;
            default:
                return <p>Task component for '{task.id}' not found.</p>;
        }
    };

    const handleSaveShortsIdea = useCallback(async (newIdea) => {
        if (!db) {
            console.error("Firestore DB not available for handleSaveShortsIdea.");
            return;
        }
        const videoDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${project.id}/videos`).doc(video.id);
        const currentShorts = video.shortsIdeas || [];
        const updatedShorts = [...currentShorts, newIdea];
        await videoDocRef.update({ shortsIdeas: updatedShorts });
    }, [userId, project.id, video.id, appId, db, video.shortsIdeas]);

    const handleDeleteShortsIdea = useCallback(async (ideaId) => {
        if (!db) {
            console.error("Firestore DB not available for handleDeleteShortsIdea.");
            return;
        }
        const videoDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${project.id}/videos`).doc(video.id);
        const currentShorts = video.shortsIdeas || [];
        const updatedShorts = currentShorts.filter(idea => idea.id !== ideaId);
        await videoDocRef.update({ shortsIdeas: updatedShorts });
    }, [userId, project.id, video.id, appId, db, video.shortsIdeas]);

    const handleGenerateShortsMetadata = useCallback(async (ideaId, metadata) => {
        if (!db) {
            console.error("Firestore DB not available for handleGenerateShortsMetadata.");
            return;
        }
        const videoDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${project.id}/videos`).doc(video.id);
        const currentShorts = video.shortsIdeas || [];
        const updatedShorts = currentShorts.map(idea => 
            idea.id === ideaId ? { ...idea, metadata: metadata } : idea
        );
        await videoDocRef.update({ shortsIdeas: updatedShorts });
    }, [userId, project.id, video.id, appId, db, video.shortsIdeas]);


    return (
        <main className="flex-grow">
            <h3 className="text-2xl lg:text-3xl font-bold text-primary-accent mb-4">{video.chosenTitle || video.title}</h3>
            <div className="mb-6">
                <button onClick={() => setShowShortsIdeasModal(true)} className="w-full px-5 py-2.5 bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold flex items-center justify-center gap-2">
                    💡 Generate Shorts Ideas
                </button>
            </div>
            <div className="space-y-4">
                {taskPipeline.map((task, index) => {
                    let status = video.tasks?.[task.id] || 'pending';
                    if (task.id === 'scripting' && video.tasks?.scriptingStage && video.tasks.scriptingStage !== 'pending' && video.tasks.scriptingStage !== 'complete') {
                        status = 'in-progress';
                    } else if (task.id === 'videoEdited' && video.tasks?.videoEdited === 'in-progress') {
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
                            onRevisit={status === 'complete' ? () => handleResetTask(task.id) : null}
                            onRestart={status === 'in-progress' ? () => handleResetTask(task.id) : null}
                        >
                            {renderTaskComponent(task, index)}
                        </window.Accordion>
                    );
                })}
            </div>
            {showShortsIdeasModal && db && (
                <window.ShortsIdeasToolModal
                    video={video}
                    project={project}
                    settings={settings}
                    onClose={() => setShowShortsIdeasModal(false)}
                    onSaveShortsIdea={handleSaveShortsIdea} 
                    onDeleteShortsIdea={handleDeleteShortsIdea} 
                    onGenerateShortsMetadata={handleGenerateShortsMetadata} 
                />
            )}
        </main>
    );
});
