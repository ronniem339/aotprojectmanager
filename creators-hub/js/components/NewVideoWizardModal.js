// js/components/NewVideoWizardModal.js

/**
 * NewVideoWizardModal Component
 * A multi-step wizard for adding a new video to an existing project.
 *
 * @param {object} props - The component props.
 * @param {function} props.onClose - Callback to close the modal.
 * @param {function} props.onSave - Callback to save the new video data to Firestore.
 * @param {object} props.settings - User settings for AI API keys.
 * @param {boolean} props.googleMapsLoaded - Indicates if Google Maps API is loaded.
 * @param {Array<object>} props.projectLocations - List of project's overall locations, used for AI context.
 */
window.NewVideoWizardModal = ({ onClose, onSave, settings, googleMapsLoaded, projectLocations }) => {
    const { useState, useCallback } = React;

    const [step, setStep] = useState(1);
    const [videoData, setVideoData] = useState({
        title: '',
        concept: '',
        estimatedLengthMinutes: '',
        script: '', // Optional initial script
        locations_featured: [],
        targeted_keywords: [],
        tasks: {}, // Initial task statuses
    });
    const [refinement, setRefinement] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [keywordIdeas, setKeywordIdeas] = useState([]);

    const mainProjectLocationName = projectLocations[0]?.name || 'the project';

    // Step 1: Core Details (Title, Concept, Length, Optional Script)
    const renderStep1 = () => (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Video Title</label>
                <input
                    type="text"
                    value={videoData.title}
                    onChange={(e) => setVideoData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full form-input"
                    placeholder="e.g., 'Exploring the Hidden Caves of Gran Canaria'"
                    disabled={isLoading}
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Video Concept / Summary</label>
                <textarea
                    value={videoData.concept}
                    onChange={(e) => setVideoData(prev => ({ ...prev, concept: e.target.value }))}
                    rows="4"
                    className="w-full form-textarea"
                    placeholder="A brief summary of what this video will be about."
                    disabled={isLoading}
                ></textarea>
                <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 mt-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Refine Concept with AI</label>
                    <textarea value={refinement} onChange={(e) => setRefinement(e.target.value)} rows="2" className="w-full form-textarea" placeholder="e.g., 'Make it more adventurous' or 'Focus on local culture'"/>
                    <div className="text-right mt-2">
                        <button onClick={handleRefineConcept} disabled={isLoading || !refinement || !videoData.concept} className="px-4 py-2 text-sm bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center ml-auto gap-2">
                            {isLoading ? <window.LoadingSpinner isButton={true} /> : '✍️ Refine Concept'}
                        </button>
                    </div>
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Estimated Length (minutes)</label>
                <input
                    type="number"
                    value={videoData.estimatedLengthMinutes}
                    onChange={(e) => setVideoData(prev => ({ ...prev, estimatedLengthMinutes: e.target.value }))}
                    className="w-full form-input"
                    placeholder="e.g., 12"
                    min="1"
                    disabled={isLoading}
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Video Script (Optional)</label>
                <textarea
                    value={videoData.script}
                    onChange={(e) => setVideoData(prev => ({
                        ...prev,
                        script: e.target.value,
                        // If script is provided, mark scripting task as complete initially
                        tasks: e.target.value.trim() !== '' ? { ...prev.tasks, scripting: 'complete' } : { ...prev.tasks, scripting: 'pending' }
                    }))}
                    rows="6"
                    className="w-full form-textarea"
                    placeholder="Paste the script here if you already have one. This will mark the 'Scripting' task as complete."
                    disabled={isLoading}
                ></textarea>
                <p className="text-xs text-gray-500 mt-1">Providing the script will mark the 'Scripting' task as complete and help future AI tasks.</p>
            </div>
        </div>
    );

    const handleRefineConcept = async () => {
        setIsLoading(true);
        setError('');
        const apiKey = settings.geminiApiKey || "";
        const prompt = `Rewrite the following video concept based on the user's feedback.
Original Concept: "${videoData.concept}"
User Feedback: "${refinement}"
Return a JSON object: {"newConcept": "..."}`;
        try {
            const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } };
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error(await response.text());
            const result = await response.json();
            const parsedJson = JSON.parse(result.candidates[0].content.parts[0].text);
            if (parsedJson.newConcept) {
                setVideoData(prev => ({ ...prev, concept: parsedJson.newConcept }));
                setRefinement('');
            }
        } catch (err) {
            setError(`Failed to refine concept: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };


    // Step 2: Locations & Keywords
    const handleLocationsUpdate = useCallback((newLocations) => {
        setVideoData(prev => ({ ...prev, locations_featured: newLocations }));
    }, []);

    const handleKeywordAdd = (e) => {
        if (e.key === 'Enter' && e.target.value.trim() !== '') {
            e.preventDefault();
            const newKeyword = e.target.value.trim();
            setVideoData(prev => ({
                ...prev,
                targeted_keywords: prev.targeted_keywords.includes(newKeyword) ? prev.targeted_keywords : [...prev.targeted_keywords, newKeyword]
            }));
            e.target.value = ''; // Clear input
        }
    };

    const handleKeywordRemove = (keywordToRemove) => {
        setVideoData(prev => ({
            ...prev,
            targeted_keywords: prev.targeted_keywords.filter(kw => kw !== keywordToRemove)
        }));
    };

    const handleGenerateKeywords = async () => {
        setIsLoading(true);
        setError('');
        try {
            const keywords = await window.aiUtils.generateKeywordsAI({
                title: videoData.title,
                concept: videoData.concept,
                locationsFeatured: videoData.locations_featured.map(l => l.name),
                projectTitle: mainProjectLocationName, // Use project's main location name as context
                projectDescription: '', // No project description context needed here specifically
                settings: settings
            });
            setKeywordIdeas(keywords);
        } catch (e) {
            setError(`Failed to generate keywords: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeywordSelection = (keyword) => {
        setVideoData(prev => ({
            ...prev,
            targeted_keywords: prev.targeted_keywords.includes(keyword) ? prev.targeted_keywords.filter(k => k !== keyword) : [...prev.targeted_keywords, keyword]
        }));
    };


    const renderStep2 = () => (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Locations Featured in this Video</label>
                <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                    {googleMapsLoaded
                        ? <window.LocationSearchInput onLocationsChange={handleLocationsUpdate} existingLocations={videoData.locations_featured} />
                        : <window.MockLocationSearchInput />}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Targeted Keywords</label>
                <div className="p-2 bg-gray-900/50 rounded-lg border border-gray-700">
                    <div className="flex flex-wrap gap-2 mb-2">
                        {videoData.targeted_keywords.map(kw => (
                            <div key={kw} className="flex items-center gap-2 px-2.5 py-1 text-xs bg-secondary-accent-darker-opacity text-secondary-accent-lighter-text rounded-full">
                                <span>{kw}</span>
                                <button onClick={() => handleKeywordRemove(kw)} className="text-secondary-accent-lighter-text hover:text-white font-bold leading-none">&times;</button>
                            </div>
                        ))}
                    </div>
                    <input
                        type="text"
                        onKeyDown={handleKeywordAdd}
                        className="w-full form-input bg-gray-800 border-gray-600"
                        placeholder="Type a keyword and press Enter..."
                        disabled={isLoading}
                    />
                    <button onClick={handleGenerateKeywords} disabled={isLoading || !videoData.title || !videoData.concept} className="mt-3 px-4 py-2 text-sm bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:opacity-75 flex items-center gap-2">
                        {isLoading ? <window.LoadingSpinner isButton={true} /> : '💡 Generate Keyword Ideas'}
                    </button>
                    {error && <p className="text-red-400 mt-2 text-sm">{error}</p>}
                    {keywordIdeas.length > 0 && (
                        <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                            <h4 className="text-sm font-medium text-gray-300 mb-2">AI-Suggested Keywords:</h4>
                            <div className="flex flex-wrap gap-2">
                                {keywordIdeas.map((kw) => (
                                    <button
                                        key={kw}
                                        onClick={() => handleKeywordSelection(kw)}
                                        className={`px-3 py-1.5 text-xs rounded-full transition-colors ${videoData.targeted_keywords.includes(kw) ? 'bg-primary-accent text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
                                    >
                                        {kw}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    // Step 3: Review
    const renderStep3 = () => (
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-primary-accent mb-2">Review New Video Details</h3>
            <div className="glass-card p-4 rounded-lg">
                <p className="font-semibold">Title: <span className="font-normal text-gray-300">{videoData.title || 'N/A'}</span></p>
                <p className="font-semibold">Concept: <span className="font-normal text-gray-300">{videoData.concept || 'N/A'}</span></p>
                <p className="font-semibold">Est. Length: <span className="font-normal text-gray-300">{videoData.estimatedLengthMinutes ? `${videoData.estimatedLengthMinutes} min` : 'N/A'}</span></p>
                <p className="font-semibold">Locations: <span className="font-normal text-gray-300">{videoData.locations_featured.map(l => l.name).join(', ') || 'N/A'}</span></p>
                <p className="font-semibold">Keywords: <span className="font-normal text-gray-300">{videoData.targeted_keywords.join(', ') || 'N/A'}</span></p>
                <p className="font-semibold">Script Provided: <span className="font-normal text-gray-300">{videoData.script.trim() !== '' ? 'Yes' : 'No'}</span></p>
            </div>
            {error && <p className="text-red-400 mt-4 text-sm">{error}</p>}
        </div>
    );

    const handleNext = () => {
        setError('');
        if (step === 1) {
            if (!videoData.title.trim() || !videoData.concept.trim()) {
                setError("Title and Concept are required for the video.");
                return;
            }
        }
        setStep(prev => prev + 1);
    };

    const handlePrev = () => {
        setStep(prev => prev - 1);
        setError('');
    };

    const handleSaveVideo = () => {
        if (!videoData.title.trim() || !videoData.concept.trim()) {
            setError("Title and Concept are required before creating the video.");
            setStep(1); // Go back to step 1 if missing
            return;
        }
        onSave({
            ...videoData,
            // Ensure necessary fields are initialized if not set
            locations_featured: videoData.locations_featured.map(l => l.name), // Save just names
            targeted_keywords: videoData.targeted_keywords,
            tasks: videoData.tasks || { scripting: videoData.script.trim() !== '' ? 'complete' : 'pending' },
            chosenTitle: videoData.title, // Set chosen title initially
        });
        onClose(); // Close after saving
    };

    const totalSteps = 3;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
            <div className="glass-card rounded-lg p-8 w-full max-w-2xl h-5/6 flex flex-col relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-6 text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                <h2 className="text-3xl font-bold text-white mb-6 text-center">Add New Video</h2>

                {/* Wizard Content */}
                <div className="flex-grow overflow-y-auto pr-4 custom-scrollbar">
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                </div>

                {error && <p className="text-red-400 mt-4 text-sm bg-red-900/50 p-3 rounded-lg">{error}</p>}

                {/* Footer Buttons */}
                <div className="flex-shrink-0 pt-6 mt-6 border-t border-gray-700 flex justify-between items-center">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold text-white">Cancel</button>
                    <div className="flex gap-4">
                        {step > 1 && (
                            <button onClick={handlePrev} className="px-6 py-2 bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold text-white">Back</button>
                        )}
                        {step < totalSteps && (
                            <button onClick={handleNext} disabled={isLoading} className="px-6 py-2 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold text-white disabled:opacity-75 disabled:cursor-not-allowed">
                                {isLoading ? <window.LoadingSpinner isButton={true} /> : 'Next'}
                            </button>
                        )}
                        {step === totalSteps && (
                            <button onClick={handleSaveVideo} disabled={isLoading} className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold text-white disabled:opacity-75 disabled:cursor-not-allowed">
                                {isLoading ? <window.LoadingSpinner isButton={true} /> : 'Create Video'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
