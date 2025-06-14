// js/components/Dashboard.js

const Dashboard = ({ userId, onSelectProject, onShowSettings, onShowMyStudio, onShowNewProjectWizard }) => {
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

    return (
        <div className="p-8">
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-bold">Creator's Hub</h1>
                <div className="flex gap-4">
                    <button onClick={onShowMyStudio} className="flex items-center gap-2 glass-card px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">🎨 My Studio</button>
                    <button onClick={onShowSettings} className="flex items-center gap-2 glass-card px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">⚙️ Settings</button>
                </div>
            </header>
            {loading ? <LoadingSpinner /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" ref={projectCardsRef}>
                    <button onClick={onShowNewProjectWizard} className="glass-card rounded-lg h-64 flex flex-col justify-center items-center text-gray-400 hover:text-white hover:border-blue-500 border-2 border-dashed border-gray-600 transition-all">
                        <span className="text-5xl">✨</span>
                        <span className="text-xl font-semibold mt-2">New AI Project</span>
                    </button>
                    {projects.map(project => (
                        <div key={project.id} onClick={() => onSelectProject(project)} className="glass-card rounded-lg flex flex-col justify-between cursor-pointer hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-1 transition-all overflow-hidden">
                            <ImageComponent src={project.thumbnailUrl} alt={project.playlistTitle || project.title} className="w-full h-32 object-cover" />
                            <div className="p-4">
                                <div>
                                    <h3 className="text-xl font-bold text-blue-300 truncate">{project.playlistTitle || project.title}</h3>
                                    <p className="text-gray-400 italic mt-1 text-sm h-10 overflow-hidden">"{project.playlistDescription || ''}"</p>
                                </div>
                                <div className="text-xs text-gray-500 mt-2">Created: {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A'}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
