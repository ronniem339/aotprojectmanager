// js/components/Dashboard.js

window.Dashboard = ({ userId, onSelectProject, onShowSettings, onShowMyStudio, onShowProjectSelection, onShowDeleteConfirm, onShowKnowledgeBases }) => { // Add onShowKnowledgeBases prop
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const projectCardsRef = useRef(null);
    const appId = window.CREATOR_HUB_CONFIG.APP_ID;

    useEffect(() => {
        if (!userId) return;
        const projectsCollectionRef = db.collection(`artifacts/${appId}/users/${userId}/projects`).orderBy("createdAt", "desc");
        const unsubscribe = projectsCollectionRef.onSnapshot(querySnapshot => {
            const projectsData = [];
            querySnapshot.forEach((doc) => { projectsData.push({ id: doc.id, ...doc.data() }); });
            setProjects(projectsData);
            setLoading(false);
        }, (error) => { console.error("Error fetching projects:", error); setLoading(false); });
        return () => unsubscribe();
    }, [userId]);

    useEffect(() => {
        if (!loading && projects.length > 0 && projectCardsRef.current) {
            gsap.fromTo(projectCardsRef.current.children, { opacity: 0, y: 30 }, { opacity: 1, y: 0, stagger: 0.1, duration: 0.5, ease: 'power3.out' });
        }
    }, [loading, projects]);
    
    const handleDeleteClick = (e, project) => {
        // Stop the click from bubbling up to the main card div, which would trigger onSelectProject
        e.stopPropagation();
        onShowDeleteConfirm(project);
    };

    // Helper function to generate a cleaner search term for Unsplash from a project title
    const generateImageSearchTerm = (title) => {
        if (!title) return 'travel,adventure';
        // This logic creates a more focused search query for better image results.
        return title
            .replace(/\(.*?\)/g, '') // remove text in parentheses e.g. (2025)
            .split(/[:\-|]/)[0]     // take the part before a colon, dash, or pipe
            .trim()
            .split(' ')
            .slice(0, 3)            // take the first 3 words
            .join(',');             // join with commas for the Unsplash API
    };

    // Handle user logout
    const handleLogout = async () => {
        try {
            await auth.signOut();
            // Firebase's onAuthStateChanged listener in App.js will handle redirect to LoginScreen
        } catch (error) {
            console.error("Error logging out:", error);
        }
    };


    return (
        <div className="p-8">
            <header className="flex justify-between items-center mb-8">
                {/* Removed the "Creator's Hub" title */}
                <div className="flex gap-4">
                    <button onClick={onShowMyStudio} className="flex items-center gap-2 glass-card px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">🎨 My Studio</button>
                    <button onClick={onShowSettings} className="flex items-center gap-2 glass-card px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">⚙️ Settings</button>
                    {/* NEW: Knowledge Bases Button */}
                    <button onClick={onShowKnowledgeBases} className="flex items-center gap-2 glass-card px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">📚 Knowledge Bases</button>
                    {/* Moved New Project button here as requested */}
                    <button onClick={onShowProjectSelection} className="flex items-center gap-2 glass-card px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">✨ New Project</button>
                    {/* NEW: Logout Button */}
                    <button onClick={handleLogout} className="flex items-center gap-2 glass-card px-4 py-2 rounded-lg hover:bg-red-800 transition-colors text-red-400 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                        </svg>
                        Logout
                    </button>
                </div>
            </header>
            {loading ? <window.LoadingSpinner /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" ref={projectCardsRef}>
                    {/* Removed the large "New Project" tile from here as it's now in the header */}
                    {projects.map(project => {
                        // Dynamically determine the image URL: prioritize user-selected, then generated
                        const imageUrl = project.coverImageUrl || `https://source.unsplash.com/600x400/?${encodeURIComponent(generateImageSearchTerm(project.playlistTitle))}`;
                        
                        return (
                            <div key={project.id} onClick={() => onSelectProject(project)} className="glass-card rounded-lg flex flex-col justify-between cursor-pointer hover:shadow-2xl hover:shadow-primary-accent/[.20] hover:-translate-y-1 transition-all overflow-hidden group">
                                 <div className="relative">
                                    <window.ImageComponent src={imageUrl} alt={project.playlistTitle || project.title} className="w-full h-32 object-cover" />
                                    <button 
                                        onClick={(e) => handleDeleteClick(e, project)} 
                                        className="absolute top-2 right-2 p-1.5 bg-red-800/70 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-700 transition-opacity"
                                        aria-label="Delete project"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="p-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-primary-accent truncate">{project.playlistTitle || project.title}</h3>
                                        <p className="text-gray-400 italic mt-1 text-sm h-10 overflow-hidden">"{project.playlistDescription || ''}"</p>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-2">Created: {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A'}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
