// creators-hub/js/components/LocationSearchInput.js

const { useEffect, useRef } = React;

window.LocationSearchInput = ({ onLocationsChange, existingLocations, googleMapsLoaded }) => {
    const inputRef = useRef(null);
    const autoCompleteRef = useRef(null);

    useEffect(() => {
        // Ensure the Google Maps script and the new element are loaded.
        if (!googleMapsLoaded || !window.google || !window.google.maps.places || !customElements.get('gmp-place-autocomplete-element')) {
            return;
        }

        // --- NEW IMPLEMENTATION USING PlaceAutocompleteElement ---
        const gmpAutocompleteElement = document.createElement('gmp-place-autocomplete-element');
        
        // Find the first location that has valid coordinates to act as our anchor
        const anchorLocation = (existingLocations || []).find(loc => loc.lat && loc.lng);

        if (anchorLocation) {
            const location = new window.google.maps.LatLng(anchorLocation.lat, anchorLocation.lng);
            // Bias towards a 100km radius around the anchor location.
            const circularBounds = new window.google.maps.Circle({
                center: location,
                radius: 100000 
            }).getBounds();
            gmpAutocompleteElement.locationBias = circularBounds;
            gmpAutocompleteElement.strictBounds = true;
        }
        
        // The input element to be enhanced.
        const inputElement = inputRef.current;
        gmpAutocompleteElement.appendChild(inputElement);
        
        // Prepend the custom element to the component's root div so it controls the input.
        autoCompleteRef.current?.prepend(gmpAutocompleteElement);

        const placeChangedListener = (event) => {
            const place = event.target.place;
            
            if (place && place.gmp_place_id) { // The new element uses gmp_place_id
                const isDuplicate = (existingLocations || []).some(loc => loc.place_id === place.gmp_place_id);
                
                if (!isDuplicate) {
                    const newLocation = {
                        name: place.displayName,
                        place_id: place.gmp_place_id,
                        formatted_address: place.formattedAddress,
                        lat: place.location.lat,
                        lng: place.location.lng,
                        types: place.types
                    };
                    onLocationsChange([...(existingLocations || []), newLocation]);
                }
                
                if (inputRef.current) {
                    inputRef.current.value = "";
                }
            }
        };

        gmpAutocompleteElement.addEventListener('gmp-placechange', placeChangedListener);

        // Cleanup function to prevent memory leaks
        return () => {
            if (gmpAutocompleteElement) {
                 gmpAutocompleteElement.removeEventListener('gmp-placechange', placeChangedListener);
            }
             if (gmpAutocompleteElement && gmpAutocompleteElement.parentElement) {
                gmpAutocompleteElement.parentElement.removeChild(gmpAutocompleteElement);
            }
        };

    }, [onLocationsChange, existingLocations, googleMapsLoaded]);

    const handleRemoveLocation = (place_id_to_remove) => {
        const newLocations = existingLocations.filter(loc => loc.place_id !== place_id_to_remove);
        onLocationsChange(newLocations);
    };

    return (
        <div ref={autoCompleteRef}>
            <input
                ref={inputRef}
                type="text"
                placeholder="Search and add a location..."
                className="w-full form-input"
                disabled={!window.google}
            />
            <div className="flex flex-wrap gap-2 mt-3">
                {(existingLocations || []).map((loc) => (
                    <div key={loc.place_id || loc.name} className="bg-secondary-accent-darker-opacity text-secondary-accent-lighter-text text-sm px-3 py-1.5 rounded-full flex items-center gap-2">
                        <span>{loc.name}</span>
                        <button onClick={() => handleRemoveLocation(loc.place_id)} className="text-secondary-accent-lighter-text hover:text-white font-bold text-lg leading-none transform hover:scale-110 transition-transform">×</button>
                    </div>
                ))}
            </div>
        </div>
    );
};
