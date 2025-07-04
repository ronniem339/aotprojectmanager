// js/components/ProjectView.js

window.ProjectView = ({ userId, project, onCloseProject, settings, onUpdateSettings, googleMapsLoaded, db, auth, firebaseAppInstance, onNavigate }) => {
    const { useState, useEffect, useCallback, useMemo } = React;

    // Core State
    const [localProject, setLocalProject] = useState(null);
    const [videos, setVideos] = useState([]);
    const [activeVideoId, setActiveVideoId] = useState(null);
    
    // UI/Loading State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(window.innerWidth >= 768);
    const [isRightSidebarVisible, setIsRightSidebarVisible] = useState(false);
    const [isTabletOrLarger, setIsTabletOrLarger] = useState(window.innerWidth >= 768);

    // Modal State
    const [showEditProjectModal, setShowEditProjectModal] = useState(false);
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [showScriptPlanModal, setShowScriptPlanModal] = useState(false);
    const [scriptPlanData, setScriptPlanData] = useState(null);
    const [taskBeingEdited, setTaskBeingEdited] = useState(null);
    const [showNewVideoWizard, setShowNewVideoWizard] = useState(false);

    const appId = window.CREATOR_HUB_CONFIG.APP_ID;

    // --- DERIVED STATE ---

    const isSingleVideoProject = useMemo(() => localProject?.videoCount === 1, [localProject]);
    const activeVideo = useMemo(() => videos.find(v => v.id === activeVideoId), [videos, activeVideoId]);
    
    const overallProgress = useMemo(() => {
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

    // --- EFFECTS ---

    // Initialize local project state from props
    useEffect(() => {
        setLocalProject(project);
        setActiveVideoId(null); 
    }, [project]);

    // Auto-select the first video in single-video projects
    useEffect(() => {
        if (isSingleVideoProject && videos.length === 1 && !activeVideoId) {
            setActiveVideoId(videos[0].id);
        }
    }, [isSingleVideoProject, videos, activeVideoId]);

    // Listener for screen size changes to adapt layout
    useEffect(() => {
        const handleResize = () => setIsTabletOrLarger(window.innerWidth >= 768);
        window.addEventListener('resize', handleResize);
        handleResize(); // Initial check
        return () => window.removeEventListener('resize', handleResize);
    }, []);


    // Fetch all project and video data from Firestore
    useEffect(() => {
        if (!db || !auth || !userId || !project?.id) {
            setLoading(false);
            setError("Project ID, User ID, or Firebase instances are missing.");
            return;
        }

        let isMounted = true;
        setLoading(true);

        const projectRef = db.collection(`artifacts/${appId}/users/${userId}/projects`).doc(project.id);
        const videoCollectionRef = projectRef.collection('videos');

        projectRef.update({
            lastAccessed: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(err => console.error("Error updating lastAccessed:", err));

        const unsubscribeProject = projectRef.onSnapshot(docSnap => {
            if (!isMounted) return;
            if (docSnap.exists) {
                setLocalProject({ id: docSnap.id, ...docSnap.data() });
            } else {
                setError("Project not found.");
                setLocalProject(null);
            }
            setLoading(false);
        }, err => {
            if (!isMounted) return;
            console.error("Error fetching project:", err);
            setError("Failed to load project data.");
            setLoading(false);
        });

        const unsubscribeVideos = videoCollectionRef.orderBy('order').onSnapshot(snapshot => {
            if (!isMounted) return;
            const videosData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setVideos(videosData);
        }, err => {
            if (!isMounted) return;
            console.error("Error fetching videos:", err);
            setError("Failed to load video data.");
        });

        return () => {
            isMounted = false;
            unsubscribeProject();
            unsubscribeVideos();
        };
    }, [userId, project?.id, appId, db, auth]);


    // --- CALLBACKS & HANDLERS ---

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
    
    // *** THIS IS THE CORRECTED FUNCTION ***
    const handleVideoSelected = useCallback((videoId) => {
        setActiveVideoId(videoId); // It now correctly accepts the video ID string.
        if(!isTabletOrLarger) {
            setIsLeftSidebarOpen(false); // Close mobile sidebar on selection
        }
    }, [isTabletOrLarger]);

    const handleCloseVideoModal = useCallback(() => {
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

    const handleTaskCompletion = useCallback(async (taskName, status, data = {}) => {
        if (!db || !localProject?.id || !activeVideo?.id) return;

        const videoId = activeVideo.id;
        const updatePayload = { [`tasks.${taskName}`]: status, ...data };

        try {
            const videoRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${localProject.id}/videos`).doc(videoId);
            await videoRef.update(updatePayload);
            if (taskBeingEdited?.videoId === videoId && taskBeingEdited?.taskType === taskName) {
                setTaskBeingEdited(null);
            }
        } catch (e) {
            console.error(`Failed to complete task ${taskName} for video ${videoId}:`, e);
            setError(`Failed to update task status: ${e.message}`);
        }
    }, [userId, localProject?.id, appId, taskBeingEdited, db, activeVideo]);

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
    
    const handleDeleteVideo = async (videoToDelete) => {
        if (!videoToDelete) return;
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
    };

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

    // --- RENDER LOGIC ---

    if (loading && !localProject) {
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

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-white p-4 sm:p-6 md:p-8">
            <window.ProjectHeader
                project={localProject}
                onBack={onCloseProject}
                onEdit={handleEditClick}
                overallProgress={overallProgress}
                onToggleSidebar={() => setIsLeftSidebarOpen(o => !o)}
                hideDescription={isSingleVideoProject}
                onAddVideo={() => setShowNewVideoWizard(true)}
                isRightSidebarVisible={isRightSidebarVisible}
                onToggleRightSidebar={() => setIsRightSidebarVisible(v => !v)}
                isSingleVideoProject={isSingleVideoProject}
            />

            <div className="flex flex-1 mt-4 overflow-hidden gap-4 md:gap-6">

                {/* Left Sidebar: Video List */}
                {!isSingleVideoProject && (
                    <aside className={`
                        ${isLeftSidebarOpen ? 'block' : 'hidden'}
                        ${!activeVideo ? 'w-full' : 'md:w-2/5 lg:w-1/3 xl:w-1/4'}
                        absolute md:static inset-0 md:inset-auto
                        bg-gray-900 md:bg-transparent z-20 md:z-auto
                        p-4 md:p-0
                        h-full flex-shrink-0
                        transition-all duration-300 ease-in-out
                    `}>
                        <div className="bg-gray-800 border border-gray-700 rounded-lg h-full flex flex-col">
                            <window.VideoList
                                videos={videos}
                                activeVideoId={activeVideoId}
                                onSelectVideo={handleVideoSelected}
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
                                onDeleteVideo={handleDeleteVideo}
                            />
                        </div>
                    </aside>
                )}

                {/* Main Content Area: Workspace + Details */}
                <div className={`
                    flex-1 flex flex-col md:flex-row gap-4 md:gap-6 overflow-hidden
                    ${!activeVideo && !isSingleVideoProject ? 'hidden' : ''}
                `}>
                    {activeVideo ? (
                        <>
                            {/* Workspace */}
                            <main className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 rounded-lg glass-card h-full">
                                <window.VideoWorkspace
                                    key={activeVideo.id}
                                    video={activeVideo}
                                    settings={settings}
                                    onUpdateTask={handleTaskCompletion}
                                    project={localProject}
                                    userId={userId}
                                    db={db}
                                    allVideos={videos} 
                                    onNavigate={onNavigate}
                                    googleMapsLoaded={googleMapsLoaded}
                                />
                            </main>

                            {/* Right Details Sidebar */}
                            {isRightSidebarVisible && (
                                <aside className="w-full mt-4 md:mt-0 md:w-1/2 lg:w-2/5 xl:w-1/3 flex-shrink-0 overflow-y-auto custom-scrollbar p-4 md:p-6 rounded-lg glass-card h-full">
                                    <window.VideoDetailsSidebar
                                        video={activeVideo}
                                        projectLocations={localProject?.locations}
                                        projectFootageInventory={localProject?.footageInventory}
                                    />
                                </aside>
                            )}
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center h-full glass-card rounded-lg">
                            <p className="text-gray-500 text-xl">
                                { !isSingleVideoProject ? "Select a video from the left to start working." : "Loading video..."}
                            </p>
                            {videos.length === 0 && !loading && (
                                <p className="text-gray-500 mt-2">No videos in this project yet. Click "Add Video" above to create one.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            {/* --- MODALS --- */}
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
