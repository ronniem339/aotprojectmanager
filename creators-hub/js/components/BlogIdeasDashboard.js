// js/components/BlogIdeasDashboard.js

window.BlogIdeasDashboard = ({ userId, db, settings, onWritePost, onPublishPosts, processingIdeaId }) => {
    const { useState, useEffect, useMemo } = React;
    const [ideas, setIdeas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedRow, setExpandedRow] = useState(null);
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');
    const [filterTerm, setFilterTerm] = useState('');
    const [filterPostType, setFilterPostType] = useState('All');
    const [selectedIdeas, setSelectedIdeas] = useState(new Set());
    const [currentDashboardView, setCurrentDashboardView] = useState('active'); // 'new', 'active', 'closed'
    const appId = window.CREATOR_HUB_CONFIG.APP_ID;

    // Effect to fetch blog ideas
    useEffect(() => {
        if (!userId || !db) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const ideasCollectionRef = db.collection(`artifacts/${appId}/users/${userId}/blogIdeas`).orderBy(sortBy, sortOrder);

        const unsubscribe = ideasCollectionRef.onSnapshot(snapshot => {
            const fetchedIdeas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setIdeas(fetchedIdeas);
            setIsLoading(false);
        }, error => {
            console.error("Error fetching blog ideas:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [userId, db, appId, sortBy, sortOrder]);

    const handleRowClick = (id) => {
        setExpandedRow(expandedRow === id ? null : id);
    };

    const handleWritePost = (e, idea) => {
        e.stopPropagation();
        onWritePost(idea);
    };

    // --- Bulk Action Handlers ---

    const handleBulkUpdateStatus = async (ideaIds, newStatus) => {
        if (ideaIds.size === 0) return;
        
        const batch = db.batch();
        ideaIds.forEach(id => {
            const ref = db.collection(`artifacts/${appId}/users/${userId}/blogIdeas`).doc(id);
            batch.update(ref, { status: newStatus });
        });

        try {
            await batch.commit();
            setSelectedIdeas(new Set()); // Clear selection after action
        } catch (error) {
            console.error(`Error updating status to ${newStatus}:`, error);
            alert(`An error occurred while updating posts. Please try again.`);
        }
    };

    const handleBulkApprove = () => {
        const ideasToApprove = new Set(Array.from(selectedIdeas).filter(id => {
            const idea = ideas.find(i => i.id === id);
            return idea && idea.status === 'new';
        }));
        if (ideasToApprove.size > 0 && window.confirm(`Are you sure you want to approve ${ideasToApprove.size} new ideas?`)) {
            handleBulkUpdateStatus(ideasToApprove, 'approved');
        }
    };
    
    const handleBulkReject = async () => {
        const ideasToReject = new Set(Array.from(selectedIdeas).filter(id => {
            const idea = ideas.find(i => i.id === id);
            return idea && idea.status === 'new';
        }));

        if (ideasToReject.size > 0 && window.confirm(`Are you sure you want to reject (and permanently delete) ${ideasToReject.size} new ideas?`)) {
            const batch = db.batch();
            ideasToReject.forEach(id => {
                const ref = db.collection(`artifacts/${appId}/users/${userId}/blogIdeas`).doc(id);
                batch.delete(ref);
            });
            try {
                await batch.commit();
                setSelectedIdeas(new Set());
            } catch (error) {
                 console.error("Error rejecting ideas:", error);
                 alert(`An error occurred while rejecting ideas. Please try again.`);
            }
        }
    };

    const handleBulkGenerate = () => {
        const ideasToGenerate = ideas.filter(idea => selectedIdeas.has(idea.id) && idea.status === 'approved');
        if (ideasToGenerate.length > 0 && window.confirm(`Are you sure you want to generate content for ${ideasToGenerate.length} approved ideas?`)) {
            ideasToGenerate.forEach(idea => onWritePost(idea));
            setSelectedIdeas(new Set());
        }
    };

    const handleBulkPublish = () => {
        const ideasToPublish = ideas.filter(idea => selectedIdeas.has(idea.id) && idea.status === 'generated');
        if (ideasToPublish.length > 0 && window.confirm(`Are you sure you want to publish ${ideasToPublish.length} posts to WordPress?`)) {
            onPublishPosts(ideasToPublish);
            setSelectedIdeas(new Set());
        }
    };
    
    const handleBulkClose = () => {
        const ideasToClose = new Set(Array.from(selectedIdeas).filter(id => {
            const idea = ideas.find(i => i.id === id);
            return idea && idea.status === 'published';
        }));
        if (ideasToClose.size > 0 && window.confirm(`Are you sure you want to move ${ideasToClose.size} published posts to closed?`)) {
            handleBulkUpdateStatus(ideasToClose, 'closed');
        }
    };
    
    const handleBulkDelete = async () => {
        if (selectedIdeas.size > 0 && window.confirm(`Are you sure you want to permanently delete ${selectedIdeas.size} selected items? This cannot be undone.`)) {
            const batch = db.batch();
            selectedIdeas.forEach(id => {
                const ref = db.collection(`artifacts/${appId}/users/${userId}/blogIdeas`).doc(id);
                batch.delete(ref);
            });
            try {
                await batch.commit();
                setSelectedIdeas(new Set());
            } catch (error) {
                 console.error("Error during bulk deletion:", error);
                 alert(`An error occurred during bulk deletion. Please try again.`);
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
        if (selectedIdeas.size === 0) return stats;
        
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
                (idea.title && idea.title.toLowerCase().includes(lowerCaseFilterTerm)) ||
                (idea.description && idea.description.toLowerCase().includes(lowerCaseFilterTerm)) ||
                (idea.primaryKeyword && idea.primaryKeyword.toLowerCase().includes(lowerCaseFilterTerm))
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
        if (newSelection.has(ideaId)) {
            newSelection.delete(ideaId);
        } else {
            newSelection.add(ideaId);
        }
        setSelectedIdeas(newSelection);
    };

    if (isLoading) return <window.LoadingSpinner text="Loading blog ideas..." />;

    if (ideas.length === 0) {
        return (
            <div className="text-center text-gray-400 py-8">
                <p>No blog ideas found.</p>
                <p className="text-sm mt-2">Use the Blog Ideas tool to generate some!</p>
            </div>
        );
    }

    const getSortIcon = (column) => sortBy === column ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : '';
    const uniquePostTypes = ['All', ...new Set(ideas.map(idea => idea.postType))];
    
    const ExpandedContent = ({ idea }) => (
        <div className="p-4 bg-gray-800/30">
            <div className="space-y-3">
                <div><h4 className="font-semibold text-gray-400 text-xs">Description</h4><p className="text-sm text-gray-300">{idea.description}</p></div>
                <div><h4 className="font-semibold text-gray-400 text-xs">Primary Keyword</h4><p className="px-2 py-1 text-sm bg-secondary-accent-darker-opacity text-secondary-accent-lighter-text rounded-full inline-block">{idea.primaryKeyword}</p></div>
                {idea.monetizationOpportunities && (<div className="p-2 bg-green-900/20 border-l-2 border-green-500"><h4 className="font-semibold text-green-400 text-xs">Monetization Angle</h4><p className="text-sm text-green-300/90 italic">{idea.monetizationOpportunities}</p></div>)}
                {idea.blogPostContent && (<div><h4 className="font-semibold text-gray-400 text-xs">Generated Post Content (First 200 chars)</h4><p className="text-sm text-gray-300 border-l-2 border-gray-600 pl-2 italic">{idea.blogPostContent.substring(0, 200)}...</p></div>)}
            </div>
        </div>
    );
    
    const renderBulkActionButtons = () => {
        if (currentDashboardView === 'new') {
            return (
                <>
                    <button onClick={handleBulkApprove} className="btn btn-success" disabled={selectedIdeasStats.new === 0}>Approve Selected {selectedIdeasStats.new > 0 ? `(${selectedIdeasStats.new})` : ''}</button>
                    <button onClick={handleBulkReject} className="btn btn-danger" disabled={selectedIdeasStats.new === 0}>Reject Selected {selectedIdeasStats.new > 0 ? `(${selectedIdeasStats.new})` : ''}</button>
                </>
            );
        }
        if (currentDashboardView === 'active') {
            return (
                <>
                    <button onClick={handleBulkGenerate} className="btn btn-secondary" disabled={selectedIdeasStats.approved === 0}>Generate Content {selectedIdeasStats.approved > 0 ? `(${selectedIdeasStats.approved})` : ''}</button>
                    <button onClick={handleBulkPublish} className="btn btn-secondary" disabled={selectedIdeasStats.generated === 0}>Publish to WP {selectedIdeasStats.generated > 0 ? `(${selectedIdeasStats.generated})` : ''}</button>
                    <button onClick={handleBulkClose} className="btn btn-secondary" disabled={selectedIdeasStats.published === 0}>Move to Closed {selectedIdeasStats.published > 0 ? `(${selectedIdeasStats.published})` : ''}</button>
                </>
            );
        }
        return null; // No specific actions for 'closed' view besides delete
    };
    
    const getStatusClass = (status) => {
        const classes = {
            'new': 'bg-yellow-900/50 text-yellow-400',
            'approved': 'bg-gray-700 text-gray-300',
            'generating': 'bg-blue-900/50 text-blue-400 animate-pulse',
            'generated': 'bg-green-900/50 text-green-400',
            'published': 'bg-purple-900/50 text-purple-400',
            'failed': 'bg-red-900/50 text-red-400',
            'closed': 'bg-gray-900/50 text-gray-500',
            'queued': 'bg-indigo-900/50 text-indigo-400',
        };
        return classes[status] || 'bg-gray-700';
    }

    return (
        <div className="overflow-x-auto">
            {/* --- View Toggles --- */}
            <div className="mb-4 flex items-center border-b border-gray-700">
                 {['new', 'active', 'closed'].map(view => (
                    <button 
                        key={view}
                        onClick={() => setCurrentDashboardView(view)}
                        className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${currentDashboardView === view ? 'border-b-2 border-primary-accent text-white' : 'text-gray-400 hover:text-white'}`}>
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

            <div className="mb-4 flex flex-wrap gap-2 items-center">
                {renderBulkActionButtons()}
                <button onClick={handleBulkDelete} className="btn btn-danger" disabled={selectedIdeasStats.total === 0}>Delete Selected {selectedIdeasStats.total > 0 ? `(${selectedIdeasStats.total})` : ''}</button>
            </div>
            
            <div className="hidden md:block">
                <table className="w-full text-left table-auto">
                    <thead className="bg-gray-800/50">
                        <tr>
                            <th className="p-3 w-px"><input type="checkbox" onChange={toggleSelectAll} checked={selectedIdeas.size > 0 && sortedAndFilteredIdeas.length > 0 && selectedIdeas.size === sortedAndFilteredIdeas.length}/></th>
                            <th className="p-3 w-2/5 cursor-pointer" onClick={() => handleSort('title')}>Title {getSortIcon('title')}</th>
                            <th className="p-3 cursor-pointer" onClick={() => handleSort('postType')}>Post Type {getSortIcon('postType')}</th>
                            <th className="p-3 cursor-pointer" onClick={() => handleSort('status')}>Status {getSortIcon('status')}</th>
                            <th className="p-3 cursor-pointer" onClick={() => handleSort('relatedProjectTitle')}>Origin {getSortIcon('relatedProjectTitle')}</th>
                            <th className="p-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {sortedAndFilteredIdeas.map(idea => (
                            <React.Fragment key={idea.id}>
                                <tr className="hover:bg-gray-800/50 cursor-pointer" onClick={() => handleRowClick(idea.id)}>
                                    <td className="p-3"><input type="checkbox" checked={selectedIdeas.has(idea.id)} onChange={() => handleSelectIdea(idea.id)} onClick={(e) => e.stopPropagation()}/></td>
                                    <td className="p-3 font-semibold text-primary-accent">{idea.title}</td>
                                    <td className="p-3"><span className="px-2 py-1 text-xs bg-teal-800 text-teal-200 rounded-full">{idea.postType}</span></td>
                                    <td className="p-3"><span className={`px-2 py-1 text-xs rounded-full capitalize ${getStatusClass(idea.status)}`}>{idea.status}</span></td>
                                    <td className="p-3 text-sm text-gray-300">{idea.relatedProjectTitle || idea.relatedVideoTitle || 'N/A'}</td>
                                    <td className="p-3 text-right">
                                        <button className="px-3 py-1 text-xs bg-primary-accent hover:bg-primary-accent-darker rounded-md font-semibold mr-2 disabled:opacity-50 disabled:cursor-not-allowed" onClick={(e) => handleWritePost(e, idea)} disabled={idea.status !== 'approved'}>
                                            {idea.status === 'approved' ? 'Write Post' : 'View Post'}
                                        </button>
                                        <button onClick={(e) => handleDeleteIdea(e, idea.id)} className="px-3 py-1 text-xs bg-red-800/80 hover:bg-red-700 rounded-md font-semibold">Delete</button>
                                    </td>
                                </tr>
                                {expandedRow === idea.id && (<tr className="bg-gray-800/30"><td colSpan="6"><ExpandedContent idea={idea} /></td></tr>)}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="md:hidden space-y-4">
                {sortedAndFilteredIdeas.map(idea => (
                    <div key={idea.id} className="glass-card rounded-lg overflow-hidden">
                         <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                 <input type="checkbox" className="mr-4 mt-1" checked={selectedIdeas.has(idea.id)} onChange={() => handleSelectIdea(idea.id)} onClick={(e) => e.stopPropagation()} />
                                <h3 className="font-bold text-lg text-primary-accent pr-2 flex-grow" onClick={() => handleRowClick(idea.id)}>{idea.title}</h3>
                                <span className="flex-shrink-0 px-2 py-1 text-xs bg-teal-800 text-teal-200 rounded-full">{idea.postType}</span>
                            </div>
                            <div className="text-sm text-gray-300 mb-3" onClick={() => handleRowClick(idea.id)}>
                                {idea.relatedProjectTitle || idea.relatedVideoTitle || 'N/A'}
                            </div>
                            <div className="mb-4" onClick={() => handleRowClick(idea.id)}>
                                <span className={`px-2 py-1 text-xs rounded-full capitalize ${getStatusClass(idea.status)}`}>{idea.status}</span>
                            </div>
                             <div className="flex gap-2">
                                 <button className="flex-grow px-3 py-2 text-xs bg-primary-accent hover:bg-primary-accent-darker rounded-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed" onClick={(e) => handleWritePost(e, idea)} disabled={idea.status !== 'approved'}>
                                     {idea.status === 'approved' ? 'Write Post' : 'View Post'}
                                 </button>
                                 <button onClick={(e) => handleDeleteIdea(e, idea.id)} className="px-3 py-2 text-xs bg-red-800/80 hover:bg-red-700 rounded-md font-semibold">Delete</button>
                             </div>
                        </div>
                        {expandedRow === idea.id && <ExpandedContent idea={idea} />}
                    </div>
                ))}
            </div>

            {sortedAndFilteredIdeas.length === 0 && (
                <div className="text-center text-gray-400 py-8"><p>No matching ideas found for this view.</p></div>
            )}
        </div>
    );
};
