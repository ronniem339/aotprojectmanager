// js/components/ProjectView.js

window.ProjectView = ({ userId, projectId, onCloseProject, settings, googleMapsLoaded, db, auth }) => { // Accept db and auth as props
    const { useState, useEffect, useCallback } = React;
    const [project, setProject] = useState(null);
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

    // Remove Firebase initialization from here. It's now passed via props from App.js.
    // const app = firebase.initializeApp(firebaseConfig, `ProjectViewApp_${projectId}`); 
    // const db = app.firestore();
    // const auth = app.auth();

    useEffect(() => {
        const fetchProjectAndVideos = async () => {
            if (!userId || !projectId || !db || !auth) { // Ensure db and auth are available
                setError("Project ID, User ID, or Firebase instances are missing.");
                setLoading(false);
                return;
            }

            try {
                // Ensure user is authenticated before fetching data.
                // If auth is passed from App.js, it should already be ready/signing in.
                // No need for signInWithCustomToken here again if App.js handles it.
                // Assuming auth.currentUser is set by App.js's onAuthStateChanged listener.
                if (!auth.currentUser) {
                    // This might happen if auth state hasn't propagated yet or user is not logged in.
                    // For now, let's just wait or throw an error.
                    // Ideally, App.js should ensure user is authenticated before rendering ProjectView.
                    setError("User not authenticated for project data access.");
                    setLoading(false);
                    return;
                }

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
                console.error("Firebase Fetch Error:", err);
                setError(`Data fetch failed: ${err.message}`);
                setLoading(false);
            }
        };

        fetchProjectAndVideos();
    }, [userId, projectId, appId, db, auth]); // Add db and auth to dependencies

    const handleEditProject = useCallback(async (updatedFields) => {
        if (!project || !db) return;
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
    }, [project, userId, projectId, appId, db]);

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
        if (!db) return;
        const videoRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${projectId}/videos`).doc(videoId);
        try {
            await videoRef.update(updates);
            setVideos(prevVideos => prevVideos.map(vid => vid.id === videoId ? { ...vid, ...updates } : vid));
        } catch (e) {
            console.error(`Failed to update video ${videoId}:`, e);
            setError(`Failed to update video: ${e.message}`);
        }
    }, [userId, projectId, appId, db]);

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
        if (!db) return;
        const videoRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${projectId}/videos`).doc(videoId);
        try {
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
            if (taskBeingEdited && taskBeingEdited.videoId === videoId && taskBeingEdited.taskType === taskName) {
                setTaskBeingEdited(null);
            }
        } catch (e) {
            console.error(`Failed to complete task ${taskName} for video ${videoId}:`, e);
            setError(`Failed to update task status: ${e.message}`);
        }
    }, [userId, projectId, appId, taskBeingEdited, db]);

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
                            projectLocations={project.locations}
                            projectFootageInventory={project.footageInventory}
                            onUpdateVideo={updateVideo}
                            onGenerateScriptPlan={handleGenerateScriptPlan}
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
                    settings={settings}
                    db={db} // Pass db to ManageFootageModal
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
