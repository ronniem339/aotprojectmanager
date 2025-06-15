// js/components/ProjectView.js

const { useState, useEffect, useMemo } = React;

const ProjectView = ({ project, userId, onBack, settings, googleMapsLoaded }) => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeVideoId, setActiveVideoId] = useState(null);
    const [editingProject, setEditingProject] = useState(false);
    const [editingVideo, setEditingVideo] = useState(null);
    const [currentProject, setCurrentProject] = useState(project);
    const appId = window.CREATOR_HUB_CONFIG.APP_ID;

    // Listen for real-time updates to the project itself (e.g., if locations change)
    useEffect(() => {
        const projectDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects`).doc(project.id);
        const unsubscribe = projectDocRef.onSnapshot(doc => {
            setCurrentProject({ id: doc.id, ...doc.data() });
        });
        return () => unsubscribe();
    }, [project.id, userId]);

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
            
            // Sort videos by the 'order' field
            videosData.sort((a, b) => (a.order || 0) - (b.order || 0));
            
            setVideos(videosData);

            if (loading && videosData.length > 0 && !activeVideoId) {
                setActiveVideoId(videosData[0].id);
            }
            setLoading(false);
        }, error => {
            console.error("Error fetching videos:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId, currentProject.id]);

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

    const activeVideo = useMemo(() => videos.find(v => v.id === activeVideoId), [videos, activeVideoId]);
    
    return (
        <div className="p-4 sm:p-6 lg:p-8">
            {editingProject && <EditProjectModal project={currentProject} userId={userId} settings={settings} onClose={() => setEditingProject(false)} googleMapsLoaded={googleMapsLoaded} />}
            {editingVideo && <EditVideoModal video={editingVideo} userId={userId} project={currentProject} settings={settings} onClose={() => setEditingVideo(null)} googleMapsLoaded={googleMapsLoaded} />}

            <ProjectHeader 
                project={currentProject} 
                onBack={onBack} 
                onEdit={() => setEditingProject(true)} 
            />
            
            {loading ? (
                <div className="flex justify-center mt-16"><LoadingSpinner text="Loading Project..." /></div>
            ) : (
                <div className="flex flex-col lg:flex-row gap-8">
                    <VideoList 
                        videos={videos}
                        activeVideoId={activeVideoId}
                        onSelectVideo={setActiveVideoId}
                        onEditVideo={setEditingVideo}
                        onReorder={handleReorderVideos}
                    />
                    
                    {activeVideo ? (
                        <VideoWorkspace 
                            video={activeVideo} 
                            settings={settings} 
                            project={currentProject} 
                            userId={userId}
                        />
                    ) : (
                        <main className="lg:w-2/3 xl:w-3/4 flex items-center justify-center h-full glass-card p-8 rounded-lg">
                            <p className="text-gray-400">Select a video to begin.</p>
                        </main>
                    )}
                </div>
            )}
        </div>
    );
};
