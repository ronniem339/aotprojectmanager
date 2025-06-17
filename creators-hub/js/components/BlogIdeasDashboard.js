// js/components/BlogIdeasDashboard.js

window.BlogIdeasDashboard = ({ userId, db }) => {
    const { useState, useEffect } = React;
    const [ideas, setIdeas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const appId = window.CREATOR_HUB_CONFIG.APP_ID;

    useEffect(() => {
        if (!userId || !db) return;
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

    if (isLoading) {
        return <window.LoadingSpinner text="Loading blog ideas..." />;
    }

    if (ideas.length === 0) {
        return (
            <div className="text-center text-gray-400 py-8">
                <p>No blog ideas have been approved yet.</p>
                <p className="text-sm mt-2">Use the tool above to generate and approve some ideas.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {ideas.map(idea => (
                <div key={idea.id} className="glass-card p-4 rounded-lg border-l-4 border-primary-accent">
                    <h3 className="font-bold text-lg text-white">{idea.title}</h3>
                    <p className="text-sm text-gray-300 mt-1">{idea.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2 items-center text-xs">
                        <span className="font-semibold text-gray-400">Keyword:</span>
                        <span className="px-2 py-1 bg-secondary-accent-darker-opacity text-secondary-accent-lighter-text rounded-full">{idea.primaryKeyword}</span>
                        <span className="font-semibold text-gray-400 ml-4">Type:</span>
                        <span className="px-2 py-1 bg-teal-800 text-teal-200 rounded-full">{idea.postType}</span>
                        <span className="font-semibold text-gray-400 ml-4">Status:</span>
                        <span className="px-2 py-1 bg-green-900/50 text-green-400 rounded-full capitalize">{idea.status}</span>
                    </div>
                    <div className="mt-4 text-right">
                        <button className="px-4 py-2 text-sm bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold">Write Post</button>
                    </div>
                </div>
            ))}
        </div>
    );
};
