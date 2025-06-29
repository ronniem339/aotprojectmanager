// js/components/BlogIdeasDashboard.js

window.BlogIdeasDashboard = ({ userId, db, settings, onOpenPublisher, onViewPost }) => {
    const { useState, useEffect, useMemo } = React;
    const { LoadingSpinner } = window;

    // State for posts from the 'blogIdeas' collection
    const [generatedPosts, setGeneratedPosts] = useState([]);
    // State for posts from the 'blogPosts' collection (WordPress imports)
    const [importedPosts, setImportedPosts] = useState([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');
    const [filterTerm, setFilterTerm] = useState('');
    const [filterPostType, setFilterPostType] = useState('All');
    const [selectedPosts, setSelectedPosts] = useState(new Set());
    const [statusFilter, setStatusFilter] = useState('generated');
    
    const appId = window.CREATOR_HUB_CONFIG.APP_ID;
    
    // Memoized reference to the 'blogIdeas' collection
    const ideasCollectionRef = useMemo(() => {
        if (!userId || !db) return null;
        return db.collection(`artifacts/${appId}/users/${userId}/blogIdeas`).orderBy(sortBy, sortOrder);
    }, [userId, db, appId, sortBy, sortOrder]);

    // Memoized reference to the 'blogPosts' collection for imports
    const importedCollectionRef = useMemo(() => {
        if (!userId || !db) return null;
        return db.collection(`artifacts/${appId}/users/${userId}/blogPosts`);
    }, [userId, db, appId]);


    // Effect for fetching generated blog ideas (real-time)
    useEffect(() => {
        if (!ideasCollectionRef) return;
        const unsubscribe = ideasCollectionRef.onSnapshot(snapshot => {
            const ideas = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                sourceCollection: 'blogIdeas' // Identify the source
            }));
            setGeneratedPosts(ideas);
            setIsLoading(false);
        }, error => {
            console.error("Error fetching blog ideas:", error);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [ideasCollectionRef]);

    // Effect for fetching imported WordPress posts (real-time)
    useEffect(() => {
        if(!importedCollectionRef) return;
        const q = importedCollectionRef.where("postType", "==", "wordpress-import");
        const unsubscribe = q.onSnapshot(snapshot => {
            const imported = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                status: 'closed', // As requested, treat imported posts as "Archived"
                sourceCollection: 'blogPosts', // Identify the source
                blogPostContent: doc.data().content, // Normalize content field
            }));
            setImportedPosts(imported);
        }, error => {
            console.error("Error fetching imported posts:", error);
        });
        return () => unsubscribe();
    }, [importedCollectionRef]);

    // Combine generated and imported posts into a single list
    const allPosts = useMemo(() => [...generatedPosts, ...importedPosts], [generatedPosts, importedPosts]);

    const filteredPosts = useMemo(() => {
        let results = allPosts.filter(post => post.status === statusFilter);
        if (filterTerm) {
            const lowerCaseFilter = filterTerm.toLowerCase();
            results = results.filter(post => post.title?.toLowerCase().includes(lowerCaseFilter));
        }
        if (filterPostType !== 'All') {
            // Cater for wordpress-import postType
            const type = filterPostType === 'wordpress-import' ? 'wordpress-import' : filterPostType;
            results = results.filter(post => post.postType === type);
        }
        return results;
    }, [allPosts, statusFilter, filterTerm, filterPostType]);

    // This function now only works on posts from the 'blogIdeas' collection
    const handleUpdateStatus = async (postIds, newStatus) => {
        if (postIds.size === 0) return;
        const batch = db.batch();
        postIds.forEach(id => {
            const post = allPosts.find(p => p.id === id);
            // Ensure we only update status for posts that support it (i.e., not imported ones)
            if (post && post.sourceCollection === 'blogIdeas') {
                const docRef = db.collection(`artifacts/${appId}/users/${userId}/blogIdeas`).doc(id);
                batch.update(docRef, { status: newStatus });
            }
        });
        await batch.commit();
        setSelectedPosts(new Set());
    };

    const handleBulkPublish = () => {
        const postsToPublish = allPosts.filter(p => selectedPosts.has(p.id) && p.status === 'generated');
        if (postsToPublish.length > 0) {
            onOpenPublisher(postsToPublish);
            setSelectedPosts(new Set());
        }
    };
    
    const handleBulkDelete = async () => {
        if (selectedPosts.size > 0 && window.confirm(`Are you sure you want to permanently delete ${selectedPosts.size} post(s)?`)) {
            const batch = db.batch();
            selectedPosts.forEach(id => {
                const post = allPosts.find(p => p.id === id);
                if (post) {
                    // CORRECTED: Use the sourceCollection to delete from the correct place
                    const docRef = db.collection(`artifacts/${appId}/users/${userId}/${post.sourceCollection}`).doc(id);
                    batch.delete(docRef);
                }
            });
            await batch.commit();
            setSelectedPosts(new Set());
        }
    };
    
    // This action is now disabled for imported posts since they are already archived
    const handleBulkArchive = () => {
        const postsToArchive = new Set(Array.from(selectedPosts).filter(id => allPosts.find(p => p.id === id)?.status === 'published'));
        if (postsToArchive.size > 0) handleUpdateStatus(postsToArchive, 'closed');
    };

    const handleIndividualDelete = async (e, post) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to permanently delete this post?')) {
            // CORRECTED: Use the sourceCollection to delete from the correct place
            await db.collection(`artifacts/${appId}/users/${userId}/${post.sourceCollection}`).doc(post.id).delete();
        }
    };

    const toggleSelectAll = () => {
        if (selectedPosts.size === filteredPosts.length) {
            setSelectedPosts(new Set());
        } else {
            setSelectedPosts(new Set(filteredPosts.map(p => p.id)));
        }
    };
    
    if (isLoading && allPosts.length === 0) return <LoadingSpinner text="Loading Content Pipeline..." />;
    
    const uniquePostTypes = ['All', ...new Set(allPosts.map(p => p.postType).filter(Boolean))];

    return (
        <div className="glass-card p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-4 text-white">Content Pipeline</h3>
            
            <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                <div className="flex items-center gap-4 flex-wrap">
                    <label className="text-gray-300 font-medium">View:</label>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-select">
                        <option value="generated">Generated</option>
                        <option value="published">Published</option>
                        <option value="closed">Archived</option>
                    </select>
                    <input type="text" placeholder="Search by title..." value={filterTerm} onChange={e => setFilterTerm(e.target.value)} className="form-input"/>
                    <select value={filterPostType} onChange={e => setFilterPostType(e.target.value)} className="form-select">
                        {uniquePostTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    {statusFilter === 'generated' && <button onClick={handleBulkPublish} disabled={selectedPosts.size === 0} className="btn btn-secondary">Publish ({selectedPosts.size})</button>}
                    {statusFilter === 'published' && <button onClick={handleBulkArchive} disabled={selectedPosts.size === 0} className="btn btn-secondary">Archive ({selectedPosts.size})</button>}
                    <button onClick={handleBulkDelete} disabled={selectedPosts.size === 0} className="btn btn-danger">Delete ({selectedPosts.size})</button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left table-auto">
                    <thead className="bg-gray-800/50">
                        <tr>
                            <th className="p-3 w-px"><input type="checkbox" onChange={toggleSelectAll} checked={selectedPosts.size > 0 && filteredPosts.length > 0 && selectedPosts.size === filteredPosts.length} className="form-checkbox"/></th>
                            <th className="p-3 w-2/5">Title</th>
                            <th className="p-3">Post Type</th>
                            <th className="p-3">Location</th>
                            <th className="p-3">Created</th>
                            <th className="p-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {filteredPosts.map(post => (
                            <tr key={post.id} className="hover:bg-gray-800/50">
                                <td className="p-3"><input type="checkbox" checked={selectedPosts.has(post.id)} onChange={() => {
                                    const newSelection = new Set(selectedPosts);
                                    newSelection.has(post.id) ? newSelection.delete(post.id) : newSelection.add(post.id);
                                    setSelectedPosts(newSelection);
                                }} className="form-checkbox"/></td>
                                <td className="p-3 font-semibold text-primary-accent">{post.title}</td>
                                <td className="p-3"><span className="px-2 py-1 text-xs bg-teal-800 text-teal-200 rounded-full">{post.postType}</span></td>
                                <td className="p-3 text-sm text-gray-300">{post.location || 'N/A'}</td>
                                <td className="p-3 text-sm text-gray-400">{post.createdAt?.toDate().toLocaleDateString() || 'N/A'}</td>
                                <td className="p-3 text-right space-x-2">
                                    {/* Viewing/Editing is only available for generated posts, not imported ones */}
                                    {post.sourceCollection === 'blogIdeas' ? (
                                        <button className="btn btn-primary-sm" onClick={() => onViewPost(post)}>View/Edit</button>
                                    ) : (
                                        <a href={post.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary-sm">View on WP</a>
                                    )}
                                    <button onClick={(e) => handleIndividualDelete(e, post)} className="btn btn-danger-sm">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {filteredPosts.length === 0 && (
                <div className="text-center text-gray-400 py-8"><p>No posts found for this view.</p></div>
            )}
        </div>
    );
};
