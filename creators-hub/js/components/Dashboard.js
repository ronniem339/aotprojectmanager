// js/components/Dashboard.js

window.Dashboard = ({ userId, onSelectProject, onShowSettings, onShowProjectSelection, onShowDeleteConfirm, onShowTools, db, auth }) => {
    const { useState, useEffect, useRef, useMemo } = React;
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const projectCardsRef = useRef(null);
    const appId = window.CREATOR_HUB_CONFIG.APP_ID;

    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('lastAccessed');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [timeSinceDeploy, setTimeSinceDeploy] = useState('');

    useEffect(() => {
        const calculateTimeSince = () => {
            if (!window.CREATOR_HUB_CONFIG.BUILD_TIMESTAMP) return '';

            const buildTime = new Date(window.CREATOR_HUB_CONFIG.BUILD_TIMESTAMP);
            const now = new Date();
            const seconds = Math.floor((now - buildTime) / 1000);

            let interval = seconds / 31536000;
            if (interval > 1) return `~${Math.floor(interval)} years ago`;
            interval = seconds / 2592000;
            if (interval > 1) return `~${Math.floor(interval)} months ago`;
            interval = seconds / 86400;
            if (interval > 1) return `~${Math.floor(interval)} days ago`;
            interval = seconds / 3600;
            if (interval > 1) return `~${Math.floor(interval)} hours ago`;
            interval = seconds / 60;
            if (interval > 1) return `${Math.floor(interval)} minutes ago`;
            return "just now";
        };

        setTimeSinceDeploy(calculateTimeSince());
        const timer = setInterval(() => {
            setTimeSinceDeploy(calculateTimeSince());
        }, 60000);

        return () => clearInterval(timer);
    }, []);

    const getColorForString = (str) => {
        const colorPalette = [
            'border-sky-500', 
            'border-amber-500', 
            'border-emerald-500', 
            'border-rose-500', 
            'border-indigo-500',
            'border-teal-500',
            'border-fuchsia-500',
            'border-lime-500'
        ];
        let hash = 0;
        if (str.length === 0) return colorPalette[0];
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        const index = Math.abs(hash % colorPalette.length);
        return colorPalette[index];
    };

    useEffect(() => {
        if (!userId || !db) {
            setLoading(false);
            return;
        }
        
        const projectsCollectionRef = db.collection(`artifacts/${appId}/users/${userId}/projects`).orderBy("createdAt", "desc");
        
        const unsubscribe = projectsCollectionRef.onSnapshot(async (querySnapshot) => {
            const projectsData = [];
            querySnapshot.forEach((doc) => {
                projectsData.push({ id: doc.id, ...doc.data() });
            });

            const projectsWithProgress = await Promise.all(projectsData.map(async (project) => {
                const videosCollectionRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${project.id}/videos`);
                const videosSnapshot = await videosCollectionRef.get();
                const videos = videosSnapshot.docs.map(doc => doc.data());

                const totalTasks = window.CREATOR_HUB_CONFIG.TASK_PIPELINE.length;
                if (videos.length === 0 || totalTasks === 0) {
                    return { ...project, progress: 0, videoCount: videos.length };
                }

                let totalCompletedTasks = 0;
                videos.forEach(video => {
                    if (video.tasks) {
                        totalCompletedTasks += Object.values(video.tasks).filter(status => status === 'complete').length;
                    }
                });

                const maxPossibleTasks = videos.length * totalTasks;
                const progress = maxPossibleTasks > 0 ? (totalCompletedTasks / maxPossibleTasks) * 100 : 0;
                
                return { ...project, progress, videoCount: videos.length };
            }));

            setProjects(projectsWithProgress);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching projects and progress:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId, db, appId]);

    const sortedAndFilteredProjects = useMemo(() => {
        let currentProjects = [...projects];

        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            currentProjects = currentProjects.filter(project =>
                (project.playlistTitle && project.playlistTitle.toLowerCase().includes(lowerCaseSearchTerm)) ||
                (project.playlistDescription && project.playlistDescription.toLowerCase().includes(lowerCaseSearchTerm))
            );
        }

        currentProjects.sort((a, b) => {
            const secondarySort = (projA, projB) => {
                const lastAccessedA = projA.lastAccessed?.toDate ? projA.lastAccessed.toDate().getTime() : 0;
                const lastAccessedB = projB.lastAccessed?.toDate ? projB.lastAccessed.toDate().getTime() : 0;
                if (lastAccessedA !== lastAccessedB) return lastAccessedB - lastAccessedA;
                if (projA.progress !== projB.progress) return projA.progress - projB.progress;
                const createdAtA = projA.createdAt ? new Date(projA.createdAt).getTime() : 0;
                const createdAtB = projB.createdAt ? new Date(projB.createdAt).getTime() : 0;
                return createdAtB - createdAtA;
            };

            switch (sortBy) {
                case 'alphabetical':
                    const titleA = (a.playlistTitle || '').toLowerCase();
                    const titleB = (b.playlistTitle || '').toLowerCase();
                    if (titleA < titleB) return -1;
                    if (titleA > titleB) return 1;
                    return secondarySort(a, b);
                case 'dateCreated':
                    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    if (dateA !== dateB) return dateB - dateA;
                    return secondarySort(a, b);
                case 'completion':
                    if (a.progress !== b.progress) return b.progress - a.progress;
                    return secondarySort(a, b);
                case 'lastAccessed':
                default:
                    return secondarySort(a, b);
            }
        });

        return currentProjects;
    }, [projects, searchTerm, sortBy]);

    const activeProjects = useMemo(() => sortedAndFilteredProjects.filter(p => p.progress < 100), [sortedAndFilteredProjects]);
    const completedProjects = useMemo(() => sortedAndFilteredProjects.filter(p => p.progress >= 100), [sortedAndFilteredProjects]);

    const handleDeleteClick = (e, project) => {
        e.stopPropagation();
        onShowDeleteConfirm(project);
    };

    const generateImageSearchTerm = (title) => {
        if (!title) return 'travel,adventure';
        return title.replace(/\(.*?\)/g, '').split(/[:\-|]/)[0].trim().split(' ').slice(0, 3).join(',');
    };

    const handleLogout = async () => {
        try {
            if (auth) {
                await auth.signOut();
            }
        } catch (error) {
            console.error("Error logging out:", error);
        }
    };

    return (
        <div className="p-4 sm:p-8">
            <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div className="w-full flex justify-between items-center md:hidden">
                    <h1 className="text-2xl font-bold text-white">Creator's Hub</h1>
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 rounded-md text-gray-400 hover:bg-gray-700/50 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"></path></svg>
                    </button>
                </div>

                <div className={`w-full flex flex-col md:flex-row md:items-center justify-end gap-4 transition-all duration-300 ease-in-out ${isMobileMenuOpen ? 'flex' : 'hidden md:flex'}`}>
                    <div className="relative flex-grow md:flex-grow-0 md:w-64">
                        <input type="text" placeholder="Search projects..." className="form-input w-full pl-10 bg-gray-800 border-gray-700 text-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <div className="flex-shrink-0 md:w-auto">
                        <label htmlFor="sort-by" className="sr-only">Sort by</label>
                        <select id="sort-by" className="form-input w-full bg-gray-800 border-gray-700 text-white p-2" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                            <option value="lastAccessed">Last Accessed</option>
                            <option value="completion">Completion</option>
                            <option value="dateCreated">Date Created</option>
                            <option value="alphabetical">Alphabetical</option>
                        </select>
                    </div>
                    
                    <button onClick={onShowProjectSelection} className="flex items-center justify-center gap-2 glass-card px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex-shrink-0">✨ New Project</button>
                    <button onClick={onShowTools} className="flex items-center justify-center gap-2 glass-card px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex-shrink-0">🛠️ Tools</button>
                    <button onClick={onShowSettings} className="flex items-center justify-center gap-2 glass-card px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex-shrink-0">⚙️ Settings</button>
                    <button onClick={handleLogout} className="flex items-center justify-center gap-2 glass-card px-4 py-2 rounded-lg hover:bg-red-800 transition-colors text-red-400 hover:text-white flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                        </svg>
                        Logout
                    </button>
                </div>
            </header>

            {loading ? <window.LoadingSpinner text="Loading Projects..." /> : (
                <>
                    <h2 className="text-2xl font-bold text-white mb-4">Active Projects</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12" ref={projectCardsRef}>
                        {activeProjects.length === 0 ? (
                            <p className="text-gray-400 text-center col-span-full py-8">No active projects found.</p>
                        ) : (
                            activeProjects.map(project => {
                                const imageUrl = project.coverImageUrl || `https://source.unsplash.com/600x400/?${encodeURIComponent(generateImageSearchTerm(project.playlistTitle))}`;
                                const borderColorClass = getColorForString(project.id);
                                const isSingleVideo = project.videoCount === 1;
                                
                                return (
                                    <div key={project.id} onClick={() => onSelectProject(project)} className={`glass-card rounded-lg flex flex-col justify-between cursor-pointer hover:shadow-2xl hover:shadow-primary-accent/[.20] hover:-translate-y-1 transition-all overflow-hidden group border-l-4 ${borderColorClass}`}>
                                        <div className="relative pt-[56.25%] overflow-hidden">
                                            <window.ImageComponent src={imageUrl} alt={project.playlistTitle || project.title} className="absolute inset-0 w-full h-full object-cover" />
                                            <button onClick={(e) => handleDeleteClick(e, project)} className="absolute top-2 right-2 p-1.5 bg-red-800/70 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-700 transition-opacity" aria-label="Delete project">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </div>
                                        <div className="p-4 flex-grow flex flex-col">
                                            <div className="flex-grow">
                                                <h3 className="text-xl font-bold text-primary-accent truncate">{project.playlistTitle || project.title}</h3>
                                                <p className="text-gray-400 italic mt-1 text-sm h-10 overflow-hidden">"{project.playlistDescription || ''}"</p>
                                            </div>
                                            <div className="mt-4">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs font-semibold text-gray-400">Progress</span>
                                                    <span className="text-xs font-bold text-green-400">{`${project.progress.toFixed(0)}%`}</span>
                                                </div>
                                                <div className="w-full bg-gray-700 rounded-full h-1.5">
                                                    <div className="bg-green-500 h-1.5 rounded-full" style={{width: `${project.progress}%`}}></div>
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-700/50">
                                                <div className="flex justify-between items-center">
                                                    <span>{project.videoCount} {project.videoCount === 1 ? 'Video' : 'Videos'} • {isSingleVideo ? 'Single Video Project' : 'Playlist'}</span>
                                                    <span>Created: {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    
                    <h2 className="text-2xl font-bold text-white mb-4">Completed Projects</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {completedProjects.length === 0 ? (
                            <p className="text-gray-400 text-center col-span-full py-8">No completed projects yet.</p>
                        ) : (
                            completedProjects.map(project => {
                                const borderColorClass = getColorForString(project.id);
                                return (
                                    <div key={project.id} onClick={() => onSelectProject(project)} className={`glass-card rounded-lg flex items-center p-3 gap-3 cursor-pointer hover:bg-gray-700/50 transition-colors group border-l-4 ${borderColorClass}`}>
                                        <div className="flex-grow min-w-0">
                                            <h4 className="font-semibold text-primary-accent truncate">{project.playlistTitle}</h4>
                                            <p className="text-xs text-gray-400 truncate">{project.videoCount} {project.videoCount === 1 ? 'Video' : 'Videos'}</p>
                                        </div>
                                        <span className="flex-shrink-0 text-green-400 text-2xl" title="Completed">✓</span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </>
            )}
            
            <div className="text-center mt-12 text-xs text-gray-500">
                Last updated: {timeSinceDeploy}
            </div>
        </div>
    );
};
