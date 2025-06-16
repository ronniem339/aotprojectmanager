// js/components/ProjectView.js

window.ProjectView = ({ userId, projectId, onCloseProject, firebaseConfig }) => {
    const { useState, useEffect, useCallback } = React;
    const [project, setProject] = useState(null);
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeVideoId, setActiveVideoId] = useState(null);
    const [showEditProjectModal, setShowEditProjectModal] = useState(false);
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [showScriptPlanModal, setShowScriptPlanModal] = useState(false); // New state for script plan modal
    const [scriptPlanData, setScriptPlanData] = useState(null); // New state to hold script plan and questions
    const [taskBeingEdited, setTaskBeingEdited] = useState(null); // To track which task is active in a modal/full view
    const [showManageFootageModal, setShowManageFootageModal] = useState(false);

    const appId = window.CREATOR_HUB_CONFIG.APP_ID;

    // Firebase initialization and auth (if not already done globally)
    const app = firebase.initializeApp(firebaseConfig, `ProjectViewApp_${projectId}`); // Use a unique name
    const db = app.firestore();
    const auth = app.auth();

    useEffect(() => {
        const fetchProjectAndVideos = async () => {
            if (!userId || !projectId) {
                setError("Project ID or User ID is missing.");
                setLoading(false);
                return;
            }

            try {
                // Ensure user is authenticated before fetching data
                await auth.signInWithCustomToken(__initial_auth_token || 'some-default-token'); // Assuming __initial_auth_token is available globally

                const projectRef = db.collection(`artifacts/${appId}/users/${userId}/projects`).doc(projectId);
                const videoCollectionRef = projectRef.collection('videos');

                // Real-time listener for project data
                const unsubscribeProject = projectRef.onSnapshot(docSnap => {
                    if (docSnap.exists) {
                        setProject({ id: docSnap.id, ...docSnap.data() });
                    } else {
                        setError("Project not found.");
                        setProject(null);
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
                console.error("Firebase Auth or Fetch Error:", err);
                setError(`Authentication or data fetch failed: ${err.message}`);
                setLoading(false);
            }
        };

        fetchProjectAndVideos();
    }, [userId, projectId, appId, firebaseConfig]);

    const handleEditProject = useCallback(async (updatedFields) => {
        if (!project) return;
        setLoading(true);
        try {
            await db.collection(`artifacts/${appId}/users/${userId}/projects`).doc(projectId).update(updatedFields);
            setProject(prev => ({ ...prev, ...updatedFields }));
            setShowEditProjectModal(false);
        } catch (e) {
            setError(`Failed to update project: ${e.message}`);
        } finally {
            setLoading(false);
        }
    }, [project, userId, projectId, appId]);

    const handleVideoSelected = useCallback((video) => {
        setActiveVideoId(video.id);
        setShowVideoModal(true);
    }, []);

    const handleCloseVideoModal = useCallback(() => {
        setActiveVideoId(null);
        setShowVideoModal(false);
    }, []);

    // Function to update a specific video's fields
    const updateVideo = useCallback(async (videoId, updates) => {
        const videoRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${projectId}/videos`).doc(videoId);
        try {
            await videoRef.update(updates);
            setVideos(prevVideos => prevVideos.map(vid => vid.id === videoId ? { ...vid, ...updates } : vid));
            // After updating, if the video is active, also update the active video state in VideoModal
            if (activeVideoId === videoId) {
                const updatedVideo = videos.find(vid => vid.id === videoId);
                // This will trigger a re-render of VideoModal with updated data
                // No direct state update needed here for VideoModal, as it observes `videos`
            }
        } catch (e) {
            console.error(`Failed to update video ${videoId}:`, e);
            setError(`Failed to update video: ${e.message}`);
        }
    }, [userId, projectId, appId, videos, activeVideoId]); // Include videos and activeVideoId in dependencies

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

            // Set the data and open the modal
            setScriptPlanData({
                videoId: videoId,
                scriptPlan: aiResponse.scriptPlan,
                locationQuestions: aiResponse.locationQuestions
            });
            setShowScriptPlanModal(true);
            setTaskBeingEdited({ videoId: videoId, taskType: 'scripting' }); // Indicate this task is being handled by a modal

            // You might want to temporarily save the generated scriptPlan and questions to the video object
            // or hold off until the user provides feedback in the modal.
            // For now, let's just open the modal.

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
                // You might also want to set the generated script plan here if it's considered part of the video data
            });
            setShowScriptPlanModal(false); // Close the modal
            setScriptPlanData(null); // Clear modal data
            setTaskBeingEdited(null); // Clear the task being edited
        } catch (e) {
            console.error("Error saving location experiences:", e);
            setError(`Failed to save experiences: ${e.message}`);
        } finally {
            setLoading(false);
        }
    }, [updateVideo, scriptPlanData]); // Add scriptPlanData to dependencies

    // Task completion handler (for tasks that don't open modals, or after modal closes)
    const handleTaskCompletion = useCallback(async (videoId, taskName, status, data = {}) => {
        const videoRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${projectId}/videos`).doc(videoId);
        try {
            // Merge status into tasks object for the specific task
            await videoRef.update({
                [`tasks.${taskName}`]: { status: status, completedAt: firebase.firestore.FieldValue.serverTimestamp(), ...data }
            });
            setVideos(prevVideos => prevVideos.map(vid =>
                vid.id === videoId ? {
                    ...vid,
                    tasks: {
                        ...vid.tasks,
                        [taskName]: { status: status, completedAt: new Date(), ...data }
                    }
                } : vid
            ));
            // If the completed task was being edited in a fullscreen view, close it.
            if (taskBeingEdited && taskBeingEdited.videoId === videoId && taskBeingEdited.taskType === taskName) {
                setTaskBeingEdited(null);
            }
        } catch (e) {
            console.error(`Failed to complete task ${taskName} for video ${videoId}:`, e);
            setError(`Failed to update task status: ${e.message}`);
        }
    }, [userId, projectId, appId, taskBeingEdited]);

    const projectVideos = videos.filter(video => video.projectId === projectId);

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

    if (!project) {
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
                project={project}
                onCloseProject={onCloseProject}
                onEditProject={() => setShowEditProjectModal(true)}
                onManageFootage={() => setShowManageFootageModal(true)}
            />

            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar - Video List */}
                <div className="w-1/4 bg-gray-800 border-r border-gray-700 overflow-y-auto custom-scrollbar">
                    <window.VideoList videos={videos} onVideoSelected={handleVideoSelected} activeVideoId={activeVideoId} />
                </div>

                {/* Main Content Area - Video Details / Workspace */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {activeVideo ? (
                        <window.VideoDetailsSidebar
                            video={activeVideo}
                            projectLocations={project.locations} // Pass project locations for context
                            projectFootageInventory={project.footageInventory} // Pass project footage inventory
                            onUpdateVideo={updateVideo}
                            onGenerateScriptPlan={handleGenerateScriptPlan} // Pass the new handler
                            onTaskComplete={handleTaskCompletion}
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
                    project={project}
                    onClose={() => setShowEditProjectModal(false)}
                    onSave={handleEditProject}
                />
            )}

            {showVideoModal && activeVideo && (
                <window.VideoModal
                    video={activeVideo}
                    onClose={handleCloseVideoModal}
                />
            )}

            {showManageFootageModal && (
                <window.ManageFootageModal
                    project={project}
                    onClose={() => setShowManageFootageModal(false)}
                    userId={userId}
                    projectId={projectId}
                    settings={window.CURRENT_USER_SETTINGS} // Pass settings
                />
            )}

            {/* Render ScriptPlanModal when active */}
            {showScriptPlanModal && scriptPlanData && (
                <window.ScriptPlanModal
                    scriptPlan={scriptPlanData.scriptPlan}
                    locationQuestions={scriptPlanData.locationQuestions}
                    initialLocationExperiences={activeVideo?.locationExperiences || {}} // Pass existing experiences
                    onClose={() => setShowScriptPlanModal(false)}
                    onSaveExperiences={(experiences) => handleSaveLocationExperiences(scriptPlanData.videoId, experiences)}
                />
            )}
        </div>
    );
};
