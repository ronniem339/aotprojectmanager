window.ThumbnailTask = ({ video, onUpdate, onCompletion, settings }) => {
    const { useState, useEffect } = React;
    const [concepts, setConcepts] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedConcept, setSelectedConcept] = useState('');
    const [finalUrl, setFinalUrl] = useState('');

    useEffect(() => {
        setConcepts(video.thumbnailConcepts || []);
        setSelectedConcept(video.chosenThumbnailConcept || '');
        setFinalUrl(video.thumbnailUrl || '');
    }, [video]);

    const handleSave = () => {
        onUpdate({
            ...video,
            thumbnailConcepts: concepts,
            chosenThumbnailConcept: selectedConcept,
            thumbnailUrl: finalUrl
        });
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        const apiKey = settings.geminiApiKey;
        if (!apiKey) {
            alert("Please set Gemini API key in settings.");
            setIsGenerating(false);
            return;
        }

        const prompt = `
        Video Title: "${video.title}"
        Video Concept: "${video.concept}"
        Creator Style Guide (for visual style): "${settings.creatorStyleGuide}"

        Based on the video details, generate 3 distinct and compelling YouTube thumbnail concepts. For each concept, provide a concise description of the visual elements, text overlay, and overall mood. The concepts should be clickable and accurately represent the video content.

        Return a single JSON object with one key: "concepts", which is an array of strings.
        Example:
        {
          "concepts": [
            "Concept 1: A dramatic close-up of [subject] with bold, yellow text saying 'YOU WON'T BELIEVE THIS!'",
            "Concept 2: A split screen showing a 'before' and 'after' shot of [subject], with minimal text.",
            "Concept 3: An intriguing, mysterious image related to the video's core question, with text like 'The Answer is Inside...'"
          ]
        }
        `;
        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(
                prompt,
                settings.geminiApiKey,
                {},
                'generateThumbnailConcepts', // Task type
                settings.useProModel, // Pass the setting
                settings.geminiFlashModelName, // Pass the setting
                settings.geminiProModelName // Pass the setting
            );
            if (parsedJson.concepts) {
                setConcepts(prev => [...prev, ...parsedJson.concepts]);
            }
        } catch (err) {
            console.error(err);
            alert("Failed to generate thumbnail concepts. Check console for details.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleComplete = () => {
        handleSave();
        onCompletion(video.id, 'thumbnail', { thumbnailUrl: finalUrl, chosenThumbnailConcept: selectedConcept });
    };

    return (
        <div className="bg-gray-800 p-4 rounded-lg space-y-4">
            <h3 className="text-lg font-bold">Thumbnail</h3>
            <button onClick={handleGenerate} disabled={isGenerating} className="btn-secondary w-full">
                {isGenerating ? 'Generating...' : 'Generate Concepts with AI'}
            </button>
            <div className="space-y-2">
                {concepts.map((concept, index) => (
                    <div key={index} className="flex items-center">
                        <input
                            type="radio"
                            id={`concept-${index}`}
                            name="thumbnail-concept"
                            value={concept}
                            checked={selectedConcept === concept}
                            onChange={(e) => setSelectedConcept(e.target.value)}
                            onBlur={handleSave}
                            className="h-4 w-4 text-primary-accent focus:ring-primary-accent border-gray-600 bg-gray-700"
                        />
                        <label htmlFor={`concept-${index}`} className="ml-3 block text-sm text-gray-300">
                            {concept}
                        </label>
                    </div>
                ))}
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Final Thumbnail URL</label>
                <input
                    type="text"
                    value={finalUrl}
                    onChange={(e) => setFinalUrl(e.target.value)}
                    onBlur={handleSave}
                    className="form-input w-full bg-gray-700"
                    placeholder="https://your-image-host.com/thumbnail.jpg"
                />
            </div>
            {finalUrl && <img src={finalUrl} alt="Thumbnail preview" className="rounded-lg mt-2 w-full aspect-video object-cover" />}
            <button onClick={handleComplete} disabled={!finalUrl} className="btn-primary w-full disabled:bg-gray-600">Mark as Complete</button>
        </div>
    );
};
