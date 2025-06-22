// creators-hub/js/components/ProjectView/tasks/ThumbnailTask.js

window.ThumbnailTask = ({ video, settings, onUpdateTask, isLocked }) => {
    const { useState, useEffect } = React;
    const [finalDesignBrief, setFinalDesignBrief] = useState(video.thumbnailBrief || '');
    
    const [imageDescriptions, setImageDescriptions] = useState({
        image1: '',
        image2: '',
        image3: ''
    });
    const [ideas, setIdeas] = useState({ ideas1: [], ideas2: [], ideas3: [] });
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [copiedIdeaId, setCopiedIdeaId] = useState(null);

    useEffect(() => {
        setFinalDesignBrief(video.thumbnailBrief || '');
    }, [video.thumbnailBrief]);

    const handleDescriptionChange = (key, value) => {
        setImageDescriptions(prev => ({ ...prev, [key]: value }));
    };

    const handleGenerateIdeas = async () => {
        if (!imageDescriptions.image1 || !imageDescriptions.image2 || !imageDescriptions.image3) {
            setError('Please describe all three images before generating ideas.');
            return;
        }

        setGenerating(true);
        setError('');
        setIdeas({ ideas1: [], ideas2: [], ideas3: [] });

        const prompt = `
            You are an expert YouTube thumbnail designer creating variations for an A/B test.
            A user has provided descriptions for three different images they want to use for the same video.
            Your task is to generate distinct and compelling text and graphical element suggestions for EACH of the three images. The goal is to create three unique thumbnail concepts that can be tested against each other.

            Video Title: "${video.title}"
            Video Concept: "${video.concept}"

            ---
            Image 1 Description: "${imageDescriptions.image1}"
            ---
            Image 2 Description: "${imageDescriptions.image2}"
            ---
            Image 3 Description: "${imageDescriptions.image3}"
            ---

            For each image, provide two distinct text/element ideas.
            Focus on high-contrast, emotionally engaging, and curiosity-driven text. Text should be very concise (ideally under 7 words).

            Return the result as a single JSON object. The object must have three keys: "thumbnail_1_ideas", "thumbnail_2_ideas", and "thumbnail_3_ideas".
            Each key must contain an array of strings, where each string is a complete suggestion for that thumbnail.

            Example format:
            {
                "thumbnail_1_ideas": [
                    "Suggestion 1 for Image 1...",
                    "Suggestion 2 for Image 1..."
                ],
                "thumbnail_2_ideas": [
                    "Suggestion 1 for Image 2...",
                    "Suggestion 2 for Image 2..."
                ],
                "thumbnail_3_ideas": [
                    "Suggestion 1 for Image 3...",
                    "Suggestion 2 for Image 3..."
                ]
            }
        `;

        try {
            const result = await window.aiUtils.callGeminiAPI(prompt, settings, {});
            setIdeas({
                ideas1: result.thumbnail_1_ideas || [],
                ideas2: result.thumbnail_2_ideas || [],
                ideas3: result.thumbnail_3_ideas || [],
            });
        } catch (err) {
            console.error("Error generating thumbnail ideas:", err);
            setError(`Failed to generate ideas: ${err.message}`);
        } finally {
            setGenerating(false);
        }
    };

    const handleSaveBrief = () => {
        if (!finalDesignBrief.trim()) {
            setError('The design brief cannot be empty. Please choose an idea or write your own.');
            return;
        }
        setError('');
        // FIX: The task ID was incorrect. It should be 'thumbnailsGenerated' to match the app's task pipeline.
        onUpdateTask('thumbnailsGenerated', 'complete', { 'tasks.thumbnailBrief': finalDesignBrief });
    };

    if (isLocked) {
        return <p className="text-gray-400 text-center py-2 text-sm">Please complete the previous steps first.</p>;
    }

    const areAllDescriptionsFilled = imageDescriptions.image1 && imageDescriptions.image2 && imageDescriptions.image3;
    const haveIdeasBeenGenerated = ideas.ideas1.length > 0 || ideas.ideas2.length > 0 || ideas.ideas3.length > 0;

    return (
        <div className="task-content flex flex-col" style={{ height: 'calc(100% - 1rem)' }}>
            {/* --- TOP PART (FIXED) --- */}
            <div className="flex-shrink-0 space-y-4">
                <p className="text-sm font-medium text-gray-300">Describe the three images you want to use for A/B testing:</p>
                {Object.keys(imageDescriptions).map((key, index) => (
                    <div key={key} className="space-y-1">
                        <label htmlFor={key} className="block text-sm font-semibold text-gray-400">Image {index + 1} Description:</label>
                        <textarea id={key} value={imageDescriptions[key]} onChange={(e) => handleDescriptionChange(key, e.target.value)} placeholder={`e.g., A wide shot of the entire building with a clear blue sky.`} className="form-textarea" rows={2} disabled={generating} />
                    </div>
                ))}
                <button onClick={handleGenerateIdeas} disabled={generating || !areAllDescriptionsFilled} className="button-primary-small w-full justify-center">
                    {generating ? <window.LoadingSpinner isButton={true} /> : '🤖 Generate A/B Test Ideas'}
                </button>
                {error && <p className="error-message">{error}</p>}
            </div>

            {/* --- MIDDLE PART (SCROLLABLE) --- */}
            <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 mt-4 space-y-4">
                {haveIdeasBeenGenerated && (
                    <div className="space-y-4">
                        {Object.entries(ideas).map(([key, ideaList], index) => (
                            ideaList.length > 0 && (
                                <div key={key} className="space-y-3">
                                    <h4 className="text-lg font-semibold text-white">Suggestions for Image {index + 1}:</h4>
                                    {ideaList.map((idea, ideaIndex) => {
                                        const ideaId = `${index}-${ideaIndex}`;
                                        const isCopied = copiedIdeaId === ideaId;
                                        return (
                                            <div key={ideaIndex} className={`glass-card-light p-3 rounded-lg flex justify-between items-start gap-4 transition-colors duration-300 ${isCopied ? 'bg-green-900/60' : ''}`}>
                                                <p className="text-gray-300 text-sm flex-grow pr-4">{idea}</p>
                                                <button
                                                    onClick={() => {
                                                        setFinalDesignBrief(prev => prev ? `${prev}\n\nThumbnail ${index + 1} Idea:\n${idea}` : `Thumbnail ${index + 1} Idea:\n${idea}`);
                                                        setError('');
                                                        setCopiedIdeaId(ideaId);
                                                        setTimeout(() => setCopiedIdeaId(null), 2000);
                                                    }}
                                                    className={`button-secondary-small flex-shrink-0 transition-colors duration-200 ${isCopied ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                                                    title="Add this idea to the brief"
                                                    disabled={isCopied}
                                                >
                                                    {isCopied ? 'Copied!' : 'Use Idea'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        ))}
                    </div>
                )}
            </div>

            {/* --- BOTTOM PART (FIXED) --- */}
            <div className="flex-shrink-0 pt-4 border-t border-gray-700 space-y-4">
                <div className="space-y-2">
                    <label htmlFor="designBrief" className="block text-sm font-medium text-gray-300">
                        Final Thumbnail Design Brief (for all 3 versions):
                    </label>
                    <textarea
                        id="designBrief"
                        value={finalDesignBrief}
                        onChange={(e) => setFinalDesignBrief(e.target.value)}
                        placeholder="Describe the final designs for all three thumbnails here. Use the ideas above or write your own."
                        className="form-textarea"
                        rows={5}
                    />
                </div>
                <div className="text-center">
                     <button
                        onClick={handleSaveBrief}
                        disabled={generating || !finalDesignBrief}
                        className="w-full max-w-xs mx-auto px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold text-white disabled:bg-gray-500 disabled:cursor-not-allowed"
                    >
                        Confirm Brief & Mark Complete
                    </button>
                </div>
            </div>
        </div>
    );
};
