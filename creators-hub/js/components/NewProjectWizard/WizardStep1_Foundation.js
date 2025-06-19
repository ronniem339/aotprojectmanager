// js/components/NewProjectWizard/WizardStep1_Foundation.js

window.WizardStep1_Foundation = ({
    inputs,
    locations,
    coverImageUrl,
    settings,
    googleMapsLoaded,
    onInputChange,
    onLocationsUpdate,
    onCoverImageUrlChange,
    onCoverImageFileChange // New prop for file handling
}) => {
    const { useState, useRef } = React;
    const [aiLocationSuggestions, setAiLocationSuggestions] = useState([]);
    const [isFindingPois, setIsFindingPois] = useState(false);
    const [poiError, setPoiError] = useState('');
    const [imagePreview, setImagePreview] = useState(null); // State for local image preview
    const fileInputRef = useRef(null);

    /**
     * Helper function to determine if a location
     * is a major city/country or a more specific, smaller point of interest.
     */
    const determineDefaultImportance = (types) => {
        const majorTypes = ['locality', 'administrative_area_level_1', 'administrative_area_level_2', 'country'];
        if (types.some(type => majorTypes.includes(type))) {
            return 'major';
        }
        return 'quick';
    };

    const handleFindPointsOfInterest = async () => {
        const mainLocation = locations[0];
        if (!mainLocation) {
            setPoiError("Please add a main project location first.");
            return;
        }
        setIsFindingPois(true);
        setPoiError('');
        try {
            const points = await window.aiUtils.findPointsOfInterestAI({
                mainLocationName: mainLocation.name,
                currentLocations: locations,
                settings: settings
            });
            
            const existingNames = locations.map(l => l.name.toLowerCase());
            const newSuggestions = points.filter(p => !existingNames.includes(p.name.toLowerCase()));
            setAiLocationSuggestions(newSuggestions);
        } catch (e) {
            setPoiError(`AI failed to find locations: ${e.message}`);
        } finally {
            setIsFindingPois(false);
        }
    };

    const handleSelectAiLocation = (suggestedLocation) => {
        if (!window.google?.maps?.Geocoder) {
            setPoiError("Google Maps service is not available.");
            return;
        }
        const geocoder = new window.google.maps.Geocoder();

        // FIX: Prioritize using lat/lng from the AI for a more reliable lookup.
        // Fall back to the address string if coordinates are not provided.
        const geocodeRequest = (suggestedLocation.lat && suggestedLocation.lng)
            ? { 'location': { lat: suggestedLocation.lat, lng: suggestedLocation.lng } }
            : { 'address': `${suggestedLocation.name}, ${locations[0].name}` };

        geocoder.geocode(geocodeRequest, (results, status) => {
            if (status === 'OK' && results[0]) {
                const place = results[0];
                const newLocation = {
                    name: suggestedLocation.name, // Use the AI's name for consistency
                    place_id: place.place_id,
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                    importance: determineDefaultImportance(place.types),
                    types: place.types
                };

                if (!locations.some(loc => loc.place_id === newLocation.place_id)) {
                    onLocationsUpdate([...locations, newLocation]);
                    setAiLocationSuggestions(prev => prev.filter(sug => sug.name !== suggestedLocation.name));
                } else {
                    // If it's a duplicate, just remove it from the suggestions list
                    setAiLocationSuggestions(prev => prev.filter(sug => sug.name !== suggestedLocation.name));
                }
            } else {
                setPoiError(`Could not find details for "${suggestedLocation.name}". Please add it manually.`);
            }
        });
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            onCoverImageFileChange(file); // Pass file to parent
            setImagePreview(URL.createObjectURL(file)); // Create local preview
            onCoverImageUrlChange(''); // Clear the URL input if a file is chosen
        }
    };
    
    const handleUrlChange = (e) => {
        onCoverImageUrlChange(e.target.value);
        if (e.target.value) {
            onCoverImageFileChange(null); // Clear file if URL is entered
            setImagePreview(null);
        }
    };


    return (
        <div className="max-h-[70vh] overflow-y-auto pr-4">
            <h2 className="text-2xl font-bold mb-4">New Project Wizard: Step 1 of 6</h2>
            <p className="text-gray-400 mb-6">Define the project's foundation. The first location you add will be the main subject.</p>
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Project Locations</label>
                    {googleMapsLoaded ? <window.LocationSearchInput onLocationsChange={onLocationsUpdate} existingLocations={locations} /> : <window.MockLocationSearchInput />}
                </div>

                {locations.length > 0 && (
                    <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Find Points of Interest</label>
                        <p className="text-xs text-gray-400 mb-3">Use AI to discover popular attractions within <span className="font-bold text-primary-accent">{locations[0].name}</span>.</p>
                        <button onClick={handleFindPointsOfInterest} disabled={isFindingPois} className="w-full px-5 py-2.5 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:opacity-75 flex items-center justify-center gap-2">
                            {isFindingPois ? <window.LoadingSpinner isButton={true} /> : `📍 Find Attractions in ${locations[0].name}`}
                        </button>
                        {poiError && <p className="text-red-400 mt-2 text-sm">{poiError}</p>}
                        {aiLocationSuggestions.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-700/50">
                                <h4 className="text-sm font-semibold text-gray-300 mb-2">AI Suggestions:</h4>
                                <div className="flex flex-wrap gap-2">
                                    {aiLocationSuggestions.map(suggestion => (
                                        <button
                                            key={suggestion.name}
                                            onClick={() => handleSelectAiLocation(suggestion)}
                                            title={suggestion.description}
                                            className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded-full font-medium"
                                        >
                                            + {suggestion.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Key Message or Theme</label>
                    <textarea name="theme" value={inputs.theme} onChange={(e) => onInputChange('theme', e.target.value)} placeholder="e.g., 'Exploring ancient castles and misty lochs'" rows="3" className="w-full form-textarea"></textarea>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Cover Image (Optional)</label>
                    <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-4">
                        <input type="url" value={coverImageUrl} onChange={handleUrlChange} className="w-full form-input" placeholder="Paste image URL here (e.g., from Unsplash)" />
                        
                        <div className="flex items-center justify-center text-gray-400">
                            <span className="flex-grow border-t border-gray-700"></span>
                            <span className="px-4">OR</span>
                            <span className="flex-grow border-t border-gray-700"></span>
                        </div>

                        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" ref={fileInputRef} />
                        <button onClick={() => fileInputRef.current.click()} className="w-full px-4 py-2 text-sm bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold">
                            Upload Image
                        </button>
                        
                        {(imagePreview || coverImageUrl) && (
                            <div className="mt-2 text-center">
                                <window.ImageComponent src={imagePreview || coverImageUrl} alt="Project Cover Preview" className="max-w-full h-auto rounded-lg mx-auto" style={{ maxHeight: '150px', objectFit: 'cover' }} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
