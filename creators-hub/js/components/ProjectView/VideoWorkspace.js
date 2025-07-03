// creators-hub/js/components/ProjectView/VideoWorkspace.js

const { useState, useEffect, useCallback } = React;
const ReactDOM = window.ReactDOM;
const ShotListViewer = window.ShotListViewer;
const AddSceneModal = window.AddSceneModal;

window.VideoWorkspace = React.memo(({ video, settings, project, userId, db, allVideos, onUpdateSettings, onNavigate, studioDetails, googleMapsLoaded }) => {
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
        setShowShotList(false);
        setRegenerationError(null);
        setStagedScenes([]);
    }, [video.id]);

    // FIXED: Refactored to handle dot notation correctly for updates.
    const updateTask = useCallback(async (taskName, status, extraData = {}) => {
        if (!db) {
            console.error("Firestore DB not available for updateTask.");
            return;
        }
        const videoDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${project.id}/videos`).doc(video.id);

        try {
            // Build a flat payload object with dot notation for nested fields.
            const payload = {};
            payload[`tasks.${taskName}`] = status; // e.g., 'tasks.scripting': 'pending'

            for (const key in extraData) {
                if (Object.prototype.hasOwnProperty.call(extraData, key)) {
                    payload[key] = extraData[key];
                }
            }
            // The payload will now be flat, e.g., { 'tasks.shotList': FieldValue.delete(), ... }
            // which is the correct format for Firestore updates.
            
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
                    'tasks.shotList': firebase.firestore.FieldValue.delete() // This will now work correctly
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
        if (!video.script) {
            setRegenerationError("Cannot regenerate shot list without a script.");
            return;
        }
        setIsRegenerating(true);
        setRegenerationError(null);
        try {
            const options = {
                script: video.script,
                videoTitle: video.chosenTitle || video.title,
                videoConcept: video.concept,
                onCameraDescriptions: video.tasks?.onCameraDescriptions || {},
                footageInventory: project.footageInventory || {},
                settings
            };
            
            const { shotList: newShotList } = await window.aiUtils.generateShotListFromScriptAI(options);

            const enrichedShotList = newShotList.map(shot => {
                const availableFootage = { bRoll: false, onCamera: false, drone: false };
                if (shot.shotType === 'On-Camera') {
                    availableFootage.onCamera = true;
                } 
                if (shot.shotType === 'Voiceover' && shot.location) {
                    const inventoryItem = Object.values(project.footageInventory || {}).find(inv => inv.name === shot.location);
                    if (inventoryItem) {
                        availableFootage.bRoll = !!inventoryItem.bRoll;
                        availableFootage.drone = !!inventoryItem.drone;
                    }
                }
                return { ...shot, availableFootage };
            });

            await updateTask('scripting', 'in-progress', { 'tasks.shotList': enrichedShotList });

        } catch (e) {
            console.error("Failed to regenerate shot list:", e);
            setRegenerationError(e.message || "An unknown error occurred during regeneration.");
        } finally {
            setIsRegenerating(false);
        }
    };
    
    const handleStageScene = async (sceneData) => {
        setIsRegenerating(true);
        try {
            const { newLocation, onCameraDialogue, integrationNote } = sceneData;
            const previousSceneContext = video.tasks?.shotList?.slice(-1)[0]?.dialogue || 'the video has just started';

            const newSceneShots = await window.aiUtils.generateSceneSnippetAI({
                newLocation,
                onCameraDialogue,
                integrationNote,
                previousSceneContext,
                settings,
            });

            setStagedScenes(prev => [...prev, { id: Date.now(), shots: newSceneShots }]);
        } catch (error) {
            console.error("Error staging scene:", error);
            setRegenerationError("Failed to generate the new scene. Please try again.");
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleIntegrateScene = async (scene, insertAtIndex) => {
        const currentShotList = video.tasks?.shotList || [];
        const newShotList = [...currentShotList];
        
        newShotList.splice(insertAtIndex, 0, ...scene.shots);

        await updateTask('scripting', 'in-progress', { 'tasks.shotList': newShotList });
        
        setStagedScenes(prev => prev.filter(s => s.id !== scene.id));
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
                            {isRegenerating && <div className="absolute inset-0 bg-gray-900/50 flex justify-center items-center z-50"><window.LoadingSpinner /></div>}
                            {regenerationError && <div className="text-red-400 p-3 bg-red-900/40 rounded-md mb-4">Error: {regenerationError}</div>}
                            <ShotListViewer 
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
                <AddSceneModal
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
