// creators-hub/js/components/LocationSearchInput.js

const { useEffect, useRef } = React;

window.LocationSearchInput = ({ onLocationsChange, existingLocations }) => {
    const inputRef = useRef(null);

    useEffect(() => {
        if (!window.google || !window.google.maps.places || !inputRef.current) {
            return;
        }

        // --- NEW: Location Biasing Logic ---
        const autocompleteOptions = {};

        // If there's an existing location, use it to bias the search.
        if (existingLocations && existingLocations.length > 0) {
            const mainLocation = existingLocations[0]; // Use the first location as the anchor
            if (mainLocation.lat && mainLocation.lng) {
                const location = new window.google.maps.LatLng(mainLocation.lat, mainLocation.lng);
                // Bias towards a 100km radius around the main location.
                autocompleteOptions.bounds = new window.google.maps.Circle({
                    center: location,
                    radius: 100000 
                }).getBounds();
                autocompleteOptions.strictBounds = true; // Restrict search to this area for better relevance.
            }
        }
        // --- End of New Logic ---

        // MODIFIED: Pass the new options to the Autocomplete constructor
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, autocompleteOptions);
        
        autocomplete.setFields(['place_id', 'name', 'formatted_address', 'geometry', 'types']);

        const listener = autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            
            if (place && place.place_id) {
                const isDuplicate = (existingLocations || []).some(loc => loc.place_id === place.place_id);
                
                if (!isDuplicate) {
                    // Also include lat/lng in the location object
                    const newLocation = {
                        name: place.name,
                        place_id: place.place_id,
                        formatted_address: place.formatted_address,
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng(),
                        types: place.types
                    };
                    onLocationsChange([...(existingLocations || []), newLocation]);
                }
                
                if (inputRef.current) {
                    inputRef.current.value = "";
                }
            }
        });

        return () => {
            if (window.google && window.google.maps.event) {
                // Important to remove the old listeners to prevent memory leaks
                window.google.maps.event.clearInstanceListeners(autocomplete);
                // Also remove pac-container from the body
                const pacContainers = document.querySelectorAll('.pac-container');
                pacContainers.forEach(container => container.remove());
            }
        };
    }, [existingLocations, onLocationsChange]); // Rerun effect if existingLocations changes

    const handleRemoveLocation = (place_id_to_remove) => {
        const newLocations = existingLocations.filter(loc => loc.place_id !== place_id_to_remove);
        onLocationsChange(newLocations);
    };

    return (
        <div>
            <div className="mb-2">
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search and add a location..."
                    className="w-full form-input"
                    disabled={!window.google}
                />
            </div>
            <div className="space-y-2">
                {(existingLocations || []).map(loc => (
                    <div key={loc.place_id || loc.name} className="flex items-center justify-between bg-gray-800/70 p-2 rounded-md">
                        <span className="font-semibold text-gray-200">{loc.name}</span>
                        <button 
                            onClick={() => handleRemoveLocation(loc.place_id)} 
                            className="text-gray-400 hover:text-red-500 font-bold text-xl leading-none px-2"
                            title={`Remove ${loc.name}`}
                        >
                            &times;
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
