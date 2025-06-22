// creators-hub/js/components/ProjectView/tasks/DescriptionTask.js

// The component now correctly receives `studioDetails` as a prop.
window.DescriptionTask = ({ video, onUpdateTask, isLocked, project, settings, studioDetails }) => {
    const { useState, useEffect } = React;
    const [description, setDescription] = useState(video.metadata?.description || '');
    const [refinementPrompt, setRefinementPrompt] = useState('');
    const [generating, setGenerating] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const [error, setError] = useState('');

    // The problematic useEffect that tried to fetch studioDetails has been removed.

    // When the video data changes, update the description in the textarea
    useEffect(() => {
        setDescription(video.metadata?.description || '');
    }, [video.metadata?.description]);

    const handleGenerateDescription = async () => {
        setGenerating(true);
        setError('');

        // 1. Get the "Who Am I" knowledge base from the main app settings.
        const whoAmI = settings?.knowledgeBases?.youtube?.whoAmI || 'I am a solo creator.';

        // 2. Get the "Style Guide" from the separate studio details.
        const styleGuide = studioDetails?.styleGuide || 'No specific style guide provided.';

        // 3. Construct the prompt with clear separation of contexts.
        const prompt = `
            **CONTEXT 1: MY IDENTITY**
            ${whoAmI}
            Based on this identity, you must write from a first-person singular perspective (I, my, me). Do not use "we" or "our".

            **CONTEXT 2: MY STYLE GUIDE**
            ${styleGuide}

            ---

            **YOUR TASK**
            You are a YouTube SEO expert. Using the identity and style guide provided in the contexts above, write an engaging and SEO-optimized YouTube description for the following video.
            It should be around 200-300 words. Include keywords naturally. The first 2-3 sentences are the most important for CTR.

            **VIDEO DETAILS**
            - Video Title: "${video.chosenTitle || video.title}"
            - Video Concept: "${video.concept}"
            - Keywords: ${(video.targeted_keywords || []).join(', ')}
            - Project Context: "${project.playlistTitle} - ${project.playlistDescription}"

            Return the description as a JSON object like: {"description": "The full text of the description..."}.
        `;

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
