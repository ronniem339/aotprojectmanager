// creators-hub/js/components/ProjectView/ShortsIdeasToolModal.js

window.ShortsIdeasToolModal = ({ video, project, settings, onSaveShortsIdea, onDeleteShortsIdea, onGenerateShortsMetadata }) => {
    const { useState, useEffect } = React;

    const [generatedIdeas, setGeneratedIdeas] = useState([]);
    const [isLoadingIdeas, setIsLoadingIdeas] = useState(false);
    const [isLoadingMetadata, setIsLoadingMetadata] = useState({});
    const [error, setError] = useState('');
    
    // This state will now be managed by the useEffect below to ensure it's always in sync with the video prop.
    const [shortsIdeas, setShortsIdeas] = useState(video.shortsIdeas || []);

    // **FIX 1: Correctly sync state when the video prop changes.**
    // This ensures that when you select a new video, the "Saved Shorts" list updates accordingly.
    useEffect(() => {
        setShortsIdeas(video.shortsIdeas || []);
    }, [video.shortsIdeas, video.id]); // Added video.id to the dependency array

    const handleGenerateIdeas = async () => {
        setIsLoadingIdeas(true);
        setError('');
        setGeneratedIdeas([]);

        const apiKey = settings.geminiApiKey;
        if (!apiKey) {
            setError("Gemini API Key is not set. Please set it in the settings.");
            setIsLoadingIdeas(false);
            return;
        }

        const shortsIdeaGenerationKb = settings.knowledgeBases?.youtube?.shortsIdeaGeneration || '';
        
        // Pass the settings object directly to the AI utility
        try {
            const ideas = await window.aiUtils.generateShortsIdeasAI({
                videoTitle: video.chosenTitle || video.title,
                videoConcept: video.concept,
                videoLocationsFeatured: video.locations_featured || [],
                projectFootageInventory: project.footageInventory || {},
                projectTitle: project.playlistTitle,
                shortsIdeaGenerationKb: shortsIdeaGenerationKb,
                previouslyCreatedShorts: shortsIdeas.map(idea => ({ title: idea.title, status: idea.status })),
                settings: settings, // Pass the entire settings object
            });
            setGeneratedIdeas(ideas);
        } catch (err) {
            console.error("Error generating shorts ideas:", err);
            setError(`Failed to generate ideas: ${err.message || err}`);
        } finally {
            setIsLoadingIdeas(false);
        }
    };

    // **FIX 2: Correctly save a new idea without overwriting existing ones.**
    const handleSaveIdea = (idea) => {
        const newIdea = {
            ...idea,
            id: `short-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            status: 'saved',
            metadata: null
        };
        // This now correctly calls the parent handler which manages the database update.
        // The parent `handleSaveShortsIdea` function in `ShortsTool.js` is already written correctly
        // to append the new idea to the existing array in Firestore.
        onSaveShortsIdea(newIdea);
        
        // Remove from the "New Suggestions" list after saving.
        setGeneratedIdeas(prev => prev.filter(gIdea => gIdea.title !== idea.title));
    };

    // **FIX 3: Remove the browser confirmation dialog for a smoother UX.**
    const handleDeleteIdea = (id) => {
        onDeleteShortsIdea(id);
    };

    const handleGenerateMetadata = async (ideaId, idea) => {
        setIsLoadingMetadata(prev => ({ ...prev, [ideaId]: true }));
        setError('');

        const apiKey = settings.geminiApiKey;
        if (!apiKey) {
            setError("Gemini API Key is not set.");
            setIsLoadingMetadata(prev => ({ ...prev, [ideaId]: false }));
            return;
        }
        
        try {
            const metadata = await window.aiUtils.generateShortsMetadataAI({
                videoTitle: video.chosenTitle || video.title,
                shortsIdea: idea,
                settings: settings, // Pass the entire settings object
            });
            onGenerateShortsMetadata(ideaId, metadata);
        } catch (err) {
            console.error("Error generating shorts metadata:", err);
            setError(`Failed to generate metadata: ${err.message || err}`);
        } finally {
            setIsLoadingMetadata(prev => ({ ...prev, [ideaId]: false }));
        }
    };

    // ... (The rest of the return/render logic remains the same)
    return (
        <div className="w-full h-full flex flex-col">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 text-center">Generate YouTube Shorts Ideas</h2>

            <div className="flex-grow overflow-y-auto pr-4 custom-scrollbar">
                <p className="text-gray-400 mb-6 text-center">Generate quick, engaging ideas for YouTube Shorts based on your video content and project details.</p>
                
                <div className="text-center mb-6">
                    <button onClick={handleGenerateIdeas} disabled={isLoadingIdeas} className="px-6 py-3 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center mx-auto gap-2">
                        {isLoadingIdeas ? <window.LoadingSpinner isButton={true} /> : '⚡ Generate Shorts Ideas'}
                    </button>
                </div>

                {error && (
                    <div className="bg-red-900/50 text-red-400 p-3 rounded-lg text-sm mb-4">
                        {error}
                    </div>
                )}
                <div className="flex flex-col lg:flex-row gap-6">
                    {(shortsIdeas.length > 0 || generatedIdeas.length > 0) && (
                        <div className={`flex-1 ${shortsIdeas.length > 0 ? 'block' : 'hidden lg:block'}`}>
                            <h3 className="text-xl font-bold text-white mb-4">Saved Shorts Ideas ({shortsIdeas.length})</h3>
                            <div className="space-y-4">
                                {shortsIdeas.map((idea) => (
                                    <div key={idea.id} className="glass-card p-4 rounded-lg border border-green-500 bg-green-900/20">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-lg text-white">{idea.title}</h4>
                                            <button onClick={() => handleDeleteIdea(idea.id)} className="text-red-400 hover:text-red-300 text-sm">
                                                &times; Remove
                                            </button>
                                        </div>
                                        <p className="text-gray-300 text-sm">{idea.description}</p>
                                        <p className="text-gray-400 text-xs italic mt-2">Footage: {idea.footageToUse}</p>

                                        {idea.metadata ? (
                                            <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
                                                <h5 className="text-md font-semibold text-primary-accent mb-2">Generated Metadata:</h5>
                                                <p className="text-sm text-gray-300"><strong>On-Screen:</strong> {idea.metadata.onScreenText?.join(', ') || 'N/A'}</p>
                                                <p className="text-sm text-gray-300"><strong>Caption:</strong> {idea.metadata.caption || 'N/A'}</p>
                                                <p className="text-sm text-gray-300"><strong>Description:</strong> {idea.metadata.description || 'N/A'}</p>
                                                <p className="text-sm text-gray-300"><strong>Tags:</strong> {idea.metadata.tags || 'N/A'}</p>
                                                <div className="mt-3 text-right">
                                                    <window.CopyButton textToCopy={`${idea.metadata.caption}\n\n${idea.metadata.description}\n\nTags: ${idea.metadata.tags}`} />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-4 text-center">
                                                <button 
                                                    onClick={() => handleGenerateMetadata(idea.id, idea)}
                                                    disabled={isLoadingMetadata[idea.id]}
                                                    className="px-4 py-2 text-sm bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center mx-auto gap-2"
                                                >
                                                    {isLoadingMetadata[idea.id] ? <window.LoadingSpinner isButton={true} /> : '📝 Generate Metadata'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {(generatedIdeas.length > 0 || shortsIdeas.length > 0) && (
                        <div className={`flex-1 ${generatedIdeas.length > 0 ? 'block' : 'hidden lg:block'}`}>
                            <h3 className="text-xl font-bold text-white mb-4">New Suggestions ({generatedIdeas.length})</h3>
                            <div className="space-y-4">
                                {generatedIdeas.map((idea, index) => (
                                    <div key={index} className="glass-card p-4 rounded-lg border border-gray-700">
                                        <h3 className="font-bold text-lg text-white mb-2">{idea.title}</h3>
                                        <p className="text-gray-300 text-sm">{idea.description}</p>
                                        <p className="text-gray-400 text-xs italic mt-2">Footage: {idea.footageToUse}</p>
                                        <div className="flex justify-end gap-2 mt-3">
                                            <button onClick={() => handleSaveIdea(idea)} className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 rounded-lg font-semibold">
                                                Save Idea
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
                {shortsIdeas.length === 0 && generatedIdeas.length === 0 && (
                    <div className="text-center text-gray-500 mt-8">
                        No Shorts ideas saved or generated yet. Click "Generate Shorts Ideas" to get started!
                    </div>
                )}
            </div>
        </div>
    );
};
