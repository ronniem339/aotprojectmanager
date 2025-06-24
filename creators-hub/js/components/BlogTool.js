// js/components/BlogTool.js

window.BlogTool = ({ settings, onBack, onGeneratePost, onPublishPosts, taskQueue, onViewPost, userId, db, displayNotification }) => {
    const { useState, useEffect, useMemo } = React;

    // --- STATE MANAGEMENT ---
    const [isGenerating, setIsGenerating] = useState(false);
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState('');
    const [videos, setVideos] = useState([]);
    const [selectedVideo, setSelectedVideo] = useState('');
    const [isGeneratingFromVideo, setIsGeneratingFromVideo] = useState(false);
    const [ideas, setIdeas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedRow, setExpandedRow] = useState(null);
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');
    const [filterTerm, setFilterTerm] = useState('');
    const [filterPostType, setFilterPostType] = useState('All');
    const [selectedIdeas, setSelectedIdeas] = useState(new Set());
    const [currentDashboardView, setCurrentDashboardView] = useState('active'); // 'new', 'active', 'closed'

    const { APP_ID } = window.CREATOR_HUB_CONFIG;
    
    // --- Reusable Button Styles using Tailwind classes ---
    const buttonStyles = {
        base: 'inline-flex items-center justify-center px-4 py-2 text-sm font-bold rounded-md transition-colors disabled:opacity-50',
        sm: 'px-3 py-1 text-xs',
        primary: 'bg-blue-600 hover:bg-blue-700 text-white',
        secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
        success: 'bg-green-600 hover:bg-green-700 text-white',
        danger: 'bg-red-600 hover:bg-red-700 text-white',
        outline: 'bg-transparent border border-gray-500 hover:bg-gray-700 text-gray-300'
    };


    const ideasCollectionRef = useMemo(() => {
        if (!userId) return null;
        return db.collection(`artifacts/${APP_ID}/users/${userId}/blogIdeas`);
    }, [db, APP_ID, userId]);

    // --- DATA FETCHING EFFECTS ---
    useEffect(() => {
        if (!ideasCollectionRef) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        const unsubscribe = ideasCollectionRef.orderBy(sortBy, sortOrder).onSnapshot(
            snapshot => {
                const fetchedIdeas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setIdeas(fetchedIdeas);
                setIsLoading(false);
            },
            err => {
                console.error("Error fetching blog ideas:", err);
                setIsLoading(false);
            }
        );
        return () => unsubscribe();
    }, [ideasCollectionRef, sortBy, sortOrder]);

    useEffect(() => {
        if (!userId) {
            setProjects([]);
            return;
        }
        const projectsCollectionRef = db.collection(`artifacts/${APP_ID}/users/${userId}/projects`);
        const unsubscribe = projectsCollectionRef.onSnapshot(
            snapshot => setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
            err => console.error("Error fetching projects:", err)
        );
        return () => unsubscribe();
    }, [db, APP_ID, userId]);

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
    const handleGenerateIdeas = async (e) => {
        e.preventDefault();
        const destination = e.target.elements.destination.value;
        if (!destination) return;
        setIsGenerating(true);
        try {
            // Corrected: Removed redundant knowledge base params. 
            // The settings object contains everything the function needs.
            const newIdeas = await window.aiUtils.generateBlogPostIdeasAI({
                destination, 
                settings,
            });
            const batch = db.batch();
            newIdeas.forEach(idea => {
                const docRef = ideasCollectionRef.doc();
                batch.set(docRef, { ...idea, status: 'new', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
            });
            await batch.commit();
        } catch (err) {
            console.error(`Failed to generate ideas: ${err.message}`);
            displayNotification(`Error: Failed to generate ideas. ${err.message}`);
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleGenerateFromVideo = async () => {
        if (!selectedProject || !selectedVideo) return;
        setIsGeneratingFromVideo(true);
        try {
            const videoData = videos.find(v => v.id === selectedVideo);
            const projectData = projects.find(p => p.id === selectedProject);
            if (!videoData || !projectData) {
                setIsGeneratingFromVideo(false);
                return;
            }
            // Corrected: Removed redundant knowledge base params.
            const newIdeas = await window.aiUtils.generateBlogPostIdeasFromVideoAI({
                video: videoData, 
                projectTitle: projectData.playlistTitle, 
                settings,
            });
            const batch = db.batch();
            newIdeas.forEach(idea => {
                const docRef = ideasCollectionRef.doc();
                batch.set(docRef, { ...idea, status: 'new', createdAt: firebase.firestore.FieldValue.serverTimestamp(), relatedProjectId: projectData.id, relatedVideoId: videoData.id, relatedProjectTitle: projectData.playlistTitle, relatedVideoTitle: videoData.title });
            });
            await batch.commit();
        } catch (err) {
            console.error(`Failed to generate ideas from video: ${err.message}`);
            displayNotification(`Error: Failed to generate ideas from video. ${err.message}`);
        } finally {
            setIsGeneratingFromVideo(false);
        }
    };

    const handleRowClick = (id) => setExpandedRow(expandedRow === id ? null : id);
    
    const handleIndividualDelete = async (e, ideaId) => {
        e.stopPropagation();
        try {
            await ideasCollectionRef.doc(ideaId).delete();
            displayNotification("Idea deleted successfully.");
        } catch (error) {
            console.error("Error deleting blog idea:", error);
            displayNotification(`Error: Could not delete idea. ${error.message}`);
        }
    };
    
    const handleIndividualWritePost = (e, idea) => {
        e.stopPropagation();
        onGeneratePost(idea);
    };

    const handleIndividualViewPost = (e, ideaId) => {
        e.stopPropagation();
        onViewPost(`generate-${ideaId}`);
    };

    const handleBulkUpdateStatus = async (ideaIds, newStatus) => {
        if (ideaIds.size === 0) return;
        const batch = db.batch();
        ideaIds.forEach(id => {
            const ref = ideasCollectionRef.doc(id);
            batch.update(ref, { status: newStatus });
        });
        try {
            await batch.commit();
            setSelectedIdeas(new Set());
            displayNotification(`Successfully updated ${ideaIds.size} item(s) to "${newStatus}".`);
        } catch (error) {
            console.error(`Error updating status to ${newStatus}:`, error);
            displayNotification(`Error: Could not update items. ${error.message}`);
        }
    };

    const handleBulkApprove = () => {
        const ideasToApprove = new Set(Array.from(selectedIdeas).filter(id => ideas.find(i => i.id === id)?.status === 'new'));
        if (ideasToApprove.size > 0) {
            handleBulkUpdateStatus(ideasToApprove, 'approved');
        }
    };
    
    const handleBulkReject = async () => {
        const ideasToReject = new Set(Array.from(selectedIdeas).filter(id => ideas.find(i => i.id === id)?.status === 'new'));
        if (ideasToReject.size > 0) {
            const batch = db.batch();
            ideasToReject.forEach(id => batch.delete(ideasCollectionRef.doc(id)));
            try {
                await batch.commit();
                setSelectedIdeas(new Set());
                displayNotification(`${ideasToReject.size} idea(s) rejected and deleted.`);
            } catch (error) {
                 console.error("Error rejecting ideas:", error);
                 displayNotification(`Error: Could not reject ideas. ${error.message}`);
            }
        }
    };

    const handleBulkGenerate = () => {
        const ideasToGenerate = ideas.filter(idea => selectedIdeas.has(idea.id) && idea.status === 'approved');
        if (ideasToGenerate.length > 0) {
            ideasToGenerate.forEach(idea => onGeneratePost(idea));
            setSelectedIdeas(new Set());
        }
    };

    const handleBulkPublish = () => {
        const ideasToPublish = ideas.filter(idea => selectedIdeas.has(idea.id) && idea.status === 'generated');
        if (ideasToPublish.length > 0) {
            onPublishPosts(ideasToPublish);
            setSelectedIdeas(new Set());
        }
    };
    
    const handleBulkClose = () => {
        const ideasToClose = new Set(Array.from(selectedIdeas).filter(id => ideas.find(i => i.id === id)?.status === 'published'));
        if (ideasToClose.size > 0) {
            handleBulkUpdateStatus(ideasToClose, 'closed');
        }
    };
    
    const handleBulkDelete = async () => {
        if (selectedIdeas.size > 0) {
            const batch = db.batch();
            selectedIdeas.forEach(id => batch.delete(ideasCollectionRef.doc(id)));
            try {
                await batch.commit();
                displayNotification(`${selectedIdeas.size} item(s) deleted successfully.`);
                setSelectedIdeas(new Set());
            } catch (error) {
                 console.error("Error during bulk deletion:", error);
                 displayNotification(`Error: Could not delete items. ${error.message}`);
            }
        }
    };

    const handleSort = (column) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };
    
    const selectedIdeasStats = useMemo(() => {
        const stats = { new: 0, approved: 0, generated: 0, published: 0, total: 0 };
        selectedIdeas.forEach(id => {
            const idea = ideas.find(i => i.id === id);
            if (idea) {
                stats.total++;
                if (idea.status === 'new') stats.new++;
                if (idea.status === 'approved') stats.approved++;
                if (idea.status === 'generated') stats.generated++;
                if (idea.status === 'published') stats.published++;
            }
        });
        return stats;
    }, [selectedIdeas, ideas]);

    const sortedAndFilteredIdeas = useMemo(() => {
        const activeStatuses = ['approved', 'generated', 'published', 'queued', 'generating', 'failed'];
        let viewFilteredIdeas;
        if (currentDashboardView === 'new') {
            viewFilteredIdeas = ideas.filter(idea => idea.status === 'new');
        } else if (currentDashboardView === 'active') {
            viewFilteredIdeas = ideas.filter(idea => activeStatuses.includes(idea.status));
        } else { // 'closed'
            viewFilteredIdeas = ideas.filter(idea => idea.status === 'closed');
        }
        if (filterTerm) {
            const lowerCaseFilterTerm = filterTerm.toLowerCase();
            viewFilteredIdeas = viewFilteredIdeas.filter(idea =>
                (idea.title?.toLowerCase().includes(lowerCaseFilterTerm)) ||
                (idea.description?.toLowerCase().includes(lowerCaseFilterTerm)) ||
                (idea.primaryKeyword?.toLowerCase().includes(lowerCaseFilterTerm))
            );
        }
        if (filterPostType !== 'All') {
            viewFilteredIdeas = viewFilteredIdeas.filter(idea => idea.postType === filterPostType);
        }
        return viewFilteredIdeas;
    }, [ideas, filterTerm, filterPostType, currentDashboardView]);

    const toggleSelectAll = () => {
        if (selectedIdeas.size === sortedAndFilteredIdeas.length) {
            setSelectedIdeas(new Set());
        } else {
            setSelectedIdeas(new Set(sortedAndFilteredIdeas.map(idea => idea.id)));
        }
    };

    const handleSelectIdea = (ideaId) => {
        const newSelection = new Set(selectedIdeas);
        newSelection.has(ideaId) ? newSelection.delete(ideaId) : newSelection.add(ideaId);
        setSelectedIdeas(newSelection);
    };

    // --- RENDER FUNCTIONS ---
    
    const renderGeneratorUI = () => (
        <div className="glass-card p-4 sm:p-6 rounded-lg mb-8">
            <h3 className="text-lg font-semibold mb-4 text-white">Generate New Ideas</h3>
            <div className="space-y-6">
                <div>
                    <form onSubmit={handleGenerateIdeas} className="space-y-3">
                        <label htmlFor="destination" className="block text-sm font-medium text-gray-300">From a Topic or Destination</label>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <input type="text" id="destination" name="destination" className="form-input flex-grow" placeholder="e.g., 'Best hikes in the Lake District'" required />
                            <button type="submit" disabled={isGenerating} className={`${buttonStyles.base} ${buttonStyles.primary} w-full sm:w-auto`}>
                                {isGenerating ? <window.LoadingSpinner isButton={true} /> : 'Generate Ideas'}
                            </button>
                        </div>
                    </form>
                </div>
                <div className="flex items-center"><div className="flex-grow border-t border-gray-600"></div><span className="flex-shrink mx-4 text-gray-400">OR</span><div className="flex-grow border-t border-gray-600"></div></div>
                <div>
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-300">From an Existing Video</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <select id="project-select" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="form-select" disabled={projects.length === 0}>
                                <option value="">{projects.length === 0 ? 'Loading projects...' : 'Select a Project'}</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.playlistTitle || 'Untitled Project'}</option>)}
                            </select>
                            <select id="video-select" value={selectedVideo} onChange={(e) => setSelectedVideo(e.target.value)} className="form-select" disabled={!selectedProject}>
                                <option value="">{ !selectedProject ? 'Select project' : (videos.length === 0 ? 'No videos' : 'Select a Video')}</option>
                                {videos.map(v => <option key={v.id} value={v.id}>{v.title || 'Untitled Video'}</option>)}
                            </select>
                        </div>
                        <button onClick={handleGenerateFromVideo} disabled={isGeneratingFromVideo || !selectedVideo} className={`${buttonStyles.base} ${buttonStyles.secondary} w-full mt-3`}>
                            {isGeneratingFromVideo ? <window.LoadingSpinner isButton={true} /> : 'Generate From Video'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
    
    const renderPipelineDashboard = () => {
        const getSortIcon = (column) => sortBy === column ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : '';
        const uniquePostTypes = ['All', ...new Set(ideas.map(idea => idea.postType).filter(Boolean))];
        const getStatusClass = (status) => ({
            'new': 'bg-yellow-900/50 text-yellow-400', 'approved': 'bg-gray-700 text-gray-300',
            'generating': 'bg-blue-900/50 text-blue-400 animate-pulse', 'generated': 'bg-green-900/50 text-green-400',
            'published': 'bg-purple-900/50 text-purple-400', 'failed': 'bg-red-900/50 text-red-400',
            'closed': 'bg-gray-900/50 text-gray-500', 'queued': 'bg-indigo-900/50 text-indigo-400'
        })[status] || 'bg-gray-700';
        const checkboxClass = "h-5 w-5 rounded bg-gray-700 border-gray-500 text-blue-600 focus:ring-blue-500";


        const ExpandedContent = ({ idea }) => (
            <div className="p-4 bg-gray-800/30">
                <div className="space-y-3">
                    <div><h4 className="font-semibold text-gray-400 text-xs">Description</h4><p className="text-sm text-gray-300">{idea.description}</p></div>
                    <div><h4 className="font-semibold text-gray-400 text-xs">Primary Keyword</h4><p className="px-2 py-1 text-sm bg-secondary-accent-darker-opacity text-secondary-accent-lighter-text rounded-full inline-block">{idea.primaryKeyword}</p></div>
                    {idea.monetizationOpportunities && (<div className="p-2 bg-green-900/20 border-l-2 border-green-500"><h4 className="font-semibold text-green-400 text-xs">Monetization Angle</h4><p className="text-sm text-green-300/90 italic">{idea.monetizationOpportunities}</p></div>)}
                    {idea.blogPostContent && (<div><h4 className="font-semibold text-gray-400 text-xs">Generated Content (Preview)</h4><p className="text-sm text-gray-300 border-l-2 border-gray-600 pl-2 italic">{idea.blogPostContent.substring(0, 200)}...</p></div>)}
                </div>
            </div>
        );

        const renderBulkActionButtons = () => {
            const commonDeleteButton = <button onClick={handleBulkDelete} className={`${buttonStyles.base} ${buttonStyles.danger}`} disabled={selectedIdeasStats.total === 0}>Delete ({selectedIdeasStats.total})</button>;
            if (currentDashboardView === 'new') {
                return <><button onClick={handleBulkApprove} className={`${buttonStyles.base} ${buttonStyles.success}`} disabled={selectedIdeasStats.new === 0}>Approve ({selectedIdeasStats.new})</button><button onClick={handleBulkReject} className={`${buttonStyles.base} ${buttonStyles.danger}`} disabled={selectedIdeasStats.new === 0}>Reject ({selectedIdeasStats.new})</button>{commonDeleteButton}</>;
            }
            if (currentDashboardView === 'active') {
                return <><button onClick={handleBulkGenerate} className={`${buttonStyles.base} ${buttonStyles.secondary}`} disabled={selectedIdeasStats.approved === 0}>Generate ({selectedIdeasStats.approved})</button><button onClick={handleBulkPublish} className={`${buttonStyles.base} ${buttonStyles.secondary}`} disabled={selectedIdeasStats.generated === 0}>Publish ({selectedIdeasStats.generated})</button><button onClick={handleBulkClose} className={`${buttonStyles.base} ${buttonStyles.secondary}`} disabled={selectedIdeasStats.published === 0}>Close ({selectedIdeasStats.published})</button>{commonDeleteButton}</>;
            }
            return commonDeleteButton;
        };

        if (isLoading) return <window.LoadingSpinner text="Loading pipeline..." />;
        
        return (
            <div className="mt-8">
                <h3 className="text-xl font-bold mb-4">Content Pipeline</h3>
                <div className="mb-4 flex items-center border-b border-gray-700">
                     {['new', 'active', 'closed'].map(view => (
                        <button key={view} onClick={() => { setSelectedIdeas(new Set()); setCurrentDashboardView(view); }} className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${currentDashboardView === view ? 'border-b-2 border-primary-accent text-white' : 'text-gray-400 hover:text-white'}`}>
                            {view === 'active' ? 'Active Pipeline' : `${view} Ideas`}
                        </button>
                     ))}
                </div>
                <div className="mb-4 flex flex-col md:flex-row gap-4">
                    <input type="text" placeholder="Search ideas..." value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)} className="form-input flex-grow"/>
                    <select value={filterPostType} onChange={(e) => setFilterPostType(e.target.value)} className="form-input w-full md:w-auto">
                        {uniquePostTypes.map(type => (<option key={type} value={type}>{type}</option>))}
                    </select>
                </div>
                <div className="mb-4 flex flex-wrap gap-2 items-center">{renderBulkActionButtons()}</div>
                
                {sortedAndFilteredIdeas.length === 0 ? 
                    <div className="text-center text-gray-400 py-8"><p>No ideas in this view.</p></div> 
                    :
                    <>
                        {/* --- Desktop Table View --- */}
                        <div className="hidden md:block overflow-x-auto glass-card rounded-lg">
                            <table className="w-full text-left table-auto">
                                <thead className="bg-gray-800/50">
                                    <tr>
                                        <th className="p-3 w-px"><input type="checkbox" className={checkboxClass} onChange={toggleSelectAll} checked={selectedIdeas.size > 0 && sortedAndFilteredIdeas.length > 0 && selectedIdeas.size === sortedAndFilteredIdeas.length}/></th>
                                        <th className="p-3 w-2/5 cursor-pointer" onClick={() => handleSort('title')}>Title {getSortIcon('title')}</th>
                                        <th className="p-3 cursor-pointer" onClick={() => handleSort('postType')}>Type {getSortIcon('postType')}</th>
                                        <th className="p-3 cursor-pointer" onClick={() => handleSort('status')}>Status {getSortIcon('status')}</th>
                                        <th className="p-3 cursor-pointer" onClick={() => handleSort('relatedProjectTitle')}>Origin {getSortIcon('relatedProjectTitle')}</th>
                                        <th className="p-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {sortedAndFilteredIdeas.map(idea => (
                                        <React.Fragment key={idea.id}>
                                            <tr className="hover:bg-gray-800/50 cursor-pointer" onClick={() => handleRowClick(idea.id)}>
                                                <td className="p-3"><input type="checkbox" className={checkboxClass} checked={selectedIdeas.has(idea.id)} onChange={() => handleSelectIdea(idea.id)} onClick={(e) => e.stopPropagation()}/></td>
                                                <td className="p-3 font-semibold text-primary-accent">{idea.title}</td>
                                                <td className="p-3"><span className="px-2 py-1 text-xs bg-teal-800 text-teal-200 rounded-full">{idea.postType || 'N/A'}</span></td>
                                                <td className="p-3"><span className={`px-2 py-1 text-xs rounded-full capitalize ${getStatusClass(idea.status)}`}>{idea.status}</span></td>
                                                <td className="p-3 text-sm text-gray-300">{idea.relatedProjectTitle || idea.relatedVideoTitle || 'N/A'}</td>
                                                <td className="p-3 text-right space-x-2">
                                                    {idea.status === 'approved' ? (
                                                        <button className={`${buttonStyles.base} ${buttonStyles.sm} ${buttonStyles.primary}`} onClick={(e) => handleIndividualWritePost(e, idea)}>Write</button>
                                                    ) : (
                                                        <button className={`${buttonStyles.base} ${buttonStyles.sm} ${buttonStyles.secondary}`} onClick={(e) => handleIndividualViewPost(e, idea.id)} disabled={!idea.blogPostContent}>View</button>
                                                    )}
                                                    <button onClick={(e) => handleIndividualDelete(e, idea.id)} className={`${buttonStyles.base} ${buttonStyles.sm} ${buttonStyles.danger}`}>Del</button>
                                                </td>
                                            </tr>
                                            {expandedRow === idea.id && (<tr className="bg-gray-800/30"><td colSpan="6"><ExpandedContent idea={idea} /></td></tr>)}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* --- Mobile Card View --- */}
                        <div className="md:hidden space-y-4">
                            {sortedAndFilteredIdeas.map(idea => (
                                <div key={idea.id} className="glass-card rounded-lg overflow-hidden">
                                    <div className="p-4" onClick={() => handleRowClick(idea.id)}>
                                        <div className="flex justify-between items-start mb-2">
                                            <input type="checkbox" className={`${checkboxClass} mr-4 mt-1 flex-shrink-0`} checked={selectedIdeas.has(idea.id)} onChange={() => handleSelectIdea(idea.id)} onClick={(e) => e.stopPropagation()} />
                                            <h3 className="font-bold text-lg text-primary-accent pr-2 flex-grow">{idea.title}</h3>
                                        </div>
                                        <div className="ml-8 space-y-3">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className={`px-2 py-1 text-xs rounded-full capitalize ${getStatusClass(idea.status)}`}>{idea.status}</span>
                                                <span className="px-2 py-1 text-xs bg-teal-800 text-teal-200 rounded-full">{idea.postType || 'N/A'}</span>
                                            </div>
                                             <div className="text-sm text-gray-400">
                                                 <strong>Origin:</strong> {idea.relatedProjectTitle || idea.relatedVideoTitle || 'N/A'}
                                              </div>
                                            <div className="flex gap-2 pt-2 border-t border-gray-700/50">
                                                {idea.status === 'approved' ? (
                                                    <button className={`${buttonStyles.base} ${buttonStyles.sm} ${buttonStyles.primary} flex-grow`} onClick={(e) => handleIndividualWritePost(e, idea)}>Write Post</button>
                                                ) : (
                                                    <button className={`${buttonStyles.base} ${buttonStyles.sm} ${buttonStyles.secondary} flex-grow`} onClick={(e) => handleIndividualViewPost(e, idea.id)} disabled={!idea.blogPostContent}>View Post</button>
                                                )}
                                                 <button onClick={(e) => handleIndividualDelete(e, idea.id)} className={`${buttonStyles.base} ${buttonStyles.sm} ${buttonStyles.danger} flex-grow`}>Delete</button>
                                            </div>
                                        </div>
                                    </div>
                                    {expandedRow === idea.id && <ExpandedContent idea={idea} />}
                                </div>
                            ))}
                        </div>
                    </>
                }
            </div>
        );
    };

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <header className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 gap-4">
                <h1 className="text-3xl sm:text-4xl font-bold text-white text-center sm:text-left">✍️ Blog Post Factory</h1>
                <button onClick={onBack} className={`${buttonStyles.base} ${buttonStyles.outline} w-full sm:w-auto justify-center`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Tools
                </button>
            </header>
            {renderGeneratorUI()}
            {renderPipelineDashboard()}
        </div>
    );
};
