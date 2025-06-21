// js/components/BlogIdeasDashboard.js

window.BlogIdeasDashboard = ({ userId, db }) => {
    const { useState, useEffect, useMemo } = React;
    const [ideas, setIdeas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedRow, setExpandedRow] = useState(null);
    const [sortBy, setSortBy] = useState('createdAt'); // Default sort by creation date
    const [sortOrder, setSortOrder] = useState('desc'); // Default sort order descending
    const [filterTerm, setFilterTerm] = useState(''); // For general search
    const [filterPostType, setFilterPostType] = useState('All'); // For filtering by post type
    const appId = window.CREATOR_HUB_CONFIG.APP_ID;

    useEffect(() => {
        if (!userId || !db) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        // Firestore query for initial fetch and sorting. Filtering will be done client-side.
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

        // Sorting is handled by Firestore query directly in useEffect,
        // but if more complex client-side sorting is needed based on multiple fields,
        // it would go here using array.sort(). For now, this is efficient.
        return filtered;
    }, [ideas, filterTerm, filterPostType]);


    if (isLoading) {
        return <window.LoadingSpinner text="Loading blog ideas..." />;
    }

    if (ideas.length === 0) { // Check original ideas for initial empty state
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
                    className="form-select w-full md:w-auto"
                >
                    {uniquePostTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                </select>
            </div>
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
                                <td className="p-3"><span className="px-2 py-1 text-xs bg-green-900/50 text-green-400 rounded-full capitalize">{idea.status}</span></td>
                                <td className="p-3 text-sm text-gray-300">
                                    {idea.relatedProjectTitle && (
                                        <div className="flex items-center">
                                            <span className="text-gray-400 mr-1">Project:</span> {idea.relatedProjectTitle}
                                        </div>
                                    )}
                                    {idea.relatedVideoTitle && (
                                        <div className="flex items-center">
                                            <span className="text-gray-400 mr-1">Video:</span> {idea.relatedVideoTitle}
                                        </div>
                                    )}
                                    {!idea.relatedProjectTitle && !idea.relatedVideoTitle && 'N/A'}
                                </td>
                                <td className="p-3 text-right">
                                     <button className="px-3 py-1 text-xs bg-primary-accent hover:bg-primary-accent-darker rounded-md font-semibold mr-2">Write Post</button>
                                     <button onClick={(e) => handleDeleteIdea(e, idea.id)} className="px-3 py-1 text-xs bg-red-800/80 hover:bg-red-700 rounded-md font-semibold">Delete</button>
                                </td>
                            </tr>
                            {expandedRow === idea.id && (
                                <tr className="bg-gray-800/30">
                                    <td colSpan="5" className="p-4"> {/* Changed colSpan to 5 */}
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
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                    {sortedAndFilteredIdeas.length === 0 && (
                        <tr>
                            <td colSpan="5" className="p-3 text-center text-gray-400">No matching ideas found.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};
