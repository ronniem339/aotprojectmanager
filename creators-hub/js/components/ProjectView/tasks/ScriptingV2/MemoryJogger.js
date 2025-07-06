// creators-hub/js/components/ProjectView/tasks/ScriptingV2/MemoryJogger.js

const { useState, useEffect } = React;
const { LoadingSpinner, ImageComponent } = window;

window.MemoryJogger = ({ project, video }) => {
    // State to hold location data and their fetching status
    const [locations, setLocations] = useState([]);
    const [isInitiallyLoading, setIsInitiallyLoading] = useState(true);
    const { handlers, settings } = window.useAppState();

    useEffect(() => {
        const processLocations = async () => {
            if (!video.locations_featured || video.locations_featured.length === 0) {
                setIsInitiallyLoading(false);
                return;
            }

            // Initialize locations with their names and a loading status
            let initialLocations = video.locations_featured.map(name => ({
                name: name,
                status: 'loading',
                summary: '',
                photos: [],
                error: null
            }));
            setLocations(initialLocations);
            setIsInitiallyLoading(false);

            // Process each location one by one
            for (let i = 0; i < initialLocations.length; i++) {
                let location = initialLocations[i];
                let placeId = null;
                let inventoryId = null;
                let inventoryItem = null;

                // Step 1: Find inventory item and check for place_id
                const inventoryEntry = Object.entries(project.footageInventory || {}).find(([id, item]) => item.name === location.name);
                
                if (inventoryEntry) {
                    inventoryId = inventoryEntry[0];
                    inventoryItem = inventoryEntry[1];
                    placeId = inventoryItem.place_id;
                }

                // Step 2: If place_id is missing, use AI to find it
                if (!placeId) {
                    updateLocationStatus(location.name, 'finding_place_id', 'Searching for a map reference...');
                    try {
                        const aiResponse = await window.aiUtils.findPlaceIdAI({ locationName: location.name, settings });
                        placeId = aiResponse.place_id;
                        
                        // If we found a place ID, save it back to Firestore for next time
                        if (placeId && inventoryId) {
                            const updatedInventoryData = { ...inventoryItem, place_id: placeId };
                            await handlers.updateFootageInventoryItem(project.id, inventoryId, updatedInventoryData);
                        } else if (!inventoryId) {
                            // This case is unlikely but good to handle: location in video but not inventory
                            throw new Error("Location exists in video but not in project footage inventory.");
                        }

                    } catch (err) {
                        updateLocationStatus(location.name, 'error', `Could not find a Place ID. ${err.message}`);
                        continue; // Skip to the next location
                    }
                }
                
                // Step 3: Fetch details from Google Places API using the place_id
                if (placeId) {
                    updateLocationStatus(location.name, 'fetching_details', 'Found map reference, fetching details...');
                    try {
                        const details = await handlers.fetchPlaceDetails(placeId);
                        if (!details) throw new Error("Place Details response was empty.");

                        setLocations(prev => prev.map(loc =>
                            loc.name === location.name ? {
                                ...loc,
                                status: 'complete',
                                summary: details.editorial_summary?.overview || details.summary || 'No summary available.',
                                photos: details.photos ? details.photos.slice(0, 5) : []
                            } : loc
                        ));

                    } catch (err) {
                        updateLocationStatus(location.name, 'error', `Could not fetch details. ${err.message}`);
                        // Here we will add the AI fallback search in the next step.
                        continue;
                    }
                }
            }
        };

        const updateLocationStatus = (locationName, status, message = null) => {
            setLocations(prev => prev.map(loc =>
                loc.name === locationName ? { ...loc, status: status, error: message } : loc
            ));
        };

        processLocations();
    }, [project, video, settings, handlers]);

    if (isInitiallyLoading) {
        return React.createElement('div', { className: 'flex flex-col items-center justify-center h-full text-center' },
            React.createElement(LoadingSpinner, null),
            React.createElement('p', { className: 'text-gray-400 mt-4' }, 'Initializing Memory Jogger...')
        );
    }
    
    return React.createElement('div', { className: 'space-y-4' },
        React.createElement('h3', { className: 'text-lg font-semibold text-amber-300 text-center' }, "Memory Joggers"),
        locations.map((location, index) => (
            React.createElement('div', { key: index, className: 'bg-gray-900/50 p-4 rounded-lg' },
                React.createElement('h4', { className: 'text-lg font-semibold text-primary-accent mb-3' }, location.name),
                
                // Render based on status
                location.status === 'loading' && React.createElement(LoadingSpinner, null),
                location.status === 'finding_place_id' && React.createElement('p', { className: 'text-blue-400 text-sm' }, location.error),
                location.status === 'fetching_details' && React.createElement('p', { className: 'text-blue-400 text-sm' }, location.error),
                location.status === 'error' && React.createElement('p', { className: 'text-red-400 text-sm' }, location.error),

                location.status === 'complete' && React.createElement(React.Fragment, null,
                    React.createElement('p', { className: 'text-gray-400 text-sm mb-4' }, location.summary),
                    location.photos.length > 0 ?
                        React.createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2' },
                            location.photos.map(photo =>
                                React.createElement(ImageComponent, {
                                    key: photo.photo_reference,
                                    photoReference: photo.photo_reference,
                                    altText: `Image of ${location.name}`,
                                    className: 'w-full h-24 object-cover rounded-md'
                                })
                            )
                        ) : React.createElement('p', {className: 'text-gray-500 text-sm'}, 'No photos were found for this location.')
                )
            )
        ))
    );
};
