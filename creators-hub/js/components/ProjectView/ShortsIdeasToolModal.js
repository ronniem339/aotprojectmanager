// js/components/ProjectView/ShortsIdeasToolModal.js

/**
 * ShortsIdeasToolModal Component
 * A modal tool for generating YouTube Shorts ideas based on video and project context.
 *
 * @param {object} props - The component props.
 * @param {object} props.video - The current video object.
 * @param {object} props.project - The current project object.
 * @param {object} props.settings - User settings, including AI API key and knowledge bases.
 * @param {function} props.onClose - Callback to close the modal.
 */
window.ShortsIdeasToolModal = ({ video, project, settings, onClose }) => {
    const { useState } = React;

    const [generatedIdeas, setGeneratedIdeas] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerateIdeas = async () => {
        setIsLoading(true);
        setError('');
        setGeneratedIdeas([]); // Clear previous ideas

        const apiKey = settings.geminiApiKey;
        if (!apiKey) {
            setError("Gemini API Key is not set. Please set it in the settings.");
            setIsLoading(false);
            return;
        }

        const shortsIdeaGenerationKb = settings.knowledgeBases?.youtube?.shortsIdeaGeneration || '';
        const whoAmI = settings.knowledgeBases?.youtube?.whoAmI || '';
        const styleGuideText = settings.styleGuideText || '';

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
                apiKey: apiKey
            });
            setGeneratedIdeas(ideas);
        } catch (err) {
            console.error("Error generating shorts ideas:", err);
            setError(`Failed to generate ideas: ${err.message || err}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
            <div className="glass-card rounded-lg p-8 w-full max-w-3xl h-5/6 flex flex-col relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-6 text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                <h2 className="text-3xl font-bold text-white mb-6 text-center">Generate YouTube Shorts Ideas</h2>

                <div className="flex-grow overflow-y-auto pr-4 custom-scrollbar">
                    <p className="text-gray-400 mb-6">Generate quick, engaging ideas for YouTube Shorts based on your video content and project details. You can generate ideas as many times as you like.</p>
                    
                    <div className="text-center mb-6">
                        <button onClick={handleGenerateIdeas} disabled={isLoading} className="px-6 py-3 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center mx-auto gap-2">
                            {isLoading ? <window.LoadingSpinner isButton={true} /> : '⚡ Generate Shorts Ideas'}
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-900/50 text-red-400 p-3 rounded-lg text-sm mb-4">
                            {error}
                        </div>
                    )}

                    {generatedIdeas.length > 0 && (
                        <div className="space-y-4">
                            {generatedIdeas.map((idea, index) => (
                                <div key={index} className="glass-card p-4 rounded-lg border border-gray-700">
                                    <h3 className="font-bold text-lg text-white mb-2">{idea.title}</h3>
                                    <p className="text-gray-300 text-sm">{idea.description}</p>
                                    <div className="mt-3 text-right">
                                        <window.CopyButton textToCopy={`${idea.title}\n\n${idea.description}`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex-shrink-0 pt-6 mt-6 border-t border-gray-700 text-right">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold text-white">Close</button>
                </div>
            </div>
        </div>
    );
};
