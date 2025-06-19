// js/components/ProjectView.js

window.ProjectView = ({ userId, project, onCloseProject, settings, googleMapsLoaded, db, auth, firebaseAppInstance }) => {
    const { useState, useEffect, useCallback } = React;
    const [localProject, setLocalProject] = useState(null);
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeVideoId, setActiveVideoId] = useState(null);
    const [showEditProjectModal, setShowEditProjectModal] = useState(false);
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [showScriptPlanModal, setShowScriptPlanModal] = useState(false);
    const [scriptPlanData, setScriptPlanData] = useState(null);
    const [taskBeingEdited, setTaskBeingEdited] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showNewVideoWizard, setShowNewVideoWizard] = useState(false);

    const appId = window.CREATOR_HUB_CONFIG.APP_ID;

    useEffect(() => {
        setLocalProject(project);
        setActiveVideoId(null); 
    }, [project]);

    useEffect(() => {
        if (localProject && localProject.videoCount === 1 && videos.length === 1 && !activeVideoId) {
            setActiveVideoId(videos[0].id);
        }
    }, [localProject, videos, activeVideoId]);


    useEffect(() => {
        const fetchProjectAndVideos = async () => {
            const projectId = project?.id;

            if (!db || !auth || !userId || !projectId) {
                setLoading(false);
                setError("Project ID, User ID, or Firebase instances are missing.");
                return;
            }

            try {
                if (!auth.currentUser) {
                    setError("User not authenticated for project data access. Please log in.");
                    setLoading(false);
                    return;
                }

                const projectRef = db.collection(`artifacts/${appId}/users/${userId}/projects`).doc(projectId);
                const videoCollectionRef = projectRef.collection('videos');

                await projectRef.update({
                    lastAccessed: firebase.firestore.FieldValue.serverTimestamp()
                }).catch(err => console.error("Error updating lastAccessed:", err));


                const unsubscribeProject = projectRef.onSnapshot(docSnap => {
                    if (docSnap.exists) {
                        setLocalProject({ id: docSnap.id, ...docSnap.data() });
                    } else {
                        setError("Project not found.");
                        setLocalProject(null);
                    }
                    setLoading(false);
                }, err => {
                    console.error("Error fetching project:", err);
                    setError("Failed to load project data.");
                    setLoading(false);
                });

                const unsubscribeVideos = videoCollectionRef.orderBy('order').onSnapshot(snapshot => {
                    const videosData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setVideos(videosData);
                }, err => {
                    console.error("Error fetching videos:", err);
                    setError("Failed to load video data.");
                });

                return () => {
                    unsubscribeProject();
                    unsubscribeVideos();
                };

            } catch (err) {
                console.error("Firebase Fetch Error:", err);
                setError(`Data fetch failed: ${err.message}`);
                setLoading(false);
            }
        };

        if (db && auth && userId && project?.id) {
            fetchProjectAndVideos();
        } else {
            setLoading(false);
        }
    }, [userId, project?.id, appId, db, auth]);

    const handleEditProject = useCallback(async (updatedFields) => {
        if (!localProject || !db) return;
        setLoading(true);
        try {
            await db.collection(`artifacts/${appId}/users/${userId}/projects`).doc(localProject.id).update(updatedFields);
            setShowEditProjectModal(false);
        } catch (e) {
            setError(`Failed to update project: ${e.message}`);
        } finally {
            setLoading(false);
        }
    }, [localProject, userId, appId, db]);

    const handleVideoSelected = useCallback((video) => {
        setActiveVideoId(video.id);
    }, []);

    const handleCloseVideoModal = useCallback(() => {
        setActiveVideoId(null);
        setShowVideoModal(false);
    }, []);

    const updateVideo = useCallback(async (videoId, updates) => {
        if (!db || !localProject?.id) return;
        const videoRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${localProject.id}/videos`).doc(videoId);
        try {
            await videoRef.update(updates);
        } catch (e) {
            console.error(`Failed to update video ${videoId}:`, e);
            setError(`Failed to update video: ${e.message}`);
        }
    }, [userId, localProject?.id, appId, db]);

    const handleGenerateScriptPlan = useCallback(async (videoId, videoTitle, videoConcept, locationsFeatured, projectFootageInventory) => {
        setLoading(true);
        setError(null);
        try {
            const aiResponse = await window.aiUtils.generateScriptPlanAI({
                videoTitle: videoTitle,
                videoConcept: videoConcept,
                videoLocationsFeatured: locationsFeatured,
                projectFootageInventory: projectFootageInventory,
                settings: settings 
            });

            setScriptPlanData({
                videoId: videoId,
                scriptPlan: aiResponse.scriptPlan,
                locationQuestions: aiResponse.locationQuestions
            });
            setShowScriptPlanModal(true);
            setTaskBeingEdited({ videoId: videoId, taskType: 'scripting' });

        } catch (e) {
            console.error("Error generating script plan:", e);
            setError(`Failed to generate script plan: ${e.message}`);
        } finally {
            setLoading(false);
        }
    }, [settings]);

    const handleSaveLocationExperiences = useCallback(async (videoId, experiences) => {
        setLoading(true);
        setError(null);
        try {
            await updateVideo(videoId, {
                scriptPlan: scriptPlanData.scriptPlan,
                locationQuestions: scriptPlanData.locationQuestions,
                locationExperiences: experiences,
                scriptingTaskStatus: 'user_input_collected',
            });
            setShowScriptPlanModal(false);
            setScriptPlanData(null);
            setTaskBeingEdited(null);
        } catch (e) {
            console.error("Error saving location experiences:", e);
            setError(`Failed to save experiences: ${e.message}`);
        } finally {
            setLoading(false);
        }
    }, [updateVideo, scriptPlanData]);

    const handleTaskCompletion = useCallback(async (videoId, taskName, status, data = {}) => {
        if (!db || !localProject?.id) return;

        const updatePayload = { [`tasks.${taskName}`]: status, ...data };

        // --- START: Optimistic UI Update ---
        setVideos(currentVideos => currentVideos.map(v => {
            if (v.id === videoId) {
                const newTasks = { ...v.tasks, ...data };
                newTasks[taskName] = status;
                return { ...v, tasks: newTasks };
            }
            return v;
        }));
        // --- END: Optimistic UI Update ---

        try {
            const videoRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${localProject.id}/videos`).doc(videoId);
            await videoRef.update(updatePayload);
            if (taskBeingEdited && taskBeingEdited.videoId === videoId && taskBeingEdited.taskType === taskName) {
                setTaskBeingEdited(null);
            }
        } catch (e) {
            console.error(`Failed to complete task ${taskName} for video ${videoId}:`, e);
            setError(`Failed to update task status: ${e.message}`);
            // Optionally revert state here if the update fails
        }
    }, [userId, localProject?.id, appId, taskBeingEdited, db]);

    const handleSaveNewVideo = useCallback(async (newVideoData) => {
        setLoading(true);
        setError(null);
        try {
            if (!db || !localProject?.id) {
                throw new Error("Database or project information is missing.");
            }

            const videosCollectionRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${localProject.id}/videos`);
            
            await videosCollectionRef.add({
                ...newVideoData,
                order: videos.length,
                createdAt: new Date().toISOString(),
                tasks: newVideoData.tasks || { scripting: 'pending' }, 
            });

            const projectRef = db.collection(`artifacts/${appId}/users/${userId}/projects`).doc(localProject.id);
            await projectRef.update({
                videoCount: firebase.firestore.FieldValue.increment(1)
            });

            setShowNewVideoWizard(false);
        } catch (e) {
            console.error("Error saving new video:", e);
            setError(`Failed to add new video: ${e.message}`);
        } finally {
            setLoading(false);
        }
    }, [db, localProject, videos.length, userId, appId]);


    const overallProgress = React.useMemo(() => {
        if (!videos.length || !window.CREATOR_HUB_CONFIG.TASK_PIPELINE.length) {
            return 0;
        }
        let totalCompletedTasks = 0;
        videos.forEach(video => {
            window.CREATOR_HUB_CONFIG.TASK_PIPELINE.forEach(task => {
                if (video.tasks?.[task.id] === 'complete') {
                    totalCompletedTasks++;
                }
            });
        });
        const maxPossibleTasks = videos.length * window.CREATOR_HUB_CONFIG.TASK_PIPELINE.length;
        return (maxPossibleTasks > 0) ? (totalCompletedTasks / maxPossibleTasks) * 100 : 0;
    }, [videos]);


    if (loading) {
        return (
            <div className="fixed inset-0 bg-gray-900 text-white flex items-center justify-center">
                <window.LoadingSpinner /> <span className="ml-2">Loading project...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="fixed inset-0 bg-gray-900 text-white flex flex-col items-center justify-center p-4">
                <p className="text-red-400 text-lg">{error}</p>
                <button onClick={onCloseProject} className="mt-4 px-6 py-2 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold">
                    Go Back to Dashboard
                </button>
            </div>
        );
    }

    if (!localProject) {
        return (
            <div className="fixed inset-0 bg-gray-900 text-white flex flex-col items-center justify-center p-4">
                <p className="text-red-400 text-lg">Project not found or an error occurred.</p>
                <button onClick={onCloseProject} className="mt-4 px-6 py-2 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold">
                    Go Back to Dashboard
                </button>
            </div>
        );
    }

    const isSingleVideoProject = localProject.videoCount === 1;
    const activeVideo = isSingleVideoProject ? videos[0] : videos.find(v => v.id === activeVideoId);
    
    const handleEditClick = () => {
        if (isSingleVideoProject) {
            if (videos.length > 0) {
                setActiveVideoId(videos[0].id);
                setShowVideoModal(true);
            }
        } else {
            setShowEditProjectModal(true);
        }
    };


    return (
        <div className="p-4 sm:p-8 flex flex-col h-screen bg-gray-900 text-white">
            <window.ProjectHeader
                project={localProject}
                onBack={onCloseProject}
                onEdit={handleEditClick}
                overallProgress={overallProgress}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                hideDescription={isSingleVideoProject}
                onAddVideo={() => setShowNewVideoWizard(true)}
            />

            <div className={`flex flex-1 overflow-hidden gap-4 ${isSingleVideoProject ? 'flex-col lg:flex-row' : ''}`}>

                {!isSingleVideoProject && (
                    <div className={`lg:w-1/4 flex-shrink-0 bg-gray-800 border-r border-gray-700 overflow-y-auto custom-scrollbar rounded-lg ${isSidebarOpen ? 'block' : 'hidden'} lg:block`}>
                        <window.VideoList
                            videos={videos}
                            activeVideoId={activeVideoId}
                            onSelectVideo={(id) => {
                                setActiveVideoId(id);
                                setIsSidebarOpen(false);
                            }}
                            onEditVideo={(videoToEdit) => {
                                setActiveVideoId(videoToEdit.id);
                                setShowVideoModal(true);
                            }}
                            onReorder={async (dragged, target) => {
                                const newOrder = [...videos];
                                const draggedIndex = newOrder.findIndex(v => v.id === dragged.id);
                                const targetIndex = newOrder.findIndex(v => v.id === target.id);
                                const [removed] = newOrder.splice(draggedIndex, 1);
                                newOrder.splice(targetIndex, 0, removed);
                                const batch = db.batch();
                                newOrder.forEach((video, index) => {
                                    const videoRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${localProject.id}/videos`).doc(video.id);
                                    batch.update(videoRef, { order: index });
                                });
                                await batch.commit();
                            }}
                            onDeleteVideo={async (videoToDelete) => {
                                if (window.confirm(`Are you sure you want to delete video "${videoToDelete.chosenTitle || videoToDelete.title}"? This cannot be undone.`)) {
                                    try {
                                        await db.collection(`artifacts/${appId}/users/${userId}/projects/${localProject.id}/videos`).doc(videoToDelete.id).delete();
                                        const projectRef = db.collection(`artifacts/${appId}/users/${userId}/projects`).doc(localProject.id);
                                        await projectRef.update({
                                            videoCount: firebase.firestore.FieldValue.increment(-1)
                                        });
                                        if (activeVideoId === videoToDelete.id) {
                                            setActiveVideoId(null);
                                        }
                                    } catch (e) {
                                        console.error("Error deleting video:", e);
                                        setError(`Failed to delete video: ${e.message}`);
                                    }
                                }
                            }}
                        />
                    </div>
                )}

                <div className={`flex-1 flex flex-col lg:flex-row gap-4 ${isSidebarOpen && !isSingleVideoProject ? 'hidden' : 'flex'} lg:flex`}>
                    {activeVideo ? (
                        <>
                            <main className={`flex-grow overflow-y-auto custom-scrollbar p-4 rounded-lg glass-card ${isSingleVideoProject ? 'w-full lg:w-2/3' : ''}`}>
                                <window.VideoWorkspace
                                    video={activeVideo}
                                    settings={settings}
                                    onUpdateTask={handleTaskCompletion}
                                    project={localProject}
                                    userId={userId}
                                    db={db}
                                />
                            </main>
                            <aside className={`lg:w-1/3 flex-shrink-0 overflow-y-auto custom-scrollbar rounded-lg glass-card ${isSingleVideoProject ? 'w-full lg:w-1/3' : 'hidden lg:block'}`}>
                                <window.VideoDetailsSidebar
                                    video={activeVideo}
                                    projectLocations={localProject?.locations}
                                    projectFootageInventory={localProject?.footageInventory}
                                />
                            </aside>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center h-full glass-card rounded-lg">
                            <p className="text-gray-500 text-xl">
                                { !isSingleVideoProject ? "Select a video from the left to start working!" : "Loading video..."}
                            </p>
                            {videos.length === 0 && (
                                <p className="text-gray-500 mt-2">No videos in this project yet. Click "Add Video" above to create one.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {showEditProjectModal && (
                <window.EditProjectModal
                    project={localProject}
                    videos={videos}
                    onClose={() => setShowEditProjectModal(false)}
                    userId={userId}
                    settings={settings}
                    googleMapsLoaded={googleMapsLoaded}
                    firebaseAppInstance={firebaseAppInstance}
                    db={db}
                />
            )}

            {showVideoModal && activeVideo && (
                <window.EditVideoModal
                    video={activeVideo}
                    onClose={handleCloseVideoModal}
                    onSave={handleCloseVideoModal}
                    userId={userId}
                    settings={settings}
                    project={localProject}
                    allVideos={videos}
                    googleMapsLoaded={googleMapsLoaded}
                    db={db}
                />
            )}

            {showScriptPlanModal && scriptPlanData && (
                <window.ScriptPlanModal
                    scriptPlan={scriptPlanData.scriptPlan}
                    locationQuestions={scriptPlanData.locationQuestions}
                    initialLocationExperiences={activeVideo?.locationExperiences || {}}
                    onClose={() => setShowScriptPlanModal(false)}
                    onSaveExperiences={(experiences) => handleSaveLocationExperiences(scriptPlanData.videoId, experiences)}
                />
            )}

            {showNewVideoWizard && (
                <window.NewVideoWizardModal
                    onClose={() => setShowNewVideoWizard(false)}
                    onSave={handleSaveNewVideo}
                    settings={settings}
                    googleMapsLoaded={googleMapsLoaded}
                    projectLocations={localProject?.locations || []}
                />
            )}
        </div>
    );
};
