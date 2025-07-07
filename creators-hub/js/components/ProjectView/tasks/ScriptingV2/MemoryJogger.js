// creators-hub/js/components/ProjectView/tasks/ScriptingV2/MemoryJogger.js

const { useState, useEffect } = React;
const { LoadingSpinner, ImageComponent } = window;

window.MemoryJogger = ({ project, video, settings, fetchPlaceDetails, updateFootageInventoryItem }) => {
    const [locations, setLocations] = useState([]);
    const [isInitiallyLoading, setIsInitiallyLoading] = useState(true);

    // Consolidated status update function for clarity
    const updateLocationStatus = (locationName, status, message = null, data = {}) => {
        setLocations(prev => prev.map(loc =>
            loc.name === locationName ? { ...loc, status: status, message: message, ...data } : loc
        ));
    };

    // Refactored processing logic for a single location
    const processLocation = async (location, isRetry = false) => {
        let inventoryItem = null;
        let inventoryId = null;

        const inventoryEntry = Object.entries(project.footageInventory || {}).find(([id, item]) => item.name === location.name);
        if (inventoryEntry) {
            inventoryId = inventoryEntry[0];
            inventoryItem = inventoryEntry[1];
        } else {
            updateLocationStatus(location.name, 'error', 'Location is not in the project footage inventory.');
            return;
        }

        let placeId = isRetry ? null : inventoryItem.place_id;

        try {
            // Step 1: Ensure we have a Place ID. If not, use AI to find one.
            if (!placeId) {
                const statusMessage = isRetry ? 'Map reference was stale. Finding a new one...' : 'Searching for a map reference...';
                updateLocationStatus(location.name, 'finding_place_id', statusMessage);

                const aiResponse = await window.aiUtils.findPlaceIdAI({ locationName: location.name, settings });
                if (!aiResponse || !aiResponse.place_id) {
                    throw new Error("AI could not determine a valid Place ID for this location.");
                }
                placeId = aiResponse.place_id;

                // Save the new ID back to Firebase for persistence.
                const updatedInventoryData = { ...inventoryItem, place_id: placeId };
                await updateFootageInventoryItem(project.id, inventoryId, updatedInventoryData);
            }

            // Step 2: Fetch details for the valid Place ID.
            updateLocationStatus(location.name, 'fetching_details', 'Found map reference, fetching details...');
            const response = await fetchPlaceDetails(placeId);

            // Step 3: Process the response from the Google Maps API.
            if (response && response.status === 'OK' && response.details) {
                // SUCCESS: The Place ID was valid and we got details.
                updateLocationStatus(location.name, 'complete', null, {
                    summary: response.details.editorial_summary?.overview || `Rating: ${response.details.rating || 'N/A'} ★`,
                    website: response.details.website,
                    photos: response.details.photos || []
                });
            } else if (response && response.status === 'NOT_FOUND' && !isRetry) {
                // STALE ID: The ID was invalid. Trigger a single retry.
                console.warn(`Stale Place ID detected for ${location.name}. Retrying...`);
                await processLocation(location, true); // Recursive call for the retry attempt.
            } else {
                // OTHER FAILURE: The API returned another error, or the retry failed.
                const status = response?.status || 'UNKNOWN_ERROR';
                throw new Error(`Could not fetch details. Google Maps status: ${status}.`);
            }
        } catch (err) {
            console.error(`Failed to process location ${location.name}:`, err);
            updateLocationStatus(location.name, 'error', err.message);
        }
    };

    useEffect(() => {
        // Guard against running without necessary props
        if (!project || !video || !settings || !settings.geminiApiKey || !fetchPlaceDetails || !updateFootageInventoryItem) {
            setIsInitiallyLoading(false);
            return;
        }

        const run = async () => {
            if (!video.locations_featured || video.locations_featured.length === 0) {
                setIsInitiallyLoading(false);
                return;
            }
            // Initialize the locations state based on the video data.
            const initialLocations = video.locations_featured.map(name => ({
                name,
                status: 'pending',
                message: null,
                summary: '',
                website: '',
                photos: []
            }));
            setLocations(initialLocations);
            setIsInitiallyLoading(false);

            // Process all locations concurrently.
            await Promise.all(initialLocations.map(loc => processLocation(loc)));
        };

        run();

    }, [project?.id, video?.id]); // Rerun if the project or video context changes.

    if (isInitiallyLoading) {
        return React.createElement('div', { className: 'flex flex-col items-center justify-center h-full text-center' },
            React.createElement(LoadingSpinner, null),
            React.createElement('p', { className: 'text-gray-400 mt-4' }, 'Initializing Memory Jogger...')
        );
    }

    if (!settings || !settings.geminiApiKey || !settings.googleMapsApiKey) {
        return React.createElement('p', { className: 'text-red-500 text-center' }, 'API Keys for Gemini or Google Maps are not configured in settings.');
    }

    if (locations.length === 0) {
        return React.createElement('p', { className: 'text-gray-500 text-center' }, 'No locations featured in this video to jog your memory.');
    }

    // Render the UI for each location based on its current status.
    return React.createElement('div', { className: 'space-y-4' },
        React.createElement('h3', { className: 'text-lg font-semibold text-amber-300 text-center' }, "Memory Joggers"),
        locations.map((location, index) => (
            React.createElement('div', { key: location.name || index, className: 'bg-gray-900/50 p-4 rounded-lg' },
                React.createElement('h4', { className: 'text-lg font-semibold text-primary-accent mb-3' }, location.name),

                (location.status !== 'complete' && location.status !== 'error') &&
                    React.createElement('div', { className: 'flex items-center space-x-2' },
                        React.createElement(LoadingSpinner, null),
                        React.createElement('p', { className: 'text-blue-400 text-sm' }, location.message || 'Processing...')
                    ),

                location.status === 'error' && React.createElement('p', { className: 'text-red-400 text-sm' }, `Error: ${location.message}`),

                location.status === 'complete' && React.createElement(React.Fragment, null,
                    React.createElement('p', { className: 'text-gray-400 text-sm mb-2' }, location.summary),
                    location.website && React.createElement('a', { href: location.website, target: '_blank', rel: 'noopener noreferrer', className: 'text-blue-400 hover:underline text-sm' }, 'Visit Website'),
                    location.photos && location.photos.length > 0 ?
                        React.createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 mt-4' },
                            location.photos.slice(0, 5).map(photo => // Limit to 5 photos for a clean UI
                                React.createElement(ImageComponent, {
                                    key: photo.name,
                                    photoReference: photo.name,
                                    alt: `Image of ${location.name}`,
                                    className: 'w-full h-24 object-cover rounded-md'
                                })
                            )
                        ) : React.createElement('p', { className: 'text-gray-500 text-sm mt-2' }, 'No photos were found for this location via Google Places.')
                )
            )
        ))
    );
};
