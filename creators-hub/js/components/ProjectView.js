// js/components/ProjectView.js

window.ProjectView = ({ userId, project, onCloseProject, settings, googleMapsLoaded, db, auth }) => { // Accept 'project' instead of 'projectId'
    const { useState, useEffect, useCallback } = React;
    const [localProject, setLocalProject] = useState(null); // Use local state for project
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

    const appId = window.CREATOR_HUB_CONFIG.APP_ID;

    // Set localProject when the 'project' prop changes
    useEffect(() => {
        setLocalProject(project);
        setActiveVideoId(null); // Reset active video when project changes
    }, [project]);

    useEffect(() => {
        const fetchProjectAndVideos = async () => {
            const projectId = project?.id; // Get projectId from the 'project' prop
            console.log("ProjectView: projectId received:", projectId); // Debugging log

            // Ensure db, auth, userId, and projectId are present before proceeding
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

                // Real-time listener for project data
                const unsubscribeProject = projectRef.onSnapshot(docSnap => {
                    if (docSnap.exists) {
                        setLocalProject({ id: docSnap.id, ...docSnap.data() }); // Update localProject state
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

                // Real-time listener for videos collection
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

        // Only call fetchProjectAndVideos if all necessary props are available and project.id is valid
        if (db && auth && userId && project?.id) {
            fetchProjectAndVideos();
        } else {
            setLoading(false); // If props are not ready, stop loading and wait
        }
    }, [userId, project?.id, appId, db, auth]); // Depend on project.id

    const handleEditProject = useCallback(async (updatedFields) => {
        if (!localProject || !db) return;
        setLoading(true);
        try {
            await db.collection(`artifacts/${appId}/users/${userId}/projects`).doc(localProject.id).update(updatedFields);
            // setLocalProject(prev => ({ ...prev, ...updatedFields })); // Firestore snapshot will update this
            setShowEditProjectModal(false);
        } catch (e) {
            setError(`Failed to update project: ${e.message}`);
        } finally {
            setLoading(false);
        }
    }, [localProject, userId, appId, db]);

    const handleVideoSelected = useCallback((video) => {
        setActiveVideoId(video.id);
        // setShowVideoModal(true); // Moved to VideoWorkspace, no longer needed here
    }, []);

    const handleCloseVideoModal = useCallback(() => {
        setActiveVideoId(null);
        setShowVideoModal(false);
    }, []);

    // Function to update a specific video's fields
    const updateVideo = useCallback(async (videoId, updates) => {
        if (!db || !localProject?.id) return; // Ensure localProject.id is available
        const videoRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${localProject.id}/videos`).doc(videoId);
        try {
            await videoRef.update(updates);
            // setVideos(prevVideos => prevVideos.map(vid => vid.id === videoId ? { ...vid, ...updates } : vid)); // Firestore snapshot will update this
        } catch (e) {
            console.error(`Failed to update video ${videoId}:`, e);
            setError(`Failed to update video: ${e.message}`);
        }
    }, [userId, localProject?.id, appId, db]);

    // Scripting Task Handler
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

    // Handler for saving experiences from ScriptPlanModal
    const handleSaveLocationExperiences = useCallback(async (videoId, experiences) => {
        setLoading(true);
        setError(null);
        try {
            // Update the video document with the user's experiences
            await updateVideo(videoId, {
                scriptPlan: scriptPlanData.scriptPlan, // Save the AI plan
                locationQuestions: scriptPlanData.locationQuestions, // Save the questions asked
                locationExperiences: experiences, // Save the user's answers
                scriptingTaskStatus: 'user_input_collected', // Update task status
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

    // Task completion handler (for tasks that don't open modals, or after modal closes)
    const handleTaskCompletion = useCallback(async (videoId, taskName, status, data = {}) => {
        if (!db || !localProject?.id) return; // Ensure localProject.id is available
        const videoRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${localProject.id}/videos`).doc(videoId);
        try {
            await videoRef.update({
                [`tasks.${taskName}`]: status, // Simplified status update
                ...data // Spread other data directly
            });
            // Firestore snapshot will update video state
            if (taskBeingEdited && taskBeingEdited.videoId === videoId && taskBeingEdited.taskType === taskName) {
                setTaskBeingEdited(null);
            }
        } catch (e) {
            console.error(`Failed to complete task ${taskName} for video ${videoId}:`, e);
            setError(`Failed to update task status: ${e.message}`);
        }
    }, [userId, localProject?.id, appId, taskBeingEdited, db]);

    // The projectVideos state should likely be removed or adjusted if videos are already tied to the project prop
    // const projectVideos = videos.filter(video => video.projectId === project.id); // This filter might be redundant/problematic if videos are already project-specific

    // Calculate overall progress for the project header
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
        return (totalCompletedTasks / maxPossibleTasks) * 100;
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

    if (!localProject) { // Use localProject here
        return (
            <div className="fixed inset-0 bg-gray-900 text-white flex flex-col items-center justify-center p-4">
                <p className="text-red-400 text-lg">Project not found or an error occurred.</p>
                <button onClick={onCloseProject} className="mt-4 px-6 py-2 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold">
                    Go Back to Dashboard
                </button>
            </div>
        );
    }

    const activeVideo = videos.find(v => v.id === activeVideoId);

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-white">
            <window.ProjectHeader
                project={localProject} // Use localProject
                onBack={onCloseProject}
                onEdit={() => setShowEditProjectModal(true)}
                onManageFootage={() => setShowManageFootageModal(true)}
                overallProgress={overallProgress} // Pass overall progress
                onToggleSidebar={() => { /* Implement sidebar toggle logic if needed */ }}
            />

            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar - Video List */}
                <div className="w-1/4 bg-gray-800 border-r border-gray-700 overflow-y-auto custom-scrollbar">
                    <window.VideoList 
                        videos={videos} 
                        activeVideoId={activeVideoId} 
                        onSelectVideo={(id) => setActiveVideoId(id)} // Ensure setActiveVideoId is called directly
                        onEditVideo={(videoToEdit) => { // This function should actually open EditVideoModal
                            setActiveVideoId(videoToEdit.id); // Set active video to the one being edited
                            setShowVideoModal(true);
                        }}
                        onReorder={async (dragged, target) => {
                            const newOrder = [...videos];
                            const draggedIndex = newOrder.findIndex(v => v.id === dragged.id);
                            const targetIndex = newOrder.findIndex(v => v.id === target.id);
                            const [removed] = newOrder.splice(draggedIndex, 1);
                            newOrder.splice(targetIndex, 0, removed);
                            // Update order in Firestore
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
                                    // Firestore listener will update the videos state
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

                {/* Main Content Area - Video Details / Workspace */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4"> {/* Added p-4 for consistent padding */}
                    {activeVideo ? (
                        <window.VideoWorkspace
                            video={activeVideo}
                            settings={settings}
                            project={localProject} // Pass localProject
                            userId={userId}
                            // onUpdateVideo is not directly passed to VideoWorkspace, its tasks components get it
                            // onGenerateScriptPlan={handleGenerateScriptPlan} // Moved into ScriptingTask
                            // onTaskComplete={handleTaskCompletion} // Moved to individual task components
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full">
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
                    project={localProject} // Use localProject
                    onClose={() => setShowEditProjectModal(false)}
                    userId={userId}
                    settings={settings}
                    googleMapsLoaded={googleMapsLoaded}
                    // onSave is now handleEditProject passed to it
                />
            )}

            {showVideoModal && activeVideo && (
                <window.EditVideoModal // Changed from VideoModal to EditVideoModal for consistency
                    video={activeVideo}
                    onClose={handleCloseVideoModal}
                    userId={userId}
                    settings={settings}
                    project={localProject} // Pass localProject
                    googleMapsLoaded={googleMapsLoaded}
                />
            )}

            {showManageFootageModal && (
                <window.ManageFootageModal
                    project={localProject} // Use localProject
                    onClose={() => setShowManageFootageModal(false)}
                    userId={userId}
                    settings={settings}
                    googleMapsLoaded={googleMapsLoaded}
                    videos={videos} // Pass videos for concept refinement
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
                                    updatePayload['tasks.scripting'] = 'pending'; // Reset scripting task
                                    updatePayload['tasks.scriptingStage'] = 'pending'; // Reset scripting stage
                                    updatePayload['script'] = ''; // Clear the old script
                                }
                                batch.update(videoRef, updatePayload);
                            });
                            await batch.commit();

                            setShowManageFootageModal(false);
                            displayNotification('Footage inventory and video concepts updated!');
                        } catch (e) {
                            console.error("Error saving footage and concepts:", e);
                            setError(`Failed to save changes: ${e.message}`);
                        }
                    }}
                />
            )}

            {/* Render ScriptPlanModal when active */}
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
