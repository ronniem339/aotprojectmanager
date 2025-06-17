window.NewVideoWizardModal = ({ project, onSave, onClose, settings }) => {
    const { useState, useCallback } = React;
    const [rawText, setRawText] = useState('');
    const [parsedVideo, setParsedVideo] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleParseVideo = async () => {
        if (!rawText.trim() || !settings.geminiApiKey) {
            setError('Please enter some text to parse and ensure your Gemini API key is set.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const result = await window.aiUtils.parseVideoFromTextAI({
                inputText: rawText,
                projectName: project.name,
                projectConcept: project.concept,
                creatorPersona: settings.creatorPersona,
                creatorStyleGuide: settings.creatorStyleGuide,
                apiKey: settings.geminiApiKey,
                useProModelSetting: settings.useProModel, // Pass the setting
                flashModelName: settings.geminiFlashModelName, // Pass the setting
                proModelName: settings.geminiProModelName // Pass the setting
            });
            if (result && result.video) {
                // Add a temporary client-side ID
                const videoWithId = { ...result.video, id: `temp_${Date.now()}` };
                setParsedVideo(videoWithId);
            } else {
                 setError('The AI returned an unexpected format. Could not parse video.');
            }
        } catch (e) {
            console.error("Error parsing video from text:", e);
            setError(e.message || "An error occurred while parsing the text.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGenerateKeywords = async (video) => {
        if (!settings.geminiApiKey) return;
        setIsLoading(true);
        try {
            const result = await window.aiUtils.generateKeywordsAI({
                videoTitle: video.title,
                videoConcept: video.concept,
                locations: video.locations,
                apiKey: settings.geminiApiKey,
                useProModelSetting: settings.useProModel, // Pass the setting
                flashModelName: settings.geminiFlashModelName, // Pass the setting
                proModelName: settings.geminiProModelName // Pass the setting
            });
            if (result.keywords) {
                 setParsedVideo(prev => ({ ...prev, keywords: [...new Set([...(prev.keywords || []), ...result.keywords])] }));
            }
        } catch (e) {
            console.error("Error generating keywords:", e);
            // Not a critical error, so just log it
        } finally {
            setIsLoading(false);
        }
    };


    const handleSaveVideo = () => {
        onSave(parsedVideo);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-700">
                    <h2 className="text-xl font-bold">Add New Video from Text</h2>
                    <p className="text-sm text-gray-400">Paste in a script, notes, or transcript to create a new video entry.</p>
                </div>
                <div className="p-6 overflow-y-auto flex-grow">
                    {!parsedVideo ? (
                        <div>
                            <textarea
                                value={rawText}
                                onChange={(e) => setRawText(e.target.value)}
                                rows="15"
                                className="w-full form-textarea bg-gray-900 border-gray-600 rounded-md"
                                placeholder="Paste your script, notes, or any text here..."
                            />
                            <button
                                onClick={handleParseVideo}
                                disabled={isLoading || !rawText.trim()}
                                className="btn-primary w-full mt-4"
                            >
                                {isLoading ? 'Parsing with AI...' : 'Parse Text to Create Video'}
                            </button>
                        </div>
                    ) : (
                         <window.WizardStep_AIParse 
                             parsedVideo={parsedVideo}
                             setParsedVideo={setParsedVideo}
                             onGenerateKeywords={() => handleGenerateKeywords(parsedVideo)}
                             isLoading={isLoading}
                         />
                    )}
                    {error && <p className="text-red-400 mt-4">{error}</p>}
                </div>
                <div className="p-6 bg-gray-900 border-t border-gray-700 flex justify-end items-center space-x-4">
                     <button onClick={onClose} className="btn-secondary">Cancel</button>
                     <button onClick={handleSaveVideo} disabled={!parsedVideo || isLoading} className="btn-primary">
                        Add Video to Project
                    </button>
                </div>
            </div>
        </div>
    );
};
