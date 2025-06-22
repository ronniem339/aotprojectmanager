// creators-hub/js/components/ProjectView/tasks/DescriptionTask.js

window.DescriptionTask = ({ video, onUpdateTask, isLocked, project, settings }) => {
    const { useState, useEffect } = React;
    const [description, setDescription] = useState(video.metadata?.description || '');
    const [styleGuide, setStyleGuide] = useState('');
    const [refinementPrompt, setRefinementPrompt] = useState('');
    const [generating, setGenerating] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const [error, setError] = useState('');

    // Fetch studio details (including the style guide) when the component mounts
    useEffect(() => {
        const fetchStudioDetails = async () => {
            // FIX: Check if window.electron and the function exist before calling them.
            if (window.electron && typeof window.electron.getStudioDetails === 'function') {
                try {
                    const details = await window.electron.getStudioDetails();
                    if (details && details.styleGuide) {
                        setStyleGuide(details.styleGuide);
                    }
                } catch (err) {
                    // This log is more informative than the previous crash.
                    console.error("Failed to load studio details:", err);
                }
            } else {
                console.warn("`window.electron.getStudioDetails` is not available. Style guide will not be loaded.");
            }
        };
        fetchStudioDetails();
    }, []); // Runs once on mount

    // When the video data changes, update the description in the textarea
    useEffect(() => {
        setDescription(video.metadata?.description || '');
    }, [video.metadata?.description]);

    const handleGenerateDescription = async () => {
        setGenerating(true);
        setError('');

        // Construct the identity context from the passed-in studioDetails prop.
        let whoAmIContext = 'Remember to write from the perspective of a solo creator. Use "I", "my", and "me". Avoid "we" and "our".';
        if (studioDetails) {
            whoAmIContext = `
                **My Identity:**
                - Channel Name: ${studioDetails.channelName || 'N/A'}
                - Channel Description: ${studioDetails.channelDescription || 'N/A'}
                - Target Audience: ${studioDetails.targetAudience || 'N/A'}
                - General Style Guide: ${studioDetails.styleGuide || 'N/A'}
                - Based on this, adopt the persona of a solo creator. Always write from my perspective, using "I", "my", and "me". Avoid using "we", "our", or "us".
            `;
        }

        const prompt = `${whoAmIContext}

---

You are a YouTube SEO expert. Your primary goal is to write an engaging and SEO-optimized YouTube description based on the identity provided above.
It should be around 200-300 words. Include keywords naturally. The first 2-3 sentences are the most important for CTR.

Here is the video information:
Video Title: "${video.chosenTitle || video.title}"
Video Concept: "${video.concept}"
Locations Featured: ${(video.locations_featured || []).join(', ')}
Keywords: ${(video.targeted_keywords || []).join(', ')}
Project Context: "${project.playlistTitle} - ${project.playlistDescription}"

Return the description as a JSON object like: {"description": "The full text of the description..."}.`;

        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings, {}, true);
            const generatedDescription = parsedJson.description || '';
            setDescription(generatedDescription);
            onUpdateTask('descriptionGenerated', 'in-progress', { 'metadata.description': generatedDescription });
        } catch (err) {
            setError(`Failed to generate description: ${err.message}`);
            console.error(err);
        } finally {
            setGenerating(false);
        }
    };

    // Function to handle refining the description
    const handleRefineDescription = async () => {
        if (!refinementPrompt) return;
        setIsRefining(true);
        setError('');

        const prompt = `You are a YouTube copy editor. Refine the following YouTube description based on the user's instructions.
        Current Description:
        ---
        ${description}
        ---
        Instructions: "${refinementPrompt}"

        Return only the refined description in a JSON object like: {"refinedDescription": "The full text of the refined description..."}.`;

        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings, {}, true);
            const refinedDescription = parsedJson.refinedDescription || '';
            if (refinedDescription) {
                setDescription(refinedDescription);
                onUpdateTask('descriptionGenerated', 'in-progress', { 'metadata.description': refinedDescription });
                setRefinementPrompt(''); // Clear input on success
            } else {
                 setError('The AI did not return a refined description. Please try again.');
            }
        } catch (err) {
            setError(`Failed to refine description: ${err.message}`);
            console.error(err);
        } finally {
            setIsRefining(false);
        }
    };

    const handleSave = () => {
        onUpdateTask('descriptionGenerated', 'complete', { 'metadata.description': description });
    };

    if (isLocked) {
        return <p className="text-gray-400 text-center py-2 text-sm">Please finalize the title first.</p>;
    }

    const anyLoading = generating || isRefining;

    return (
        <div className="task-container">
            <div className="task-content space-y-4">
                <button onClick={handleGenerateDescription} disabled={anyLoading} className="button-primary-small w-full justify-center">
                    {generating ? <window.LoadingSpinner isButton={true}/> : '🤖 Generate Description'}
                </button>
                {error && <p className="error-message">{error}</p>}

                <textarea
                    className="form-textarea h-64"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={() => onUpdateTask('descriptionGenerated', 'in-progress', { 'metadata.description': description })}
                    placeholder="Write or generate the video description here..."
                    disabled={anyLoading}
                />

                {/* Refinement UI Section */}
                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 space-y-3">
                    <label className="block text-sm font-medium text-gray-300">Refine Description</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            className="form-input flex-grow"
                            placeholder="e.g., make it more casual, add emojis"
                            value={refinementPrompt}
                            onChange={(e) => setRefinementPrompt(e.target.value)}
                            disabled={anyLoading}
                        />
                        <button
                            onClick={handleRefineDescription}
                            disabled={anyLoading || !refinementPrompt}
                            className="button-secondary-small flex-shrink-0"
                        >
                            {isRefining ? <window.LoadingSpinner isButton={true}/> : '✍️ Refine'}
                        </button>
                    </div>
                </div>

                {/* Final Save Button */}
                <div className="pt-6 border-t border-gray-700 text-center">
                    <button onClick={handleSave} disabled={anyLoading} className="w-full max-w-xs mx-auto px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold text-white">
                        Confirm Description & Mark Complete
                    </button>
                </div>
            </div>
        </div>
    );
};
