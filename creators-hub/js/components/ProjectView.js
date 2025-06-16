// js/components/ProjectView.js

window.ProjectView = ({ userId, project, onCloseProject, settings, googleMapsLoaded, db, auth }) => {
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
    const [showManageFootageModal, setShowManageFootageModal] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true); // State for mobile sidebar

    const appId = window.CREATOR_HUB_CONFIG.APP_ID;

    // Set localProject when the 'project' prop changes
    useEffect(() => {
        setLocalProject(project);
        setActiveVideoId(null); // Reset active video when project changes
    }, [project]);

    // Set active video to the first one if it's a single video project upon loading
    useEffect(() => {
        if (localProject && localProject.videoCount === 1 && videos.length === 1 && !activeVideoId) {
            setActiveVideoId(videos[0].id);
        }
    }, [localProject, videos, activeVideoId]);


    useEffect(() => {
        const fetchProjectAndVideos = async () => {
            const projectId = project?.id;
            // console.log("ProjectView: projectId received:", projectId);

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
            const settings = {
                geminiApiKey: window.CURRENT_USER_SETTINGS.geminiApiKey,
                knowledgeBases: window.CURRENT_USER_SETTINGS.knowledgeBases
            };
            const aiResponse = await window.aiUtils.generateScriptPlanAI({
                videoTitle: videoTitle,
                videoConcept: videoConcept,
                videoLocationsFeatured: locationsFeatured,
                projectFootageInventory: projectFootageInventory,
                whoAmI: settings.knowledgeBases?.youtube?.whoAmI,
                styleGuideText: settings.styleGuideText,
                apiKey: settings.geminiApiKey
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
    }, []);

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
        const videoRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${localProject.id}/videos`).doc(videoId);
        try {
            await videoRef.update({
                [`tasks.${taskName}`]: status,
                ...data
            });
            if (taskBeingEdited && taskBeingEdited.videoId === videoId && taskBeingEdited.taskType === taskName) {
                setTaskBeingEdited(null);
            }
        } catch (e) {
            console.error(`Failed to complete task ${taskName} for video ${videoId}:`, e);
            setError(`Failed to update task status: ${e.message}`);
        }
    }, [userId, localProject?.id, appId, taskBeingEdited, db]);

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


    return (
        <div className="p-8 flex flex-col h-screen bg-gray-900 text-white"> {/* Restored bg-gray-900 */}
            <window.ProjectHeader
                project={localProject}
                onBack={onCloseProject}
                onEdit={() => setShowEditProjectModal(true)}
                onManageFootage={() => setShowManageFootageModal(true)}
                overallProgress={overallProgress}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                hideDescription={isSingleVideoProject} // Pass prop to hide description for single video
            />

            {/* Main content area layout adjustment */}
            {/* If single video: no sidebar, full width content */}
            {/* If playlist: left sidebar and then main content + RHS sidebar */}
            <div className={`flex flex-1 overflow-hidden gap-4 ${isSingleVideoProject ? 'flex-col lg:flex-row' : ''}`}> {/* Adjusted gap for consistent spacing */}

                {/* Left Sidebar - Video List (conditionally rendered) */}
                {/* Always hidden if single video project, otherwise responsive */}
                {!isSingleVideoProject && (
                    <div className={`lg:w-1/4 ${isSidebarOpen ? 'w-full' : 'hidden'} lg:block bg-gray-800 border-r border-gray-700 overflow-y-auto custom-scrollbar rounded-lg`}>
                        <window.VideoList
                            videos={videos}
                            activeVideoId={activeVideoId}
                            onSelectVideo={(id) => setActiveVideoId(id)}
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

                {/* Main Content Area (VideoWorkspace) and RHS Sidebar (VideoDetailsSidebar) */}
                {/* This flex container now holds both the Workspace and the Details Sidebar */}
                <div className={`${isSingleVideoProject ? 'flex-1' : `flex-1 flex flex-col lg:flex-row`} gap-4 ${isSidebarOpen ? 'hidden lg:flex' : 'flex'}`}>
                    {activeVideo ? (
                        <>
                            {/* Central Task Viewer (VideoWorkspace) */}
                            <main className={`flex-grow overflow-y-auto custom-scrollbar p-4 rounded-lg glass-card ${isSingleVideoProject ? 'w-full lg:w-2/3' : ''}`}> {/* Added w-full lg:w-2/3 for single video layout */}
                                <window.VideoWorkspace
                                    video={activeVideo}
                                    settings={settings}
                                    project={localProject}
                                    userId={userId}
                                />
                            </main>

                            {/* RHS Sidebar (VideoDetailsSidebar) - Always present when activeVideo is selected */}
                            <aside className={`lg:w-1/3 flex-shrink-0 overflow-y-auto custom-scrollbar rounded-lg glass-card ${isSingleVideoProject ? 'w-full lg:w-1/3' : ''}`}> {/* Added w-full lg:w-1/3 for single video layout */}
                                <window.VideoDetailsSidebar
                                    video={activeVideo}
                                    projectLocations={localProject?.locations}
                                    projectFootageInventory={localProject?.footageInventory}
                                />
                            </aside>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center h-full glass-card rounded-lg">
                            <p className="text-gray-500 text-xl">Select a video from the left to start working!</p>
                            {videos.length === 0 && (
                                <p className="text-gray-500 mt-2">No videos in this project yet. Use the "Add Video" button in the header.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {showEditProjectModal && (
                <window.EditProjectModal
                    project={localProject}
                    onClose={() => setShowEditProjectModal(false)}
                    userId={userId}
                    settings={settings}
                    googleMapsLoaded={googleMapsLoaded}
                />
            )}

            {showVideoModal && activeVideo && (
                <window.EditVideoModal
                    video={activeVideo}
                    onClose={handleCloseVideoModal}
                    userId={userId}
                    settings={settings}
                    project={localProject}
                    googleMapsLoaded={googleMapsLoaded}
                />
            )}

            {showManageFootageModal && (
                <window.ManageFootageModal
                    project={localProject}
                    onClose={() => setShowManageFootageModal(false)}
                    userId={userId}
                    settings={settings}
                    googleMapsLoaded={googleMapsLoaded}
                    videos={videos}
                    onSaveAndSuggestConcepts={async (updatedLocations, updatedFootageInventory, videosToUpdate) => {
                        try {
                            const projectRef = db.collection(`artifacts/${appId}/users/${userId}/projects`).doc(localProject.id);
                            await projectRef.update({
                                locations: updatedLocations,
                                footageInventory: updatedFootageInventory
                            });

                            const batch = db.batch();
                            videosToUpdate.forEach(videoUpdate => {
                                const videoRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${localProject.id}/videos`).doc(videoUpdate.videoId);
                                const updatePayload = { concept: videoUpdate.newConcept };
                                if (videoUpdate.resetScriptingTask) {
                                    updatePayload['tasks.scripting'] = 'pending';
                                    updatePayload['tasks.scriptingStage'] = 'pending';
                                    updatePayload['script'] = '';
                                }
                                batch.update(videoRef, updatePayload);
                            });
                            await batch.commit();

                            console.log('Footage inventory and video concepts updated!');
                        } catch (e) {
                            console.error("Error saving footage and concepts:", e);
                            setError(`Failed to save changes: ${e.message}`);
                        }
                    }}
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
        </div>
    );
};
