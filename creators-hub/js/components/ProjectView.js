// js/components/ProjectView.js

const { useState, useEffect, useMemo } = React;

window.ProjectView = ({ project, userId, onBack, settings, googleMapsLoaded }) => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeVideoId, setActiveVideoId] = useState(null);
    const [editingProject, setEditingProject] = useState(false);
    const [editingVideo, setEditingVideo] = useState(null);
    const [currentProject, setCurrentProject] = useState(project);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State to control sidebar visibility on mobile
    const [videoToDelete, setVideoToDelete] = useState(null);
    // NEW: State for showing the footage management modal
    const [showManageFootageModal, setShowManageFootageModal] = useState(false);
    const appId = window.CREATOR_HUB_CONFIG.APP_ID;

    // Listen for real-time updates to the project itself
    useEffect(() => {
        const projectDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects`).doc(project.id);
        const unsubscribe = projectDocRef.onSnapshot(doc => {
            setCurrentProject({ id: doc.id, ...doc.data() });
        });
        return () => unsubscribe();
    }, [project.id, userId, appId]);

    // Listen for real-time updates to the videos within the project
    useEffect(() => {
        if (!userId || !currentProject?.id) return;
        
        const videosCollectionRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${currentProject.id}/videos`);
        const unsubscribe = videosCollectionRef.onSnapshot(querySnapshot => {
            let videosData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                tasks: doc.data().tasks || {}
            }));
            
            videosData.sort((a, b) => (a.order || 0) - (b.order || 0));
            
            setVideos(videosData);

            if (loading && videosData.length > 0 && !activeVideoId) {
                setActiveVideoId(videosData[0].id);
            } else if (videosData.length === 0) {
                setActiveVideoId(null);
            }
            setLoading(false);
        }, error => {
            console.error("Error fetching videos:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId, currentProject.id, appId, loading, activeVideoId]);

    const handleReorderVideos = (draggedItem, targetItem) => {
        let reorderedVideos = [...videos];
        const draggedItemIndex = reorderedVideos.findIndex(v => v.id === draggedItem.id);
        const targetItemIndex = reorderedVideos.findIndex(v => v.id === targetItem.id);
        
        reorderedVideos.splice(draggedItemIndex, 1);
        reorderedVideos.splice(targetItemIndex, 0, draggedItem);

        const batch = db.batch();
        reorderedVideos.forEach((video, index) => {
            const docRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${currentProject.id}/videos`).doc(video.id);
            batch.update(docRef, { order: index });
        });
        batch.commit().catch(err => {
            console.error("Failed to reorder videos:", err);
        });
    };

    const handleSelectVideoAndCloseSidebar = (videoId) => {
        setActiveVideoId(videoId);
        setIsSidebarOpen(false); // Close sidebar on mobile after selecting a video
    };

    const handleDeleteVideo = async (video) => {
        setVideoToDelete(video);
    };

    const confirmDeleteVideo = async (videoId) => {
        if (!userId || !currentProject?.id) return;

        const videoDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${currentProject.id}/videos`).doc(videoId);
        
        try {
            await videoDocRef.delete();
            if (activeVideoId === videoId) {
                setActiveVideoId(null);
            }
        } catch (error) {
            console.error("Error deleting video:", error);
        } finally {
            setVideoToDelete(null);
        }
    };

    // NEW: Function to handle saving inventory changes and suggesting concept updates
    const handleSaveFootageAndSuggestConcepts = async (newLocations, newFootageInventory, videosToUpdatePayload) => {
        const projectDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects`).doc(currentProject.id);
        const batch = db.batch();

        // 1. Update project's locations and footageInventory
        batch.update(projectDocRef, {
            locations: newLocations,
            footageInventory: newFootageInventory
        });

        // 2. Update individual video concepts (if any AI re-generation/acceptance was done)
        videosToUpdatePayload.forEach(videoPayload => {
            const videoDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${currentProject.id}/videos`).doc(videoPayload.videoId);
            const updateData = { concept: videoPayload.newConcept };

            // If the script was complete and the concept actually changed, reset scripting task
            if (videoPayload.resetScriptingTask) {
                updateData['tasks.scripting'] = 'pending';
                updateData.script = ''; // Clear the script as it's now outdated
            }
            batch.update(videoDocRef, updateData);
        });

        try {
            await batch.commit();
            setShowManageFootageModal(false); // Close modal after successful save
        } catch (error) {
            console.error("Error saving footage or updating concepts:", error);
            // Handle error, e.g., show a notification
        }
    };


    const activeVideo = useMemo(() => videos.find(v => v.id === activeVideoId), [videos, activeVideoId]);

    const overallProgress = useMemo(() => {
        const totalTasks = window.CREATOR_HUB_CONFIG.TASK_PIPELINE.length;
        if (!videos || videos.length === 0 || totalTasks === 0) {
            return 0;
        }

        let totalCompletedTasks = 0;
        videos.forEach(video => {
            if (video.tasks) {
                totalCompletedTasks += Object.values(video.tasks).filter(status => status === 'complete').length;
            }
        });

        const maxPossibleTasks = videos.length * totalTasks;
        return (totalCompletedTasks / maxPossibleTasks) * 100;

    }, [videos]);
    
    return (
        <div className="p-4 sm:p-6 lg:p-8 min-h-screen flex flex-col">
            {editingProject && <window.EditProjectModal project={currentProject} userId={userId} settings={settings} onClose={() => setEditingProject(false)} googleMapsLoaded={googleMapsLoaded} />}
            {editingVideo && <window.EditVideoModal video={editingVideo} userId={userId} project={currentProject} settings={settings} onClose={() => setEditingVideo(null)} googleMapsLoaded={googleMapsLoaded} />}
            {videoToDelete && (
                <window.DeleteConfirmationModal 
                    project={{ id: videoToDelete.id, playlistTitle: videoToDelete.title || 'this video' }}
                    onConfirm={() => confirmDeleteVideo(videoToDelete.id)} 
                    onCancel={() => setVideoToDelete(null)} 
                />
            )}
            {/* NEW: Render the ManageFootageModal */}
            {showManageFootageModal && (
                <window.ManageFootageModal
                    project={currentProject}
                    videos={videos} // Pass videos to the modal for impact analysis
                    userId={userId}
                    settings={settings}
                    googleMapsLoaded={googleMapsLoaded}
                    onClose={() => setShowManageFootageModal(false)}
                    onSaveAndSuggestConcepts={handleSaveFootageAndSuggestConcepts}
                />
            )}

            <window.ProjectHeader 
                project={currentProject} 
                onBack={onBack} 
                onEdit={() => setEditingProject(true)} 
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                overallProgress={overallProgress}
                // NEW: Pass prop to open footage management modal
                onManageFootage={() => setShowManageFootageModal(true)}
            />
            
            {loading ? (
                <div className="flex justify-center mt-16 flex-grow"><window.LoadingSpinner text="Loading Project..." /></div>
            ) : (
                <div className="flex flex-grow flex-col lg:flex-row gap-6 relative">
                    <div className={`fixed inset-y-0 left-0 w-64 bg-gray-900 z-40 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:w-1/4 xl:w-1/5 lg:flex-shrink-0 flex flex-col rounded-lg`}>
                        <div className="p-4 flex justify-between items-center lg:hidden border-b border-gray-700">
                            <h2 className="text-lg font-semibold text-white">Videos</h2>
                            <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                        </div>
                        <div className="flex-grow overflow-y-auto">
                            <window.VideoList 
                                videos={videos}
                                activeVideoId={activeVideoId}
                                onSelectVideo={handleSelectVideoAndCloseSidebar}
                                onEditVideo={setEditingVideo}
                                onReorder={handleReorderVideos}
                                onDeleteVideo={handleDeleteVideo}
                            />
                        </div>
                    </div>
                    {isSidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}
                    
                    {activeVideo ? (
                        <div className="lg:flex-grow flex flex-col lg:flex-row gap-6">
                            <div className="lg:w-2/3 xl:w-3/4">
                                <window.VideoWorkspace 
                                    video={activeVideo} 
                                    settings={settings} 
                                    project={currentProject} 
                                    userId={userId}
                                />
                            </div>
                            <div className="lg:w-1/3 xl:w-1/4">
                                <window.VideoDetailsSidebar 
                                    video={activeVideo} 
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="lg:flex-grow lg:w-2/3 xl:w-3/4 flex items-center justify-center h-full glass-card p-8 rounded-lg min-h-[400px]">
                            <p className="text-gray-400">Select a video to begin working on it.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
