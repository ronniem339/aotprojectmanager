// creators-hub/js/components/ShortsTool.js

window.ShortsTool = ({ settings, onBack, userId, db }) => {
    const { useState, useEffect } = React;
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [videos, setVideos] = useState([]);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const appId = window.CREATOR_HUB_CONFIG.APP_ID;

    // Fetch projects (no changes here)
    useEffect(() => {
        if (!userId || !db) return;
        const projectsCollectionRef = db.collection(`artifacts/${appId}/users/${userId}/projects`).orderBy("lastAccessed", "desc");
        const unsubscribe = projectsCollectionRef.onSnapshot(snapshot => {
            const projs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProjects(projs);
            setIsLoading(false);
        }, error => {
            console.error("Error fetching projects: ", error);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [userId, db, appId]);

    // Fetch videos when a project is selected
    useEffect(() => {
        if (!selectedProject || !userId || !db) {
            setVideos([]);
            setSelectedVideo(null);
            return;
        }
        const videosCollectionRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${selectedProject.id}/videos`).orderBy("order");
        
        const unsubscribe = videosCollectionRef.onSnapshot(snapshot => {
            const vids = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setVideos(vids);
            
            if (vids.length > 0) {
                const currentSelectedVideoFromDB = vids.find(v => v.id === selectedVideo?.id);

                if (currentSelectedVideoFromDB) {
                    // **FIX 1: Create a new object reference to guarantee a re-render.**
                    // This forces React to see a completely new object and trigger the
                    // update in the child component every single time.
                    const newSelectedVideoObject = JSON.parse(JSON.stringify(currentSelectedVideoFromDB));
                    setSelectedVideo(newSelectedVideoObject);

                } else {
                    setSelectedVideo(vids[0]);
                }
            } else {
                setSelectedVideo(null);
            }
        });

        return () => unsubscribe();
    // **FIX 2: Add `selectedVideo` to the dependency array.**
    // This ensures the onSnapshot callback always has the latest `selectedVideo` reference.
    }, [selectedProject, userId, db, appId, selectedVideo]);
    
    // Callbacks for the ShortsIdeasToolModal (no changes here)
    const handleSaveShortsIdea = async (newIdea) => {
        if (!db || !selectedProject || !selectedVideo) return;
        const videoDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${selectedProject.id}/videos`).doc(selectedVideo.id);
        await videoDocRef.update({
            shortsIdeas: firebase.firestore.FieldValue.arrayUnion(newIdea)
        });
    };

    const handleDeleteShortsIdea = async (ideaId) => {
        if (!db || !selectedProject || !selectedVideo) return;
        const videoDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${selectedProject.id}/videos`).doc(selectedVideo.id);
        const ideaToDelete = (selectedVideo.shortsIdeas || []).find(idea => idea.id === ideaId);
        
        if (ideaToDelete) {
            await videoDocRef.update({
                shortsIdeas: firebase.firestore.FieldValue.arrayRemove(ideaToDelete)
            });
        }
    };

    const handleGenerateShortsMetadata = async (ideaId, metadata) => {
        if (!db || !selectedProject || !selectedVideo) return;
        const videoDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${selectedProject.id}/videos`).doc(selectedVideo.id);
        const currentShorts = selectedVideo.shortsIdeas || [];
        const updatedShorts = currentShorts.map(idea =>
            idea.id === ideaId ? { ...idea, metadata: metadata } : idea
        );
        await videoDocRef.update({ shortsIdeas: updatedShorts });
    };
    
    const handleUpdateShortsIdeaStatus = async (ideaId, newStatus) => {
        if (!db || !selectedProject || !selectedVideo) return;
        const videoDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${selectedProject.id}/videos`).doc(selectedVideo.id);
        const currentShorts = selectedVideo.shortsIdeas || [];
        const updatedShorts = currentShorts.map(idea =>
            idea.id === ideaId ? { ...idea, status: newStatus } : idea
        );
        await videoDocRef.update({ shortsIdeas: updatedShorts });
    };

    // JSX / Rendering (no changes here)
    return (
        <div className="p-4 sm:p-6 md:p-8 min-h-screen flex flex-col">
            <header className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 gap-4">
                <h1 className="text-3xl sm:text-4xl font-bold text-white text-center sm:text-left">📱 Shorts & Reels Factory</h1>
                <button onClick={onBack} className="flex items-center gap-2 glass-card px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors w-full sm:w-auto justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Tools
                </button>
            </header>

            {isLoading ? <window.LoadingSpinner text="Loading projects..." /> : (
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1 w-full">
                        <label className="block text-sm font-medium text-gray-300 mb-2">1. Select a Project</label>
                        <select
                            value={selectedProject ? selectedProject.id : ''}
                            onChange={(e) => {
                                const proj = projects.find(p => p.id === e.target.value);
                                setSelectedProject(proj);
                            }}
                            className="form-input w-full"
                            disabled={projects.length === 0}
                        >
                            <option value="" disabled>{projects.length === 0 ? 'No projects available' : 'Choose a project...'}</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.playlistTitle}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 w-full">
                            <label className="block text-sm font-medium text-gray-300 mb-2">2. Select a Video</label>
                            <select
                                value={selectedVideo ? selectedVideo.id : ''}
                                onChange={(e) => {
                                    const vid = videos.find(v => v.id === e.target.value);
                                    setSelectedVideo(vid);
                                }}
                                className="form-input w-full"
                                disabled={!selectedProject || videos.length === 0}
                            >
                                <option value="" disabled>{!selectedProject ? 'First, select a project' : (videos.length === 0 ? 'No videos in this project' : 'Choose a video...')}</option>
                               {videos.map(v => (
                                   <option key={v.id} value={v.id}>{v.chosenTitle || v.title}</option>
                               ))}
                           </select>
                    </div>
                </div>
            )}
            
            <div className="flex-grow flex flex-col">
                {selectedProject && selectedVideo ? (
                    <div className="glass-card p-4 sm:p-6 rounded-lg h-full flex-grow">
                        <window.ShortsIdeasToolModal
                            video={selectedVideo}
                            project={selectedProject}
                            settings={settings}
                            onSaveShortsIdea={handleSaveShortsIdea}
                            onDeleteShortsIdea={handleDeleteShortsIdea}
                            onGenerateShortsMetadata={handleGenerateShortsMetadata}
                            onUpdateShortsIdeaStatus={handleUpdateShortsIdeaStatus}
                        />
                    </div>
                ) : (
                    <div className="glass-card p-12 rounded-lg text-center h-full flex items-center justify-center flex-grow">
                        <p className="text-gray-400 text-lg">Please select a project and a video to start generating Shorts ideas.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
