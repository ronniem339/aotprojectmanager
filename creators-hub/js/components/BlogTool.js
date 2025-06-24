// js/components/BlogTool.js

window.BlogTool = ({ settings, onBack, onGeneratePost, onPublishPosts, taskQueue, onViewPost, userId, db }) => {
    const { useState, useEffect, useMemo } = React;

    // --- STATE MANAGEMENT ---
    const [isGenerating, setIsGenerating] = useState(false);
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState('');
    const [videos, setVideos] = useState([]);
    const [selectedVideo, setSelectedVideo] = useState('');
    const [isGeneratingFromVideo, setIsGeneratingFromVideo] = useState(false);

    const { APP_ID } = window.CREATOR_HUB_CONFIG;

    const ideasCollectionRef = useMemo(() => {
        if (!userId) return null;
        return db.collection(`artifacts/${APP_ID}/users/${userId}/blogIdeas`);
    }, [db, APP_ID, userId]);

    // --- DATA FETCHING EFFECTS ---
    // Fetch all projects for the user
    useEffect(() => {
        if (!userId) {
            setProjects([]);
            return;
        }
        const projectsCollectionRef = db.collection(`artifacts/${APP_ID}/users/${userId}/projects`);
        const unsubscribe = projectsCollectionRef.onSnapshot(
            snapshot => {
                const fetchedProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setProjects(fetchedProjects);
            },
            err => console.error("Error fetching projects:", err)
        );
        return () => unsubscribe();
    }, [db, APP_ID, userId]);

    // Fetch videos when a project is selected
    useEffect(() => {
        if (!selectedProject || !userId) {
            setVideos([]);
            setSelectedVideo('');
            return;
        }
        const videosCollectionRef = db.collection(`artifacts/${APP_ID}/users/${userId}/projects/${selectedProject}/videos`);
        const unsubscribe = videosCollectionRef.onSnapshot(
            snapshot => {
                const fetchedVideos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setVideos(fetchedVideos);
                if (selectedVideo && !fetchedVideos.some(v => v.id === selectedVideo)) {
                    setSelectedVideo('');
                }
            },
            err => {
                console.error("Error fetching videos:", err);
                setVideos([]);
            }
        );
        return () => unsubscribe();
    }, [db, APP_ID, userId, selectedProject]);

    // --- HANDLER FUNCTIONS ---

    // Handles idea generation from a user-provided topic
    const handleGenerateIdeas = async (e) => {
        e.preventDefault();
        const destination = e.target.elements.destination.value;
        if (!destination) {
            console.warn("Please provide a destination or topic.");
            return;
        }

        setIsGenerating(true);
        try {
            const newIdeas = await window.aiUtils.generateBlogPostIdeasAI({
                destination, settings,
                coreSeoEngine: settings.knowledgeBases.blog.coreSeoEngine,
                monetizationGoals: settings.knowledgeBases.blog.monetizationGoals,
                ideaGenerationKb: settings.knowledgeBases.blog.ideaGeneration
            });

            const batch = db.batch();
            newIdeas.forEach(idea => {
                const docRef = ideasCollectionRef.doc();
                batch.set(docRef, { ...idea, status: 'new', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
            });
            await batch.commit();
        } catch (err) {
            console.error(`Failed to generate ideas: ${err.message}`);
        } finally {
            setIsGenerating(false);
        }
    };
    
    // Handler for generating ideas from a selected video
    const handleGenerateFromVideo = async () => {
        if (!selectedProject || !selectedVideo) {
            console.warn("Please select a project and video first.");
            return;
        }
        setIsGeneratingFromVideo(true);
        try {
            const videoData = videos.find(v => v.id === selectedVideo);
            const projectData = projects.find(p => p.id === selectedProject);

            if (!videoData || !projectData) {
                console.error("Selected project or video data not found.");
                setIsGeneratingFromVideo(false);
                return;
            }

            const newIdeas = await window.aiUtils.generateBlogPostIdeasFromVideoAI({
                video: videoData,
                projectTitle: projectData.playlistTitle,
                settings,
                coreSeoEngine: settings.knowledgeBases.blog.coreSeoEngine,
                monetizationGoals: settings.knowledgeBases.blog.monetizationGoals,
                ideaGenerationKb: settings.knowledgeBases.blog.ideaGeneration
            });

            const batch = db.batch();
            newIdeas.forEach(idea => {
                const docRef = ideasCollectionRef.doc();
                batch.set(docRef, { ...idea, status: 'new', createdAt: firebase.firestore.FieldValue.serverTimestamp(), relatedProjectId: projectData.id, relatedVideoId: videoData.id, relatedProjectTitle: projectData.playlistTitle, relatedVideoTitle: videoData.title });
            });
            await batch.commit();

        } catch (err) {
            console.error(`Failed to generate ideas from video: ${err.message}`);
        } finally {
            setIsGeneratingFromVideo(false);
        }
    };

    // --- RENDER FUNCTIONS ---
    
    // Renders the new idea generation UI with two methods
    const renderGeneratorUI = () => (
        <div className="glass-card p-4 sm:p-6 rounded-lg mb-8">
            <h3 className="text-lg font-semibold mb-4 text-white">Generate New Ideas</h3>
            <div className="space-y-6">
                {/* Method 1: By Topic */}
                <div>
                    <form onSubmit={handleGenerateIdeas} className="space-y-3">
                        <label htmlFor="destination" className="block text-sm font-medium text-gray-300">From a Topic or Destination</label>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <input type="text" id="destination" name="destination" className="form-input flex-grow" placeholder="e.g., 'Best hikes in the Lake District'" required />
                            <button type="submit" disabled={isGenerating} className="btn btn-primary w-full sm:w-auto">
                                {isGenerating ? <window.LoadingSpinner isButton={true} /> : 'Generate Ideas'}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="flex items-center">
                    <div className="flex-grow border-t border-gray-600"></div>
                    <span className="flex-shrink mx-4 text-gray-400">OR</span>
                    <div className="flex-grow border-t border-gray-600"></div>
                </div>

                {/* Method 2: From Project/Video */}
                <div>
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-300">From an Existing Video</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <select
                                id="project-select"
                                value={selectedProject}
                                onChange={(e) => setSelectedProject(e.target.value)}
                                className="form-select"
                                disabled={projects.length === 0}
                            >
                                <option value="">{projects.length === 0 ? 'Loading projects...' : 'Select a Project'}</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.playlistTitle || 'Untitled Project'}</option>)}
                            </select>
                            <select
                                id="video-select"
                                value={selectedVideo}
                                onChange={(e) => setSelectedVideo(e.target.value)}
                                className="form-select"
                                disabled={!selectedProject}
                            >
                                <option value="">{ !selectedProject ? 'Select a project first' : (videos.length === 0 ? 'No videos found' : 'Select a Video')}</option>
                                {videos.map(v => <option key={v.id} value={v.id}>{v.title || 'Untitled Video'}</option>)}
                            </select>
                        </div>
                        <button
                            onClick={handleGenerateFromVideo}
                            disabled={isGeneratingFromVideo || !selectedVideo}
                            className="btn btn-secondary w-full mt-3"
                        >
                            {isGeneratingFromVideo ? <window.LoadingSpinner isButton={true} /> : 'Generate From Video'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <header className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 gap-4">
                <h1 className="text-3xl sm:text-4xl font-bold text-white text-center sm:text-left">✍️ Blog Post Factory</h1>
                <button onClick={onBack} className="flex items-center gap-2 glass-card px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors w-full sm:w-auto justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Tools
                </button>
            </header>

            {renderGeneratorUI()}
            
            <div className="mt-8">
                <h3 className="text-xl font-bold mb-4">Content Pipeline</h3>
                <window.BlogIdeasDashboard
                    userId={userId}
                    db={db}
                    settings={settings}
                    onWritePost={onGeneratePost}
                    onPublishPosts={onPublishPosts}
                    taskQueue={taskQueue}
                    onViewPost={onViewPost}
                />
            </div>
        </div>
    );
};
