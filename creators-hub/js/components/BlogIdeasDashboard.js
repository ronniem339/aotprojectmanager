// js/components/BlogIdeasDashboard.js

window.BlogIdeasDashboard = ({ userId, db, settings, onWritePost, processingIdeaId }) => {
    const { useState, useEffect, useMemo } = React;
    const [ideas, setIdeas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedRow, setExpandedRow] = useState(null);
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');
    const [filterTerm, setFilterTerm] = useState('');
    const [filterPostType, setFilterPostType] = useState('All');
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
                // Optionally show an error notification to the user
            }
        }
    };

    const handleWritePost = (e, idea) => {
        e.stopPropagation();
        onWritePost(idea); // Call the function passed down from app.js
    };

    const handleSort = (column) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc'); // Default to ascending when changing column
        }
    };

    const sortedAndFilteredIdeas = useMemo(() => {
        let filtered = ideas;

        // Apply general search filter
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

        // Apply post type filter
        if (filterPostType !== 'All') {
            filtered = filtered.filter(idea => idea.postType === filterPostType);
        }
        
        return filtered;
    }, [ideas, filterTerm, filterPostType]);


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
                        {/* You might want a 'View Full Post' button here */}
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
                    className="form-input w-full md:w-auto" // form-select is not a default class
                >
                    {uniquePostTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                </select>
            </div>

            {/* --- RESPONSIVE CONTENT AREA --- */}
            {/* Desktop Table View */}
            <div className="hidden md:block">
                 <table className="w-full text-left table-auto">
                    <thead className="bg-gray-800/50">
                        <tr>
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
                                    <td className="p-3 font-semibold text-primary-accent">{idea.title}</td>
                                    <td className="p-3"><span className="px-2 py-1 text-xs bg-teal-800 text-teal-200 rounded-full">{idea.postType}</span></td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 text-xs rounded-full capitalize
                                            ${idea.status === 'generated' ? 'bg-green-900/50 text-green-400' : ''}
                                            ${idea.status === 'queued' ? 'bg-blue-900/50 text-blue-400' : ''}
                                            ${idea.status === 'generating' ? 'bg-yellow-900/50 text-yellow-400 animate-pulse' : ''}
                                            ${idea.status === 'failed' ? 'bg-red-900/50 text-red-400' : ''}
                                            ${idea.status === 'approved' ? 'bg-gray-700 text-gray-300' : ''}
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
                                            disabled={idea.status === 'queued' || idea.status === 'generating' || idea.status === 'generated'}
                                         >
                                            {idea.status === 'queued' ? 'Queued' : idea.status === 'generating' ? 'Generating...' : idea.status === 'generated' ? 'View Post' : 'Write Post'}
                                         </button>
                                         <button onClick={(e) => handleDeleteIdea(e, idea.id)} className="px-3 py-1 text-xs bg-red-800/80 hover:bg-red-700 rounded-md font-semibold">Delete</button>
                                    </td>
                                </tr>
                                {expandedRow === idea.id && (
                                    <tr className="bg-gray-800/30">
                                        <td colSpan="5">
                                            <ExpandedContent idea={idea} />
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {sortedAndFilteredIdeas.map(idea => (
                    <div key={idea.id} className="glass-card rounded-lg overflow-hidden" onClick={() => handleRowClick(idea.id)}>
                        <div className="p-4">
                             <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg text-primary-accent pr-2">{idea.title}</h3>
                                <span className="flex-shrink-0 px-2 py-1 text-xs bg-teal-800 text-teal-200 rounded-full">{idea.postType}</span>
                             </div>
                             <div className="text-sm text-gray-300 mb-3">
                                 {idea.relatedProjectTitle && (
                                     <div><span className="text-gray-400 mr-1">Project:</span> {idea.relatedProjectTitle}</div>
                                 )}
                                 {idea.relatedVideoTitle && (
                                     <div><span className="text-gray-400 mr-1">Video:</span> {idea.relatedVideoTitle}</div>
                                 )}
                                 {!idea.relatedProjectTitle && !idea.relatedVideoTitle && 'N/A'}
                             </div>
                             <div className="mb-4">
                                 <span className={`px-2 py-1 text-xs rounded-full capitalize
                                     ${idea.status === 'generated' ? 'bg-green-900/50 text-green-400' : ''}
                                     ${idea.status === 'queued' ? 'bg-blue-900/50 text-blue-400' : ''}
                                     ${idea.status === 'generating' ? 'bg-yellow-900/50 text-yellow-400 animate-pulse' : ''}
                                     ${idea.status === 'failed' ? 'bg-red-900/50 text-red-400' : ''}
                                     ${idea.status === 'approved' ? 'bg-gray-700 text-gray-300' : ''}
                                 `}>
                                     {idea.status}
                                 </span>
                             </div>
                             <div className="flex gap-2">
                                <button
                                    className="flex-grow px-3 py-2 text-xs bg-primary-accent hover:bg-primary-accent-darker rounded-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={(e) => handleWritePost(e, idea)}
                                    disabled={idea.status === 'queued' || idea.status === 'generating' || idea.status === 'generated'}
                                >
                                    {idea.status === 'queued' ? 'Queued' : idea.status === 'generating' ? 'Generating...' : idea.status === 'generated' ? 'View Post' : 'Write Post'}
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
