// creators-hub/js/components/ProjectView/VideoWorkspace.js

// NEW: Import the ShotListViewer component
const ShotListViewer = window.ShotListViewer; 

window.VideoWorkspace = React.memo(({ video, settings, project, userId, db, allVideos, onUpdateSettings, onNavigate, studioDetails }) => {
    const { useState, useEffect, useCallback } = React;
    const { Button, Dialog, DialogContent, DialogTitle, IconButton, Box } = MaterialUI;
    const { Close: CloseIcon } = MaterialUI.Icons;

    const [openTask, setOpenTask] = useState(null);
    const [showShotList, setShowShotList] = useState(false); // NEW: State to control the Shot List modal

    const appId = window.CREATOR_HUB_CONFIG.APP_ID;
    const taskPipeline = window.CREATOR_HUB_CONFIG.TASK_PIPELINE;

    useEffect(() => {
        setOpenTask(null);
        setShowShotList(false); // Reset when video changes
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

                const payload = {
                    ...topLevelUpdates,
                    tasks: newTasksObject
                };
                
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
            case 'tagsGenerated': {
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

    const isTaskLocked = (task) => {
        if (!task.dependsOn || task.dependsOn.length === 0) {
            return false;
        }
        return !task.dependsOn.every(dependencyId => 
            video.tasks?.[dependencyId] === 'complete'
        );
    };

    const renderTaskComponent = (task, index) => {
        const locked = isTaskLocked(task);
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
            {/* NEW: Title and Shot List button container */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <h3 className="text-2xl lg:text-3xl font-bold text-primary-accent">{video.chosenTitle || video.title}</h3>
                {video.finalScript && (
                    <Button 
                        variant="contained" 
                        size="small"
                        onClick={() => setShowShotList(true)}
                        sx={{ ml: 2, backgroundColor: 'secondary.main', '&:hover': { backgroundColor: 'secondary.dark' } }}
                    >
                        View Shot List
                    </Button>
                )}
            </Box>

            <div className="space-y-4">
                {taskPipeline.map((task, index) => {
                    let status = video.tasks?.[task.id] || 'pending';
                    if (task.id === 'scripting' && video.tasks?.scriptingStage && video.tasks.scriptingStage !== 'pending' && video.tasks.scriptingStage !== 'complete') {
                        status = 'in-progress';
                    } else if (task.id === 'videoEdited' && video.tasks?.videoEdited === 'in-progress') {
                        status = 'in-progress';
                    }
                    const locked = isTaskLocked(task);

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

            {/* NEW: Modal for displaying the Shot List Viewer */}
            <Dialog 
                open={showShotList} 
                onClose={() => setShowShotList(false)} 
                fullWidth={true}
                maxWidth="lg"
            >
                <DialogTitle>
                    Shot List for: {video.chosenTitle || video.title}
                    <IconButton
                        aria-label="close"
                        onClick={() => setShowShotList(false)}
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            color: (theme) => theme.palette.grey[500],
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {/* Render the new component inside the modal */}
                    <ShotListViewer video={video} project={project} />
                </DialogContent>
            </Dialog>
        </main>
    );
});
