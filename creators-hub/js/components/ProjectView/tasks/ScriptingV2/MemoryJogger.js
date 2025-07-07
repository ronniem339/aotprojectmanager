// creators-hub/js/components/ProjectView/tasks/ScriptingV2/MemoryJogger.js

const { useState, useEffect } = React;
const { LoadingSpinner, ImageComponent } = window;

window.MemoryJogger = ({ project, video, settings, fetchPlaceDetails, updateFootageInventoryItem }) => {
    const [locations, setLocations] = useState([]);
    const [isInitiallyLoading, setIsInitiallyLoading] = useState(true);

    useEffect(() => {
        if (!project || !video || !settings || !settings.geminiApiKey) {
            setIsInitiallyLoading(false);
            return;
        }

        const processLocation = async (location, isRetry = false) => {
            let placeId = null;
            let inventoryId = null;
            let inventoryItem = null;

            try {
                const inventoryEntry = Object.entries(project.footageInventory || {}).find(([id, item]) => item.name === location.name);
                if (inventoryEntry) {
                    inventoryId = inventoryEntry[0];
                    inventoryItem = inventoryEntry[1];
                    // On a retry, we must ignore the stale place_id
                    placeId = isRetry ? null : inventoryItem.place_id;
                }

                if (!placeId) {
                    updateLocationStatus(location.name, 'finding_place_id', isRetry ? 'Map reference was stale. Finding a new one...' : 'Searching for a map reference...');
                    const aiResponse = await window.aiUtils.findPlaceIdAI({ locationName: location.name, settings });
                    
                    if (!aiResponse || !aiResponse.place_id) {
                        throw new Error("AI could not determine a valid Place ID for this location.");
                    }
                    placeId = aiResponse.place_id;
                    
                    if (inventoryId && updateFootageInventoryItem) {
                        const updatedInventoryData = { ...inventoryItem, place_id: placeId };
                        await updateFootageInventoryItem(project.id, inventoryId, updatedInventoryData);
                    } else if (!inventoryId) {
                        throw new Error("Location exists in video but not in project footage inventory.");
                    }
                }
                
                if (placeId) {
                    updateLocationStatus(location.name, 'fetching_details', 'Found map reference, fetching details...');
                    if (!fetchPlaceDetails) throw new Error("fetchPlaceDetails handler is missing.");
                    
                    const response = await fetchPlaceDetails(placeId);

                    if (response && response.details) {
                        updateLocationStatus(location.name, 'complete', null, {
                            summary: response.details.editorial_summary?.overview || `Rating: ${response.details.rating || 'N/A'} ★. Website: ${response.details.website || 'Not available.'}`,
                            photos: response.details.photos ? response.details.photos.slice(0, 5) : []
                        });
                        return; // Success, end execution for this location
                    } else {
                        // THE FIX: Check for the specific stale ID error
                        if (response && response.status === 'NOT_FOUND' && !isRetry) {
                            console.warn(`Stale Place ID detected for ${location.name}. Retrying...`);
                            // This is our one-time retry.
                            await processLocation(location, true); 
                            return; 
                        }
                        const status = response?.status || 'UNKNOWN_ERROR';
                        let errorMessage = `Could not fetch details. Google Maps status: ${status}.`;
                        if (status === 'ZERO_RESULTS') errorMessage = 'This location could not be found on Google Maps.';
                        throw new Error(errorMessage);
                    }
                } else {
                    throw new Error("A Place ID could not be found for this location.");
                }
            } catch (err) {
                console.error(`Failed to process location ${location.name}:`, err);
                updateLocationStatus(location.name, 'error', err.message);
            }
        };

        const updateLocationStatus = (locationName, status, message = null, data = {}) => {
            setLocations(prev => prev.map(loc =>
                loc.name === locationName ? { ...loc, status: status, error: message, ...data } : loc
            ));
        };

        const run = async () => {
             if (!video.locations_featured || video.locations_featured.length === 0) {
                setIsInitiallyLoading(false);
                return;
            }
            const initialLocations = video.locations_featured.map(name => ({ name, status: 'pending', summary: '', photos: [], error: null }));
            setLocations(initialLocations);
            setIsInitiallyLoading(false);
            
            // Process all locations concurrently for speed
            await Promise.all(initialLocations.map(loc => processLocation(loc)));
        };

        run();
    
    }, [project?.id, video?.id, settings]);

    if (isInitiallyLoading) {
        return React.createElement('div', { className: 'flex flex-col items-center justify-center h-full text-center' },
            React.createElement(LoadingSpinner, null),
            React.createElement('p', { className: 'text-gray-400 mt-4' }, 'Initializing Memory Jogger...')
        );
    }
    
    if (!settings || !settings.geminiApiKey) {
        return React.createElement('p', { className: 'text-red-500 text-center' }, 'API Keys are not configured in settings.');
    }

    if(locations.length === 0) {
        return React.createElement('p', { className: 'text-gray-500 text-center' }, 'No locations featured in this video to jog your memory.');
    }

    return React.createElement('div', { className: 'space-y-4' },
        React.createElement('h3', { className: 'text-lg font-semibold text-amber-300 text-center' }, "Memory Joggers"),
        locations.map((location, index) => (
            React.createElement('div', { key: location.name || index, className: 'bg-gray-900/50 p-4 rounded-lg' },
                React.createElement('h4', { className: 'text-lg font-semibold text-primary-accent mb-3' }, location.name),
                
                (location.status !== 'complete' && location.status !== 'error') && 
                    React.createElement('div', { className: 'flex items-center space-x-2' },
                      React.createElement(LoadingSpinner, null),
                      React.createElement('p', { className: 'text-blue-400 text-sm' }, location.error || 'Processing...')
                    ),

                location.status === 'error' && React.createElement('p', { className: 'text-red-400 text-sm' }, `Error: ${location.error}`),

                location.status === 'complete' && React.createElement(React.Fragment, null,
                    React.createElement('p', { className: 'text-gray-400 text-sm mb-4' }, location.summary),
                    location.photos && location.photos.length > 0 ?
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
