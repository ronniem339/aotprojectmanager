// creators-hub/js/components/ProjectView/tasks/ThumbnailTask.js

window.ThumbnailTask = ({ video, settings, onUpdateTask, isLocked }) => {
    const { useState, useEffect } = React;
    const [finalDesignBrief, setFinalDesignBrief] = useState(video.thumbnailBrief || '');
    // --- START: NEW AND UPDATED STATE ---
    const [imageDescription, setImageDescription] = useState('');
    const [ideas, setIdeas] = useState([]);
    // --- END: NEW AND UPDATED STATE ---
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Pre-fill the brief from video data if it exists
        setFinalDesignBrief(video.thumbnailBrief || '');
    }, [video.thumbnailBrief]);

    // --- START: UPDATED AI HANDLER FUNCTION ---
    const handleGenerateIdeas = async () => {
        if (!imageDescription) {
            setError('Please describe the image you plan to use before generating ideas.');
            return;
        }

        setGenerating(true);
        setError('');
        setIdeas([]); // Clear previous ideas

        const prompt = `
            You are an expert YouTube thumbnail designer known for creating viral thumbnails.
            A user has provided a description of the image they plan to use. Your task is to suggest compelling text and graphical elements to overlay on this image. Do NOT suggest new images.

            Video Title: "${video.title}"
            Video Concept: "${video.concept}"
            User's Image Description: "${imageDescription}"

            Based on this, provide 3 distinct and powerful ideas for the thumbnail's text and on-screen elements.
            Focus on creating high-contrast, emotionally engaging, and curiosity-driven text.
            The text should be very concise (ideally under 7 words).

            Return the result as a JSON object with a single key "ideas" containing an array of strings. Each string should be a complete suggestion describing the text and elements.

            Example format:
            {
                "ideas": [
                    "Text Idea 1: 'THE HIDDEN TRUTH' in a bold, impactful font. Elements: A glowing outline around the text and a subtle red arrow pointing towards the main subject of the image.",
                    "Text Idea 2: 'IS THIS THE END?' in a distressed, gritty font. Elements: A vignetting effect to darken the edges of the image to create drama.",
                    "Text Idea 3: 'I CAN'T BELIEVE IT!' with a shocking face emoji (😮). Elements: Bright yellow text with a thick black stroke for maximum readability."
                ]
            }
        `;

        try {
            const result = await window.aiUtils.callGeminiAPI(prompt, settings, {});
            setIdeas(result.ideas || []);
        } catch (err) {
            console.error("Error generating thumbnail ideas:", err);
            setError(`Failed to generate ideas: ${err.message}`);
        } finally {
            setGenerating(false);
        }
    };
    // --- END: UPDATED AI HANDLER FUNCTION ---

    const handleSaveBrief = () => {
        if (!finalDesignBrief.trim()) {
            setError('The design brief cannot be empty. Please choose an idea or write your own.');
            return;
        }
        setError('');
        onUpdateTask('thumbnail', 'complete', { thumbnailBrief: finalDesignBrief });
    };

    if (isLocked) {
        return <p className="text-gray-400 text-center py-2 text-sm">Please complete the previous steps first.</p>;
    }

    // --- START: UPDATED COMPONENT UI ---
    return (
        <div className="task-content space-y-4">
            <div className="space-y-2">
                 <label htmlFor="imageDesc" className="block text-sm font-medium text-gray-300">
                    First, describe the image you want to use for the thumbnail:
                </label>
                <textarea
                    id="imageDesc"
                    value={imageDescription}
                    onChange={(e) => setImageDescription(e.target.value)}
                    placeholder="e.g., A close-up shot of me looking surprised, with a picture of a historic castle in the background."
                    className="form-textarea"
                    rows={3}
                    disabled={generating}
                />
            </div>

            <button
                onClick={handleGenerateIdeas}
                disabled={generating || !imageDescription}
                className="button-primary-small w-full justify-center"
            >
                {generating ? <window.LoadingSpinner isButton={true} /> : '🤖 Generate Text & Element Ideas'}
            </button>

            {error && <p className="error-message">{error}</p>}

            {ideas.length > 0 && (
                <div className="space-y-3 mt-4">
                    <h4 className="text-lg font-semibold text-white">Suggestions:</h4>
                    {ideas.map((idea, index) => (
                        <div key={index} className="glass-card-light p-3 rounded-lg flex justify-between items-start gap-4">
                            <p className="text-gray-300 text-sm flex-grow pr-4">{idea}</p>
                            <button
                                onClick={() => {
                                    setFinalDesignBrief(idea);
                                    setError('');
                                }}
                                className="button-secondary-small flex-shrink-0"
                                title="Use this idea for the brief"
                            >
                                Use Idea
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="space-y-2 pt-4 border-t border-gray-700">
                <label htmlFor="designBrief" className="block text-sm font-medium text-gray-300">
                    Final Thumbnail Design Brief:
                </label>
                <textarea
                    id="designBrief"
                    value={finalDesignBrief}
                    onChange={(e) => setFinalDesignBrief(e.target.value)}
                    placeholder="Describe the final thumbnail design here. You can use one of the suggestions above or write your own."
                    className="form-textarea"
                    rows={4}
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
    );
    // --- END: UPDATED COMPONENT UI ---
};
