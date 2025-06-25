const { useEffect, useRef } = React;

window.LocationSearchInput = ({ onLocationsChange, existingLocations }) => {
    const inputRef = useRef(null);
    const autocompleteRef = useRef(null);

    useEffect(() => {
        if (!inputRef.current || !window.google?.maps?.places) return;

        const autocompleteOptions = {};
        const anchorLocation = (existingLocations || []).find(loc => loc.lat && loc.lng);

        if (anchorLocation) {
            const location = new window.google.maps.LatLng(anchorLocation.lat, anchorLocation.lng);
            autocompleteOptions.bounds = new window.google.maps.Circle({
                center: location,
                radius: 100000
            }).getBounds();
            autocompleteOptions.strictBounds = true;
        }

        autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, autocompleteOptions);
        autocompleteRef.current.setFields(['place_id', 'name', 'geometry', 'types']);

        const placeChangedListener = () => {
            const place = autocompleteRef.current.getPlace();

            if (place && place.geometry) {
                const newLocation = {
                    name: place.name,
                    place_id: place.place_id,
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                    types: place.types
                };

                if (!(existingLocations || []).some(loc => loc.place_id === newLocation.place_id)) {
                    onLocationsChange([...(existingLocations || []), newLocation]);
                }

                if (inputRef.current) {
                    inputRef.current.value = '';
                }
            }
        };

        const listenerHandle = autocompleteRef.current.addListener('place_changed', placeChangedListener);

        return () => {
            if (window.google?.maps?.event) {
                window.google.maps.event.removeListener(listenerHandle);
                const pacContainers = document.querySelectorAll('.pac-container');
                pacContainers.forEach(container => container.remove());
            }
        };

    }, [onLocationsChange, existingLocations]);

    const removeLocation = (place_id) => {
        onLocationsChange(existingLocations.filter(loc => loc.place_id !== place_id));
    };

    return (
        <div>
            <input
                ref={inputRef}
                type="text"
                placeholder="Search for and add locations..."
                className="w-full form-input"
                disabled={!window.google}
            />
            <div className="flex flex-wrap gap-2 mt-3">
                {(existingLocations || []).map((loc) => (
                    <div key={loc.place_id || loc.name} className="bg-secondary-accent-darker-opacity text-secondary-accent-lighter-text text-sm px-3 py-1.5 rounded-full flex items-center gap-2">
                        <span>{loc.name}</span>
                        <button onClick={() => removeLocation(loc.place_id)} className="text-secondary-accent-lighter-text hover:text-white font-bold text-lg leading-none transform hover:scale-110 transition-transform">×</button>
                    </div>
                ))}
            </div>
        </div>
    );
};
