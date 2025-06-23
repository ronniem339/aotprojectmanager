// creators-hub/js/components/ProjectView/ShortsIdeasToolModal.js

/**
 * ShortsIdeasToolModal Component
 * A tool for generating YouTube Shorts ideas based on video and project context, designed to be embedded.
 *
 * @param {object} props - The component props.
 * @param {object} props.video - The current video object.
 * @param {object} props.project - The current project object.
 * @param {object} props.settings - User settings, including AI API key and knowledge bases.
 * @param {function} props.onSaveShortsIdea - Callback to save a new shorts idea to Firestore.
 * @param {function} props.onDeleteShortsIdea - Callback to delete a shorts idea from Firestore.
 * @param {function} props.onGenerateShortsMetadata - Callback to generate metadata for a shorts idea.
 */
window.ShortsIdeasToolModal = ({ video, project, settings, onSaveShortsIdea, onDeleteShortsIdea, onGenerateShortsMetadata }) => {
    const { useState, useEffect } = React;

    const [generatedIdeas, setGeneratedIdeas] = useState([]);
    const [isLoadingIdeas, setIsLoadingIdeas] = useState(false);
    const [isLoadingMetadata, setIsLoadingMetadata] = useState({}); // Track metadata loading per idea
    const [error, setError] = useState('');
    const [shortsIdeas, setShortsIdeas] = useState(video.shortsIdeas || []); // Load existing shorts ideas

    useEffect(() => {
        setShortsIdeas(video.shortsIdeas || []);
    }, [video.shortsIdeas]);

    const handleGenerateIdeas = async () => {
        setIsLoadingIdeas(true);
        setError('');
        setGeneratedIdeas([]); // Clear previous generated ideas

        const apiKey = settings.geminiApiKey;
        if (!apiKey) {
            setError("Gemini API Key is not set. Please set it in the settings.");
            setIsLoadingIdeas(false);
            return;
        }

        const shortsIdeaGenerationKb = settings.knowledgeBases?.youtube?.shortsIdeaGeneration || '';
        const whoAmI = settings.knowledgeBases?.youtube?.whoAmI || '';
        const styleGuideText = settings.styleGuideText || '';

        // Pass previously generated/saved shorts ideas to AI for context
        const previouslyCreatedShorts = shortsIdeas.map(idea => ({
            title: idea.title,
            status: idea.status // Or whatever status you store (e.g., 'saved', 'generated', 'published')
        }));

        try {
            const ideas = await window.aiUtils.generateShortsIdeasAI({
                videoTitle: video.chosenTitle || video.title,
                videoConcept: video.concept,
                videoLocationsFeatured: video.locations_featured || [],
                projectFootageInventory: project.footageInventory || {},
                projectTitle: project.playlistTitle,
                shortsIdeaGenerationKb: shortsIdeaGenerationKb,
                whoAmI: whoAmI,
                styleGuideText: styleGuideText,
                apiKey: apiKey,
                previouslyCreatedShorts: previouslyCreatedShorts // Pass saved shorts
            });
            setGeneratedIdeas(ideas);
        } catch (err) {
            console.error("Error generating shorts ideas:", err);
            setError(`Failed to generate ideas: ${err.message || err}`);
        } finally {
            setIsLoadingIdeas(false);
        }
    };

    const handleSaveIdea = (idea) => {
        const newIdea = {
            ...idea,
            id: `short-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Unique ID
            status: 'saved', // Initial status
            metadata: null // No metadata yet
        };
        onSaveShortsIdea(newIdea);
        setGeneratedIdeas(prev => prev.filter(gIdea => gIdea.title !== idea.title)); // Remove from generated list
    };

    const handleDeleteIdea = (id) => {
        if (window.confirm("Are you sure you want to delete this Shorts idea?")) {
            onDeleteShortsIdea(id);
        }
    };

    const handleGenerateMetadata = async (ideaId, idea) => {
        setIsLoadingMetadata(prev => ({ ...prev, [ideaId]: true }));
        setError('');

        const apiKey = settings.geminiApiKey;
        if (!apiKey) {
            setError("Gemini API Key is not set. Please set it in the settings.");
            setIsLoadingMetadata(prev => ({ ...prev, [ideaId]: false }));
            return;
        }
        
        const whoAmI = settings.knowledgeBases?.youtube?.whoAmI || '';
        const styleGuideText = settings.styleGuideText || '';

        try {
            const metadata = await window.aiUtils.generateShortsMetadataAI({
                videoTitle: video.chosenTitle || video.title,
                shortsIdea: idea,
                whoAmI: whoAmI,
                styleGuideText: styleGuideText,
                apiKey: apiKey
            });
            onGenerateShortsMetadata(ideaId, metadata);
        } catch (err) {
            console.error("Error generating shorts metadata:", err);
            setError(`Failed to generate metadata: ${err.message || err}`);
        } finally {
            setIsLoadingMetadata(prev => ({ ...prev, [ideaId]: false }));
        }
    };

    return (
        <div className="w-full h-full flex flex-col"> {/* Removed fixed positioning and overlay; added flex-col */}
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 text-center">Generate YouTube Shorts Ideas</h2> {/* Adjusted text size for responsiveness */}

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

                {/* Main content area for ideas - using a flex container for responsiveness */}
                <div className="flex flex-col lg:flex-row gap-6"> {/* Added responsive flex layout */}
                    {/* Display Saved Shorts Ideas */}
                    {(shortsIdeas.length > 0 || generatedIdeas.length > 0) && ( // Only show section if there are ideas
                        <div className={`flex-1 ${shortsIdeas.length > 0 ? 'block' : 'hidden lg:block'}`}> {/* Conditional display for smaller screens */}
                            <h3 className="text-xl font-bold text-white mb-4">Saved Shorts Ideas ({shortsIdeas.length})</h3>
                            <div className="space-y-4">
                                {shortsIdeas.map((idea, index) => (
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

                    {/* Display Newly Generated Ideas */}
                    {(generatedIdeas.length > 0 || shortsIdeas.length > 0) && ( // Only show section if there are ideas
                        <div className={`flex-1 ${generatedIdeas.length > 0 ? 'block' : 'hidden lg:block'}`}> {/* Conditional display for smaller screens */}
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
                
                {/* Message when no ideas are present */}
                {shortsIdeas.length === 0 && generatedIdeas.length === 0 && (
                    <div className="text-center text-gray-500 mt-8">
                        No Shorts ideas saved or generated yet. Click "Generate Shorts Ideas" to get started!
                    </div>
                )}

            </div>
            {/* The 'Close' button is now handled by ShortsTool.js if needed at that level. */}
        </div>
    );
};
