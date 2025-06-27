window.BlogTool = ({ settings, onBack, onGeneratePost, onPublishPosts, taskQueue, onViewPost, userId, db, displayNotification }) => {
    const { useState, useEffect, useMemo, useCallback } = React;

    // --- STATE MANAGEMENT ---
    const [isGenerating, setIsGenerating] = useState(false);
    const [projects, setProjects] = useState([]);
    const [videos, setVideos] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [selectedVideoId, setSelectedVideoId] = useState('');
    const [ideas, setIdeas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [topic, setTopic] = useState('');
    const [destination, setDestination] = useState('');
    const [expandedRow, setExpandedRow] = useState(null);
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');
    const [filterTerm, setFilterTerm] = useState('');
    const [filterPostType, setFilterPostType] = useState('All');
    const [selectedIdeas, setSelectedIdeas] = useState(new Set());
    const [currentDashboardView, setCurrentDashboardView] = useState('new');

    const { APP_ID } = window.CREATOR_HUB_CONFIG;
    
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

    // --- DATA FETCHING (FIXED) ---
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
        if (!selectedProjectId || !userId) {
            setVideos([]);
            setSelectedVideoId('');
            return;
        }
        const videosCollectionRef = db.collection(`artifacts/${APP_ID}/users/${userId}/projects/${selectedProjectId}/videos`);
        const unsubscribe = videosCollectionRef.onSnapshot(
            snapshot => {
                const fetchedVideos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setVideos(fetchedVideos);
                if (selectedVideoId && !fetchedVideos.some(v => v.id === selectedVideoId)) {
                    setSelectedVideoId('');
                }
            },
            err => {
                console.error("Error fetching videos for project:", err);
                setVideos([]);
            }
        );
        return () => unsubscribe();
    }, [db, APP_ID, userId, selectedProjectId, selectedVideoId]);

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
    
    // --- HANDLER FUNCTIONS (Unified) ---
    const handleGenerateIdeas = useCallback(async () => {
        setIsGenerating(true);
        try {
            let generationParams = { settings };
            const selectedVideo = videos.find(v => v.id === selectedVideoId);

            if (selectedVideo) {
                generationParams.video = selectedVideo;
                const existingIdeasSnapshot = await ideasCollectionRef.where('relatedVideoId', '==', selectedVideo.id).get();
                const existingIdeas = existingIdeasSnapshot.docs.map(doc => doc.data());
                generationParams.approvedIdeas = existingIdeas.filter(idea => idea.status === 'approved');
                generationParams.rejectedIdeas = existingIdeas.filter(idea => idea.status === 'rejected');

            } else if (topic || destination) {
                generationParams.topic = topic;
                generationParams.destination = destination;
            } else {
                displayNotification("Please provide a topic/destination or select a video.", "info");
                setIsGenerating(false);
                return;
            }

            const newIdeas = await window.aiUtils.generateBlogIdeasAI(generationParams);
            
            const batch = db.batch();
            newIdeas.forEach(idea => {
                const docRef = ideasCollectionRef.doc();
                const projectData = projects.find(p => p.id === selectedProjectId);
                const relatedData = selectedVideo
                    ? { relatedProjectId: selectedProjectId, relatedProjectTitle: projectData?.playlistTitle || 'N/A', relatedVideoId: selectedVideo.id, relatedVideoTitle: selectedVideo.title }
                    : {};
                batch.set(docRef, { 
                    ...idea, 
                    status: 'new', 
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    ...relatedData
                });
            });
            await batch.commit();
            displayNotification(`${newIdeas.length} new blog post ideas generated!`, 'success');

            setTopic('');
            setDestination('');
            setSelectedVideoId('');
            setSelectedProjectId('');

        } catch (err) {
            console.error(`Failed to generate ideas: ${err.message}`);
            displayNotification(`Error: Failed to generate ideas. ${err.message}`, 'error');
        } finally {
            setIsGenerating(false);
        }
    }, [settings, videos, selectedVideoId, selectedProjectId, topic, destination, db, ideasCollectionRef, displayNotification, projects]);

    const handleRowClick = (id) => setExpandedRow(expandedRow === id ? null : id);
    
    const handleIndividualDelete = async (e, ideaId) => {
        e.stopPropagation();
        try {
            await ideasCollectionRef.doc(ideaId).delete();
            displayNotification("Idea deleted successfully.", "success");
        } catch (error) {
            console.error("Error deleting blog idea:", error);
            displayNotification(`Error: Could not delete idea. ${error.message}`, "error");
        }
    };
    
    const handleIndividualWritePost = (e, idea) => {
        e.stopPropagation();
        onGeneratePost(idea);
    };

    const handleIndividualViewPost = (e, idea) => {
        e.stopPropagation();
        onViewPost(idea);
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
            displayNotification(`Successfully updated ${ideaIds.size} item(s) to "${newStatus}".`, 'success');
        } catch (error) {
            console.error(`Error updating status to ${newStatus}:`, error);
            displayNotification(`Error: Could not update items. ${error.message}`, 'error');
        }
    };

    const handleBulkApprove = () => {
        const ideasToApprove = new Set(Array.from(selectedIdeas).filter(id => ideas.find(i => i.id === id)?.status === 'new'));
        if (ideasToApprove.size > 0) {
            handleBulkUpdateStatus(ideasToApprove, 'approved');
        }
    };
    
    const handleBulkReject = () => {
        const ideasToReject = new Set(Array.from(selectedIdeas).filter(id => ideas.find(i => i.id === id)?.status === 'new'));
        if (ideasToReject.size > 0) {
            handleBulkUpdateStatus(ideasToReject, 'rejected');
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

    const handlePublish = (ideasToPublish) => {
        onPublishPosts(ideasToPublish);
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
                displayNotification(`${selectedIdeas.size} item(s) deleted successfully.`, 'success');
                setSelectedIdeas(new Set());
            } catch (error) {
                console.error("Error during bulk deletion:", error);
                displayNotification(`Error: Could not delete items. ${error.message}`, 'error');
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
        
        // Exclude rejected ideas from all views
        viewFilteredIdeas = viewFilteredIdeas.filter(idea => idea.status !== 'rejected');

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
        return viewFilteredIdeas; // Sorting is now handled by the useEffect for ideas
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
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-gray-300">From a Topic or Destination</label>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <input type="text" value={topic} onChange={e => setTopic(e.target.value)} disabled={!!selectedVideoId} className="form-input flex-grow disabled:opacity-50" placeholder="e.g., 'adventure travel'" />
                                <input type="text" value={destination} onChange={e => setDestination(e.target.value)} disabled={!!selectedVideoId} className="form-input flex-grow disabled:opacity-50" placeholder="e.g., 'Lake District'" />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center"><div className="flex-grow border-t border-gray-600"></div><span className="flex-shrink mx-4 text-gray-400">OR</span><div className="flex-grow border-t border-gray-600"></div></div>
                    <div>
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-gray-300">From an Existing Video</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className="form-select" disabled={projects.length === 0 || !!topic || !!destination}>
                                    <option value="">{projects.length === 0 ? 'Loading projects...' : 'Select a Project'}</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.playlistTitle || 'Untitled Project'}</option>)}
                                </select>
                                <select value={selectedVideoId} onChange={(e) => setSelectedVideoId(e.target.value)} className="form-select" disabled={!selectedProjectId || !!topic || !!destination}>
                                    <option value="">{ !selectedProjectId ? 'Select project first' : (videos.length === 0 ? 'No videos in project' : 'Select a Video')}</option>
                                    {videos.map(v => <option key={v.id} value={v.id}>{v.title || 'Untitled Video'}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    <button onClick={handleGenerateIdeas} disabled={isGenerating || (!topic && !destination && !selectedVideoId)} className={`${buttonStyles.base} ${buttonStyles.primary} w-full mt-3`}>
                        {isGenerating ? <window.LoadingSpinner isButton={true} /> : 'Generate Ideas'}
                    </button>
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
                    <div><h4 className="font-semibold text-gray-400 text-xs">Primary Keyword</h4><p className="px-2 py-1 text-sm bg-gray-700 text-gray-200 rounded-full inline-block">{idea.primaryKeyword}</p></div>
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
        
        return <BlogIdeasDashboard 
            userId={userId} 
            db={db} 
            settings={settings} 
            onWritePost={onGeneratePost} 
            onPublishPosts={onPublishPosts} 
            onViewPost={onViewPost} />;
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
