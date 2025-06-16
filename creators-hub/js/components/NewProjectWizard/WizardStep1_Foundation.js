// js/components/NewProjectWizard/WizardStep1_Foundation.js

window.WizardStep1_Foundation = ({
    inputs,
    locations,
    coverImageUrl,
    settings,
    googleMapsLoaded,
    onInputChange,
    onLocationsUpdate,
    onCoverImageUrlChange
}) => {
    const { useState } = React;
    const [aiLocationSuggestions, setAiLocationSuggestions] = useState([]);
    const [isFindingPois, setIsFindingPois] = useState(false);
    const [poiError, setPoiError] = useState('');

    /**
     * **FIX**: Re-added the helper function to determine if a location
     * is a major city/country or a more specific, smaller point of interest.
     */
    const determineDefaultImportance = (types) => {
        const majorTypes = ['locality', 'administrative_area_level_1', 'administrative_area_level_2', 'country'];
        // If the location's types include any of the major types, it's a 'major' feature.
        if (types.some(type => majorTypes.includes(type))) {
            return 'major';
        }
        // Otherwise, it's a smaller point of interest and should default to 'quick'.
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
            const points = await window.aiUtils.findPointsOfInterestAI(mainLocation.name, settings.geminiApiKey);
            const existingNames = locations.map(l => l.name.toLowerCase());
            const newSuggestions = points.filter(p => !existingNames.includes(p.toLowerCase()));
            setAiLocationSuggestions(newSuggestions);
        } catch (e) {
            setPoiError(`AI failed to find locations: ${e.message}`);
        } finally {
            setIsFindingPois(false);
        }
    };

    const handleSelectAiLocation = (locationName) => {
        if (!window.google?.maps?.Geocoder) {
            setPoiError("Google Maps service is not available.");
            return;
        }
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ 'address': `${locationName}, ${locations[0].name}` }, (results, status) => {
            if (status === 'OK' && results[0]) {
                const place = results[0];
                const newLocation = {
                    name: locationName,
                    place_id: place.place_id,
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                    // **FIX**: Use the helper function to set the correct default importance.
                    importance: determineDefaultImportance(place.types),
                    types: place.types
                };
                if (!locations.some(loc => loc.place_id === newLocation.place_id)) {
                    onLocationsUpdate([...locations, newLocation]);
                    setAiLocationSuggestions(prev => prev.filter(name => name !== locationName));
                }
            } else {
                setPoiError(`Could not find details for "${locationName}". Please add it manually.`);
            }
        });
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
                                    {aiLocationSuggestions.map(name => (
                                        <button
                                            key={name}
                                            onClick={() => handleSelectAiLocation(name)}
                                            className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded-full font-medium"
                                        >
                                            + {name}
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
                    <label className="block text-sm font-medium text-gray-300 mb-1">Cover Image URL (Optional)</label>
                    <input type="url" value={coverImageUrl} onChange={(e) => onCoverImageUrlChange(e.target.value)} className="w-full form-input" placeholder="Paste image URL here (e.g., from Unsplash)" />
                </div>
            </div>
        </div>
    );
};
