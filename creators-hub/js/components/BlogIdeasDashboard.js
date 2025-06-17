// js/components/BlogIdeasDashboard.js

window.BlogIdeasDashboard = ({ userId, db }) => {
    const { useState, useEffect } = React;
    const [ideas, setIdeas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedRow, setExpandedRow] = useState(null);
    const appId = window.CREATOR_HUB_CONFIG.APP_ID;

    useEffect(() => {
        if (!userId || !db) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const ideasCollectionRef = db.collection(`artifacts/${appId}/users/${userId}/blogIdeas`).orderBy("createdAt", "desc");
        
        const unsubscribe = ideasCollectionRef.onSnapshot(snapshot => {
            const fetchedIdeas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setIdeas(fetchedIdeas);
            setIsLoading(false);
        }, error => {
            console.error("Error fetching blog ideas:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [userId, db, appId]);

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

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left table-auto">
                <thead className="bg-gray-800/50">
                    <tr>
                        <th className="p-3 text-sm font-semibold w-2/5">Title</th>
                        <th className="p-3 text-sm font-semibold">Post Type</th>
                        <th className="p-3 text-sm font-semibold">Status</th>
                        <th className="p-3 text-sm font-semibold text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                    {ideas.map(idea => (
                        <React.Fragment key={idea.id}>
                            <tr className="hover:bg-gray-800/50 cursor-pointer" onClick={() => handleRowClick(idea.id)}>
                                <td className="p-3 font-semibold text-primary-accent">{idea.title}</td>
                                <td className="p-3"><span className="px-2 py-1 text-xs bg-teal-800 text-teal-200 rounded-full">{idea.postType}</span></td>
                                <td className="p-3"><span className="px-2 py-1 text-xs bg-green-900/50 text-green-400 rounded-full capitalize">{idea.status}</span></td>
                                <td className="p-3 text-right">
                                     <button className="px-3 py-1 text-xs bg-primary-accent hover:bg-primary-accent-darker rounded-md font-semibold mr-2">Write Post</button>
                                     <button onClick={(e) => handleDeleteIdea(e, idea.id)} className="px-3 py-1 text-xs bg-red-800/80 hover:bg-red-700 rounded-md font-semibold">Delete</button>
                                </td>
                            </tr>
                            {expandedRow === idea.id && (
                                <tr className="bg-gray-800/30">
                                    <td colSpan="4" className="p-4">
                                        <div className="space-y-2">
                                            <div>
                                                <h4 className="font-semibold text-gray-400 text-xs">Description</h4>
                                                <p className="text-sm text-gray-300">{idea.description}</p>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-400 text-xs">Primary Keyword</h4>
                                                <p className="px-2 py-1 text-sm bg-secondary-accent-darker-opacity text-secondary-accent-lighter-text rounded-full inline-block">{idea.primaryKeyword}</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
