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
    const [showClosed, setShowClosed] = useState(false);
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

    const handleDeleteIdea = async (e, ideaId) => {
        e.stopPropagation(); // Prevent the row from expanding when clicking delete
        if (window.confirm("Are you sure you want to permanently delete this blog idea?")) {
            try {
                await db.collection(`artifacts/${appId}/users/${userId}/blogIdeas`).doc(ideaId).delete();
                // The onSnapshot listener will automatically update the UI
            } catch (error) {
                console.error("Error deleting blog idea:", error);
            }
        }
    };

    const handleWritePost = (e, idea) => {
        e.stopPropagation();
        onWritePost(idea); // Call the function passed down from app.js
    };

    // --- Bulk Action Handlers ---
    const handleBulkGenerate = () => {
        const ideasToGenerate = ideas.filter(idea => selectedIdeas.has(idea.id) && idea.status === 'approved');
        if (ideasToGenerate.length > 0) {
            if (window.confirm(`Are you sure you want to generate content for ${ideasToGenerate.length} approved ideas?`)) {
                ideasToGenerate.forEach(idea => onWritePost(idea));
                setSelectedIdeas(new Set());
            }
        } else {
            alert("No approved ideas selected for content generation.");
        }
    };

    const handleBulkPublish = () => {
        const ideasToPublish = ideas.filter(idea => selectedIdeas.has(idea.id) && idea.status === 'generated');
        if (ideasToPublish.length > 0) {
            if (window.confirm(`Are you sure you want to publish ${ideasToPublish.length} posts to WordPress?`)) {
                onPublishPosts(ideasToPublish);
                setSelectedIdeas(new Set());
            }
        } else {
            alert("No 'generated' posts selected for publishing.");
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIdeas.size > 0) {
            if (window.confirm(`Are you sure you want to permanently delete ${selectedIdeas.size} selected items?`)) {
                const deletePromises = Array.from(selectedIdeas).map(ideaId =>
                    db.collection(`artifacts/${appId}/users/${userId}/blogIdeas`).doc(ideaId).delete()
                );
                try {
                    await Promise.all(deletePromises);
                    setSelectedIdeas(new Set());
                } catch (error) {
                    console.error("Error during bulk deletion:", error);
                }
            }
        } else {
            alert("No items selected for deletion.");
        }
    };
    
    const handleBulkClose = async () => {
        const ideasToClose = ideas.filter(idea => selectedIdeas.has(idea.id) && idea.status === 'published');
        if (ideasToClose.length > 0) {
            if (window.confirm(`Are you sure you want to move ${ideasToClose.length} published posts to closed?`)) {
                const closePromises = ideasToClose.map(idea =>
                    db.collection(`artifacts/${appId}/users/${userId}/blogIdeas`).doc(idea.id).update({ status: 'closed' })
                );
                try {
                    await Promise.all(closePromises);
                    setSelectedIdeas(new Set());
                } catch (error) {
                    console.error("Error during bulk closing:", error);
                }
            }
        } else {
            alert("No 'published' posts selected to be moved to closed.");
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
    
    // --- NEW: Calculate stats for selected ideas to make buttons smarter ---
    const selectedIdeasStats = useMemo(() => {
        if (selectedIdeas.size === 0) {
            return { approved: 0, generated: 0, published: 0, total: 0 };
        }
        
        let approved = 0, generated = 0, published = 0;

        selectedIdeas.forEach(id => {
            const idea = ideas.find(i => i.id === id);
            if (idea) {
                if (idea.status === 'approved') approved++;
                if (idea.status === 'generated') generated++;
                if (idea.status === 'published') published++;
            }
        });

        return { approved, generated, published, total: selectedIdeas.size };
    }, [selectedIdeas, ideas]);


    const sortedAndFilteredIdeas = useMemo(() => {
        let filtered = ideas.filter(idea => showClosed ? idea.status === 'closed' : idea.status !== 'closed');

        if (filterTerm) {
            const lowerCaseFilterTerm = filterTerm.toLowerCase();
            filtered = filtered.filter(idea =>
                (idea.title && idea.title.toLowerCase().includes(lowerCaseFilterTerm)) ||
                (idea.description && idea.description.toLowerCase().includes(lowerCaseFilterTerm)) ||
                (idea.primaryKeyword && idea.primaryKeyword.toLowerCase().includes(lowerCaseFilterTerm)) ||
                (idea.relatedProjectTitle && idea.relatedProjectTitle.toLowerCase().includes(lowerCaseFilterTerm)) ||
                (idea.relatedVideoTitle && idea.relatedVideoTitle.toLowerCase().includes(lowerCaseFilterTerm))
            );
        }

        if (filterPostType !== 'All') {
            filtered = filtered.filter(idea => idea.postType === filterPostType);
        }

        return filtered;
    }, [ideas, filterTerm, filterPostType, showClosed]);

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

    if (isLoading) {
        return <window.LoadingSpinner text="Loading blog ideas..." />;
    }

    if (ideas.length === 0) {
        return (
            <div className="text-center text-gray-400 py-8">
                <p>No blog ideas have been approved yet.</p>
                <p className="text-sm mt-2">Approve some suggestions to see them here.</p>
            </div>
        );
    }

    const getSortIcon = (column) => {
        if (sortBy === column) {
            return sortOrder === 'asc' ? ' ▲' : ' ▼';
        }
        return '';
    };

    const uniquePostTypes = ['All', ...new Set(ideas.map(idea => idea.postType))];

    const ExpandedContent = ({ idea }) => (
        <div className="p-4 bg-gray-800/30">
            <div className="space-y-3">
                <div>
                    <h4 className="font-semibold text-gray-400 text-xs">Description</h4>
                    <p className="text-sm text-gray-300">{idea.description}</p>
                </div>
                <div>
                    <h4 className="font-semibold text-gray-400 text-xs">Primary Keyword</h4>
                    <p className="px-2 py-1 text-sm bg-secondary-accent-darker-opacity text-secondary-accent-lighter-text rounded-full inline-block">{idea.primaryKeyword}</p>
                </div>
                {idea.monetizationOpportunities && (
                    <div className="p-2 bg-green-900/20 border-l-2 border-green-500">
                        <h4 className="font-semibold text-green-400 text-xs">Monetization Angle</h4>
                        <p className="text-sm text-green-300/90 italic">{idea.monetizationOpportunities}</p>
                    </div>
                )}
                {idea.blogPostContent && (
                    <div>
                        <h4 className="font-semibold text-gray-400 text-xs">Generated Post Content (First 200 chars)</h4>
                        <p className="text-sm text-gray-300 border-l-2 border-gray-600 pl-2 italic">
                            {idea.blogPostContent.substring(0, 200)}...
                        </p>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="overflow-x-auto">
            <div className="mb-4 flex flex-col md:flex-row gap-4">
                <input
                    type="text"
                    placeholder="Search ideas..."
                    value={filterTerm}
                    onChange={(e) => setFilterTerm(e.target.value)}
                    className="form-input flex-grow"
                />
                <select
                    value={filterPostType}
                    onChange={(e) => setFilterPostType(e.target.value)}
                    className="form-input w-full md:w-auto"
                >
                    {uniquePostTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                </select>
            </div>

            {/* --- UPDATED: Smarter Bulk Action Buttons --- */}
            <div className="mb-4 flex flex-wrap gap-2 items-center">
                <button 
                    onClick={handleBulkGenerate} 
                    className="btn btn-secondary" 
                    disabled={selectedIdeasStats.approved === 0}>
                    Generate Content {selectedIdeasStats.approved > 0 ? `(${selectedIdeasStats.approved})` : ''}
                </button>
                <button 
                    onClick={handleBulkPublish} 
                    className="btn btn-secondary" 
                    disabled={selectedIdeasStats.generated === 0}>
                    Publish to WP {selectedIdeasStats.generated > 0 ? `(${selectedIdeasStats.generated})` : ''}
                </button>
                <button 
                    onClick={handleBulkClose} 
                    className="btn btn-secondary" 
                    disabled={selectedIdeasStats.published === 0}>
                    Move to Closed {selectedIdeasStats.published > 0 ? `(${selectedIdeasStats.published})` : ''}
                </button>
                <button 
                    onClick={handleBulkDelete} 
                    className="btn btn-danger" 
                    disabled={selectedIdeasStats.total === 0}>
                    Delete Selected {selectedIdeasStats.total > 0 ? `(${selectedIdeasStats.total})` : ''}
                </button>
                <div className="flex-grow"></div>
                 <button onClick={() => setShowClosed(!showClosed)} className="btn btn-outline">
                    {showClosed ? 'View Active Posts' : 'View Closed Posts'}
                </button>
            </div>
            {/* --- END: Bulk Action Buttons --- */}

            <div className="hidden md:block">
                <table className="w-full text-left table-auto">
                    <thead className="bg-gray-800/50">
                        <tr>
                            <th className="p-3 text-sm font-semibold w-px">
                                <input
                                    type="checkbox"
                                    onChange={toggleSelectAll}
                                    checked={selectedIdeas.size > 0 && sortedAndFilteredIdeas.length > 0 && selectedIdeas.size === sortedAndFilteredIdeas.length}
                                />
                            </th>
                            <th className="p-3 text-sm font-semibold w-2/5 cursor-pointer" onClick={() => handleSort('title')}>
                                Title {getSortIcon('title')}
                            </th>
                            <th className="p-3 text-sm font-semibold cursor-pointer" onClick={() => handleSort('postType')}>
                                Post Type {getSortIcon('postType')}
                            </th>
                            <th className="p-3 text-sm font-semibold cursor-pointer" onClick={() => handleSort('status')}>
                                Status {getSortIcon('status')}
                            </th>
                            <th className="p-3 text-sm font-semibold cursor-pointer" onClick={() => handleSort('relatedProjectTitle')}>
                                Origin {getSortIcon('relatedProjectTitle')}
                            </th>
                            <th className="p-3 text-sm font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {sortedAndFilteredIdeas.map(idea => (
                            <React.Fragment key={idea.id}>
                                <tr className="hover:bg-gray-800/50 cursor-pointer" onClick={() => handleRowClick(idea.id)}>
                                    <td className="p-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedIdeas.has(idea.id)}
                                            onChange={() => handleSelectIdea(idea.id)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </td>
                                    <td className="p-3 font-semibold text-primary-accent">{idea.title}</td>
                                    <td className="p-3"><span className="px-2 py-1 text-xs bg-teal-800 text-teal-200 rounded-full">{idea.postType}</span></td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 text-xs rounded-full capitalize
                                                ${idea.status === 'published' ? 'bg-purple-900/50 text-purple-400' : ''}
                                                ${idea.status === 'generated' ? 'bg-green-900/50 text-green-400' : ''}
                                                ${idea.status === 'queued' ? 'bg-blue-900/50 text-blue-400' : ''}
                                                ${idea.status === 'generating' ? 'bg-yellow-900/50 text-yellow-400 animate-pulse' : ''}
                                                ${idea.status === 'failed' ? 'bg-red-900/50 text-red-400' : ''}
                                                ${idea.status === 'approved' ? 'bg-gray-700 text-gray-300' : ''}
                                                 ${idea.status === 'closed' ? 'bg-gray-900/50 text-gray-500' : ''}
                                            `}>
                                            {idea.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-sm text-gray-300">
                                        {idea.relatedProjectTitle && (
                                            <div><span className="text-gray-400 mr-1">Project:</span> {idea.relatedProjectTitle}</div>
                                        )}
                                        {idea.relatedVideoTitle && (
                                            <div><span className="text-gray-400 mr-1">Video:</span> {idea.relatedVideoTitle}</div>
                                        )}
                                        {!idea.relatedProjectTitle && !idea.relatedVideoTitle && 'N/A'}
                                    </td>
                                    <td className="p-3 text-right">
                                        <button
                                            className="px-3 py-1 text-xs bg-primary-accent hover:bg-primary-accent-darker rounded-md font-semibold mr-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            onClick={(e) => handleWritePost(e, idea)}
                                            disabled={idea.status !== 'approved'}
                                        >
                                            {idea.status === 'queued' ? 'Queued' : idea.status === 'generating' ? 'Generating...' : (idea.status === 'generated' || idea.status === 'published' || idea.status === 'closed') ? 'View Post' : 'Write Post'}
                                        </button>
                                        <button onClick={(e) => handleDeleteIdea(e, idea.id)} className="px-3 py-1 text-xs bg-red-800/80 hover:bg-red-700 rounded-md font-semibold">Delete</button>
                                    </td>
                                </tr>
                                {expandedRow === idea.id && (
                                    <tr className="bg-gray-800/30">
                                        <td colSpan="6">
                                            <ExpandedContent idea={idea} />
                                        </td>
                                    </tr>
                                )}
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
                                 <input
                                     type="checkbox"
                                     className="mr-4"
                                     checked={selectedIdeas.has(idea.id)}
                                     onChange={() => handleSelectIdea(idea.id)}
                                     onClick={(e) => e.stopPropagation()}
                                 />
                                <h3 className="font-bold text-lg text-primary-accent pr-2 flex-grow" onClick={() => handleRowClick(idea.id)}>{idea.title}</h3>
                                <span className="flex-shrink-0 px-2 py-1 text-xs bg-teal-800 text-teal-200 rounded-full">{idea.postType}</span>
                            </div>
                            <div className="text-sm text-gray-300 mb-3" onClick={() => handleRowClick(idea.id)}>
                                {idea.relatedProjectTitle && (
                                    <div><span className="text-gray-400 mr-1">Project:</span> {idea.relatedProjectTitle}</div>
                                )}
                                {idea.relatedVideoTitle && (
                                    <div><span className="text-gray-400 mr-1">Video:</span> {idea.relatedVideoTitle}</div>
                                )}
                                {!idea.relatedProjectTitle && !idea.relatedVideoTitle && 'N/A'}
                            </div>
                            <div className="mb-4" onClick={() => handleRowClick(idea.id)}>
                                <span className={`px-2 py-1 text-xs rounded-full capitalize
                                        ${idea.status === 'published' ? 'bg-purple-900/50 text-purple-400' : ''}
                                        ${idea.status === 'generated' ? 'bg-green-900/50 text-green-400' : ''}
                                        ${idea.status === 'queued' ? 'bg-blue-900/50 text-blue-400' : ''}
                                        ${idea.status === 'generating' ? 'bg-yellow-900/50 text-yellow-400 animate-pulse' : ''}
                                        ${idea.status === 'failed' ? 'bg-red-900/50 text-red-400' : ''}
                                        ${idea.status === 'approved' ? 'bg-gray-700 text-gray-300' : ''}
                                        ${idea.status === 'closed' ? 'bg-gray-900/50 text-gray-500' : ''}
                                    `}>
                                    {idea.status}
                                </span>
                            </div>
                             <div className="flex gap-2">
                                 <button
                                     className="flex-grow px-3 py-2 text-xs bg-primary-accent hover:bg-primary-accent-darker rounded-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                     onClick={(e) => handleWritePost(e, idea)}
                                     disabled={idea.status !== 'approved'}
                                 >
                                     {idea.status === 'queued' ? 'Queued' : idea.status === 'generating' ? 'Generating...' : (idea.status === 'generated' || idea.status === 'published' || idea.status === 'closed') ? 'View Post' : 'Write Post'}
                                 </button>
                                 <button onClick={(e) => handleDeleteIdea(e, idea.id)} className="px-3 py-2 text-xs bg-red-800/80 hover:bg-red-700 rounded-md font-semibold">Delete</button>
                             </div>
                        </div>
                        {expandedRow === idea.id && <ExpandedContent idea={idea} />}
                    </div>
                ))}
            </div>

            {sortedAndFilteredIdeas.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                    <p>No matching ideas found.</p>
                </div>
            )}
        </div>
    );
};
