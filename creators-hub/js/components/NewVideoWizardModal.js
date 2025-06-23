// js/components/NewVideoWizardModal.js

/**
 * NewVideoWizardModal Component
 * A multi-step wizard for adding a new video to an existing project,
 * now starting with an AI-powered parsing step.
 */
window.NewVideoWizardModal = ({ onClose, onSave, settings, googleMapsLoaded, projectLocations }) => {
    const { useState, useCallback } = React;

    // Start at step 0 for the new AI parse screen
    const [step, setStep] = useState(0);
    const [videoData, setVideoData] = useState({
        title: '',
        concept: '',
        estimatedLengthMinutes: '',
        script: '',
        locations_featured: [], // This will now store location objects
        targeted_keywords: [],
        tasks: {},
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [keywordIdeas, setKeywordIdeas] = useState([]);

    const mainProjectLocationName = projectLocations[0]?.name || 'the project';

    // New function to handle AI parsing from text input
    const handleAnalyzeText = async (textInput) => {
        setIsLoading(true);
        setError('');
        try {
            const parsedData = await window.aiUtils.parseVideoFromTextAI({
                textInput,
                projectLocation: mainProjectLocationName,
                settings
            });

            // Geocode location names returned by the AI into location objects
            const geocodeLocation = (name) => {
                return new Promise((resolve) => {
                    const fallback = { name: name, place_id: null, lat: null, lng: null, types: [] };

                    if (!googleMapsLoaded || !window.google?.maps?.Geocoder) {
                        console.warn("Google Maps not available for geocoding, returning location name only.");
                        resolve(fallback);
                        return;
                    }
                    const geocoder = new window.google.maps.Geocoder();
                    geocoder.geocode({ 'address': name, 'region': mainProjectLocationName }, (results, status) => {
                        if (status === 'OK' && results[0]) {
                            const place = results[0];
                            resolve({
                                name: name, // Keep original name for display consistency
                                place_id: place.place_id,
                                lat: place.geometry.location.lat(),
                                lng: place.geometry.location.lng(),
                                types: place.types
                            });
                        } else {
                             console.warn(`Geocoding failed for "${name}": ${status}`);
                            resolve(fallback);
                        }
                    });
                });
            };

            const locationObjects = await Promise.all(
                (parsedData.locations_featured || []).map(name => geocodeLocation(name.trim()))
            );

            setVideoData(prev => ({
                ...prev,
                title: parsedData.title || '',
                concept: parsedData.concept || '',
                script: parsedData.script || '',
                estimatedLengthMinutes: parsedData.estimatedLengthMinutes || '',
                locations_featured: locationObjects.filter(loc => loc && loc.name),
                targeted_keywords: parsedData.targeted_keywords || [],
                tasks: (parsedData.script || '').trim() !== '' ? { ...prev.tasks, scripting: 'complete' } : { ...prev.tasks, scripting: 'pending' },
            }));

            setStep(1); // Move to the review step
        } catch (err) {
            console.error("Error parsing video data with AI:", err);
            setError(`AI analysis failed: ${err.message}. Please try again or fill the details manually.`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSkipAI = () => {
        setStep(1); // Skip AI and go directly to manual input
    };
    
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
            e.target.value = '';
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
                projectTitle: mainProjectLocationName,
                projectDescription: '',
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
    
    const handleSaveVideo = () => {
        if (!videoData.title.trim() || !videoData.concept.trim()) {
            setError("Title and Concept are required before creating the video.");
            setStep(1);
            return;
        }
        onSave({
            ...videoData,
            locations_featured: videoData.locations_featured.map(l => l.name),
            chosenTitle: videoData.title,
        });
        onClose();
    };

    const renderReviewAndRefineStep = () => (
        <div className="space-y-4">
             <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Video Title</label>
                <input
                    type="text"
                    value={videoData.title}
                    onChange={(e) => setVideoData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full form-input"
                    placeholder="e.g., 'Exploring the Hidden Caves of Gran Canaria'"
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
                ></textarea>
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
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Video Script (Optional)</label>
                <textarea
                    value={videoData.script}
                    onChange={(e) => setVideoData(prev => ({
                        ...prev,
                        script: e.target.value,
                        tasks: e.target.value.trim() !== '' ? { ...prev.tasks, scripting: 'complete' } : { ...prev.tasks, scripting: 'pending' }
                    }))}
                    rows="6"
                    className="w-full form-textarea"
                    placeholder="Paste the script here if you already have one."
                ></textarea>
            </div>
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

    const renderFinalReviewStep = () => (
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
        </div>
    );
    
    const renderContent = () => {
        switch (step) {
            case 0:
                return <window.WizardStep_AIParse onAnalyze={handleAnalyzeText} onSkip={handleSkipAI} isLoading={isLoading} />;
            case 1:
                return renderReviewAndRefineStep();
            case 2:
                return renderFinalReviewStep();
            default:
                return null;
        }
    };

    const handleNext = () => {
        setError('');
        if (step === 1 && (!videoData.title.trim() || !videoData.concept.trim())) {
            setError("Title and Concept are required before proceeding.");
            return;
        }
        setStep(prev => prev + 1);
    };

    const handlePrev = () => {
        setStep(prev => prev - 1);
        setError('');
    };

    const totalSteps = 2;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4 sm:p-6 md:p-8">
            <div className="glass-card rounded-lg p-6 sm:p-8 w-full max-w-2xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-6 text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                <h2 className="text-3xl font-bold text-white mb-6 text-center">Add New Video</h2>

                <div className="flex-grow overflow-y-auto pr-4 custom-scrollbar">
                    {renderContent()}
                </div>

                {error && <p className="text-red-400 mt-4 text-sm bg-red-900/50 p-3 rounded-lg">{error}</p>}

                <div className="flex-shrink-0 pt-6 mt-6 border-t border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <button onClick={onClose} className="w-full sm:w-auto px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold text-white">Cancel</button>
                    <div className="flex gap-4 w-full sm:w-auto">
                        {step > 0 && (
                            <button onClick={handlePrev} className="w-full sm:w-auto px-6 py-2 bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold text-white">Back</button>
                        )}
                        {step < totalSteps && step > 0 && (
                            <button onClick={handleNext} disabled={isLoading} className="w-full sm:w-auto px-6 py-2 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold text-white disabled:opacity-75">
                                {isLoading ? <window.LoadingSpinner isButton={true} /> : 'Next'}
                            </button>
                        )}
                        {step === totalSteps && (
                            <button onClick={handleSaveVideo} disabled={isLoading} className="w-full sm:w-auto px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold text-white disabled:opacity-75">
                                {isLoading ? <window.LoadingSpinner isButton={true} /> : 'Create Video'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
