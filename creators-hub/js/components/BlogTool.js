// js/components/BlogTool.js

window.BlogTool = ({ settings, onBack, onNavigateToSettings, userId, db }) => {
    const { useState, useEffect } = React;
    
    const isConnected = settings?.wordpress?.url && settings?.wordpress?.username && settings?.wordpress?.applicationPassword;
    const appId = window.CREATOR_HUB_CONFIG.APP_ID;

    const [destination, setDestination] = useState('');
    const [generatedIdeas, setGeneratedIdeas] = useState([]);
    const [isLoadingIdeas, setIsLoadingIdeas] = useState(false);
    const [error, setError] = useState('');

    const handleGenerateIdeas = async () => {
        if (!destination.trim()) {
            setError("Please enter a destination.");
            return;
        }
        setIsLoadingIdeas(true);
        setError('');
        setGeneratedIdeas([]);

        try {
            const ideas = await window.aiUtils.generateBlogPostIdeasAI({
                destination,
                coreSeoEngine: settings.knowledgeBases.blog.coreSeoEngine,
                ideaGenerationKb: settings.knowledgeBases.blog.ideaGeneration,
                apiKey: settings.geminiApiKey,
            });
            const ideasWithIds = ideas.map(idea => ({ ...idea, localId: Math.random().toString(36).substr(2, 9) }));
            setGeneratedIdeas(ideasWithIds);
        } catch (err) {
            console.error("Error generating blog ideas:", err);
            setError(`Failed to generate ideas: ${err.message}`);
        } finally {
            setIsLoadingIdeas(false);
        }
    };

    const handleApproveIdea = async (ideaToApprove) => {
        if (!userId || !db) {
            setError("Cannot save idea: user not authenticated.");
            return;
        }
        const { localId, ...ideaData } = ideaToApprove;
        
        try {
            const ideasCollectionRef = db.collection(`artifacts/${appId}/users/${userId}/blogIdeas`);
            await ideasCollectionRef.add({
                ...ideaData,
                status: 'approved',
                createdAt: new Date().toISOString()
            });
            setGeneratedIdeas(prev => prev.filter(idea => idea.localId !== localId));
        } catch(err) {
            console.error("Error approving idea:", err);
            setError("Failed to save the approved idea.");
        }
    };
    
    const handleRejectIdea = (localId) => {
        setGeneratedIdeas(prev => prev.filter(idea => idea.localId !== localId));
    };

    if (!isConnected) {
        return (
             <div className="p-8">
                <header className="flex justify-between items-center mb-8">
                    <h1 className="text-4xl font-bold text-white">📝 Blog Content Tool</h1>
                    <button onClick={onBack} className="flex items-center gap-2 glass-card px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back to Tools
                    </button>
                </header>
                <div className="glass-card p-12 rounded-lg text-center flex flex-col items-center">
                    <span className="text-5xl mb-4">🔌</span>
                    <h2 className="text-2xl font-bold text-amber-400">WordPress Not Connected</h2>
                    <p className="text-gray-300 mt-2 max-w-md">To use the Blog Tool, you first need to connect your WordPress site in the settings.</p>
                    <button onClick={onNavigateToSettings} className="mt-6 px-6 py-3 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold transition-colors">Go to Technical Settings</button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-bold text-white">📝 Blog Content Tool</h1>
                <button onClick={onBack} className="flex items-center gap-2 glass-card px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Tools
                </button>
            </header>

            <div className="space-y-8">
                {/* Top Section for Idea Generation */}
                <div className="glass-card p-6 rounded-lg">
                    <h2 className="text-2xl font-semibold mb-4">1. Generate Ideas</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                             <label className="block text-sm font-medium text-gray-300 mb-2">Destination or Topic</label>
                            <input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} className="w-full form-input" placeholder="e.g., Cyprus, Tokyo, Scottish Highlands"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">&nbsp;</label> {/* Spacer */}
                            <button onClick={handleGenerateIdeas} disabled={isLoadingIdeas} className="w-full px-5 py-2.5 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:opacity-75 flex items-center justify-center gap-2">
                                {isLoadingIdeas ? <window.LoadingSpinner isButton={true} /> : '💡 Generate Blog Ideas'}
                            </button>
                        </div>
                    </div>
                    {error && <p className="text-red-400 mt-4 text-sm">{error}</p>}
                </div>
                
                {/* Section for New Suggestions */}
                {generatedIdeas.length > 0 && (
                    <div className="glass-card p-6 rounded-lg">
                        <h2 className="text-2xl font-semibold mb-4">2. Review New Suggestions</h2>
                        <div className="space-y-3">
                            {generatedIdeas.map(idea => (
                                <div key={idea.localId} className="p-3 bg-gray-800/60 rounded-lg">
                                    <p className="font-semibold">{idea.title}</p>
                                    <p className="text-xs text-gray-400 mt-1">{idea.description}</p>
                                    <div className="flex justify-end gap-2 mt-2">
                                        <button onClick={() => handleRejectIdea(idea.localId)} className="px-3 py-1 text-xs bg-red-800/70 hover:bg-red-700 rounded-md">Reject</button>
                                        <button onClick={() => handleApproveIdea(idea)} className="px-3 py-1 text-xs bg-green-700 hover:bg-green-600 rounded-md">Approve</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* Section for Approved Ideas Dashboard */}
                <div className="glass-card p-6 rounded-lg">
                    <h2 className="text-2xl font-semibold mb-4">3. Approved Ideas Pipeline</h2>
                    <window.BlogIdeasDashboard userId={userId} db={db} />
                </div>
            </div>
        </div>
    );
};
