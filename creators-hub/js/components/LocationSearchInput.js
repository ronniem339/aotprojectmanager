// In creators-hub/js/components/LocationSearchInput.js

const { useEffect, useRef } = React;

window.LocationSearchInput = ({ onLocationsChange, existingLocations }) => {
    const inputRef = useRef(null);

    useEffect(() => {
        // Ensure the Google Maps API is loaded and the input element is available
        if (window.google && window.google.maps.places && inputRef.current) {
            const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
                // You can customize the types of places to search for
                types: ['(cities)', 'administrative_area_level_1', 'country'],
            });
            
            // Set the fields to retrieve for each place
            autocomplete.setFields(['place_id', 'name', 'formatted_address']);

            // Add a listener for when the user selects a place from the dropdown
            const listener = autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace();
                
                // Ensure the place has a place_id
                if (place && place.place_id) {
                    // Check if the location is already in the list
                    const isDuplicate = (existingLocations || []).some(loc => loc.place_id === place.place_id);
                    
                    if (!isDuplicate) {
                        // Add the new location to the list
                        onLocationsChange([...(existingLocations || []), place]);
                    }
                    
                    // Clear the input field after a location is selected
                    if (inputRef.current) {
                        inputRef.current.value = "";
                    }
                }
            });

            // Clean up the listener when the component is unmounted
            return () => {
                if (window.google && window.google.maps.event) {
                    window.google.maps.event.clearInstanceListeners(autocomplete);
                }
            };
        }
    }, [existingLocations, onLocationsChange]); // Rerun the effect if these change

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
                    className="form-input w-full"
                />
            </div>
            <div className="space-y-2">
                {(existingLocations || []).map(loc => (
                    <div key={loc.place_id} className="flex items-center justify-between bg-gray-800 p-2 rounded-md">
                        <span className="font-semibold">{loc.name}</span>
                        <button 
                            onClick={() => handleRemoveLocation(loc.place_id)} 
                            className="text-red-500 hover:text-red-700 font-bold text-lg"
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
