// creators-hub/js/components/ProjectView/tasks/ScriptingV2/MemoryJogger.js

const { useState, useEffect } = React;
const { LoadingSpinner, ImageComponent } = window;

window.MemoryJogger = ({ project, video, settings, handlers }) => { // MODIFICATION: Accept handlers as a prop
    const [locations, setLocations] = useState([]);
    const [isInitiallyLoading, setIsInitiallyLoading] = useState(true);
    // MODIFICATION: No longer calls useAppState() at all.

    useEffect(() => {
        const processLocationsSequentially = async () => {
            if (!video.locations_featured || video.locations_featured.length === 0) {
                setIsInitiallyLoading(false);
                return;
            }

            const initialLocations = video.locations_featured.map(name => ({
                name: name,
                status: 'pending',
                summary: '',
                photos: [],
                error: null
            }));
            setLocations(initialLocations);
            setIsInitiallyLoading(false);

            for (const location of initialLocations) {
                let placeId = null;
                let inventoryId = null;
                let inventoryItem = null;

                try {
                    const inventoryEntry = Object.entries(project.footageInventory || {}).find(([id, item]) => item.name === location.name);
                    if (inventoryEntry) {
                        inventoryId = inventoryEntry[0];
                        inventoryItem = inventoryEntry[1];
                        placeId = inventoryItem.place_id;
                    }

                    if (!placeId) {
                        updateLocationStatus(location.name, 'finding_place_id', 'Searching for a map reference...');
                        const aiResponse = await window.aiUtils.findPlaceIdAI({ locationName: location.name, settings });
                        placeId = aiResponse.place_id;
                        
                        if (placeId && inventoryId) {
                            const updatedInventoryData = { ...inventoryItem, place_id: placeId };
                            await handlers.updateFootageInventoryItem(project.id, inventoryId, updatedInventoryData);
                        } else if (!inventoryId) {
                            throw new Error("Location exists in video but not in project footage inventory.");
                        }
                    }
                    
                    if (placeId) {
                        updateLocationStatus(location.name, 'fetching_details', 'Found map reference, fetching details...');
                        const details = await handlers.fetchPlaceDetails(placeId);
                        
                        if (details) {
                             updateLocationStatus(location.name, 'complete', null, {
                                summary: details.editorial_summary?.overview || details.summary || 'No summary available.',
                                photos: details.photos ? details.photos.slice(0, 5) : []
                            });
                        } else {
                            throw new Error("Could not fetch details from Google Places. The API key may be invalid or the service may be unavailable.");
                        }
                    } else {
                         throw new Error("A Place ID could not be found for this location.");
                    }
                } catch (err) {
                    updateLocationStatus(location.name, 'error', err.message);
                    continue;
                }
            }
        };

        const updateLocationStatus = (locationName, status, message = null, data = {}) => {
            setLocations(prev => prev.map(loc =>
                loc.name === locationName ? { ...loc, status: status, error: message, ...data } : loc
            ));
        };

        if (settings && settings.geminiApiKey) {
            processLocationsSequentially();
        } else {
            setIsInitiallyLoading(false);
            setLocations([]);
        }
    
    }, [project.id, video.id, settings]);

    if (isInitiallyLoading) {
        return React.createElement('div', { className: 'flex flex-col items-center justify-center h-full text-center' },
            React.createElement(LoadingSpinner, null),
            React.createElement('p', { className: 'text-gray-400 mt-4' }, 'Waiting for settings...')
        );
    }
    
    if (!settings || !settings.geminiApiKey) {
        return React.createElement('p', { className: 'text-red-500 text-center' }, 'API Keys are not configured in settings.');
    }

    return React.createElement('div', { className: 'space-y-4' },
        React.createElement('h3', { className: 'text-lg font-semibold text-amber-300 text-center' }, "Memory Joggers"),
        locations.map((location, index) => (
            React.createElement('div', { key: index, className: 'bg-gray-900/50 p-4 rounded-lg' },
                React.createElement('h4', { className: 'text-lg font-semibold text-primary-accent mb-3' }, location.name),
                
                (location.status === 'pending' || location.status === 'loading') && React.createElement(LoadingSpinner, null),
                location.status === 'finding_place_id' && React.createElement('p', { className: 'text-blue-400 text-sm' }, location.error),
                location.status === 'fetching_details' && React.createElement('p', { className: 'text-blue-400 text-sm' }, location.error),
                location.status === 'error' && React.createElement('p', { className: 'text-red-400 text-sm' }, `Error: ${location.error}`),

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
                        ) : React.createElement('p', {className: 'text-gray-500 text-sm'}, 'No photos were found for this location via Google Places.')
                )
            )
        ))
    );
};
