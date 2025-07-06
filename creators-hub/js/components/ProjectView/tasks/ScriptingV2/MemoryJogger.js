// creators-hub/js/components/ProjectView/tasks/ScriptingV2/MemoryJogger.js

const { useState, useEffect } = React;
const { LoadingSpinner, ImageComponent } = window;

window.MemoryJogger = ({ project, video }) => {
    const [locations, setLocations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const { handlers } = window.useAppState(); // Assuming handlers are on window.useAppState()

    useEffect(() => {
        const fetchLocationDetails = async () => {
            if (!video.locations_featured || video.locations_featured.length === 0) {
                setIsLoading(false);
                return;
            }

            try {
                const locationPromises = video.locations_featured.map(async (locationName) => {
                    const inventoryItem = Object.values(project.footageInventory || {}).find(item => item.name === locationName);
                    if (!inventoryItem || !inventoryItem.place_id) {
                        return { name: locationName, error: 'No place_id found.' };
                    }

                    // Assumes a handler exists to call the Netlify function for place details
                    // This is a common pattern in the app. We expect it to return photo references and a summary.
                    const details = await handlers.fetchPlaceDetails(inventoryItem.place_id);

                    return {
                        name: locationName,
                        // Using editorial_summary or a regular summary, providing a fallback.
                        summary: details.editorial_summary?.overview || details.summary || 'No summary available.',
                        // We'll just take the first 5 photos as a sample.
                        photos: details.photos ? details.photos.slice(0, 5) : []
                    };
                });

                const settledLocations = await Promise.all(locationPromises);
                setLocations(settledLocations);

            } catch (err) {
                console.error("Error fetching location details:", err);
                setError("Could not load location details. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchLocationDetails();
    }, [project, video]);

    if (isLoading) {
        return React.createElement('div', { className: 'flex flex-col items-center justify-center h-full text-center' },
            React.createElement(LoadingSpinner, null),
            React.createElement('p', { className: 'text-gray-400 mt-4' }, 'Gathering your memories...')
        );
    }

    if (error) {
        return React.createElement('div', { className: 'flex items-center justify-center h-full' },
            React.createElement('p', { className: 'text-red-400 text-center' }, error)
        );
    }
    
    if (locations.length === 0) {
        return React.createElement('div', { className: 'flex items-center justify-center h-full' },
            React.createElement('p', { className: 'text-gray-500 text-center' }, 'No featured locations found for this video to display memories.')
        );
    }

    return React.createElement('div', { className: 'space-y-8' },
        React.createElement('h3', { className: 'text-lg font-semibold text-amber-300 text-center' }, "Memory Joggers"),
        locations.map((location, index) => (
            React.createElement('div', { key: index, className: 'bg-gray-900/50 p-4 rounded-lg' },
                React.createElement('h4', { className: 'text-lg font-semibold text-primary-accent mb-3' }, location.name),
                location.error ? React.createElement('p', {className: 'text-gray-400'}, location.error) :
                React.createElement(React.Fragment, null,
                    React.createElement('p', { className: 'text-gray-400 text-sm mb-4' }, location.summary),
                    location.photos.length > 0 && React.createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2' },
                        location.photos.map(photo =>
                            // The ImageComponent likely handles constructing the full URL via a handler.
                            // We pass the photo reference to it.
                            React.createElement(ImageComponent, {
                                key: photo.photo_reference,
                                photoReference: photo.photo_reference,
                                altText: `Image of ${location.name}`,
                                className: 'w-full h-24 object-cover rounded-md'
                            })
                        )
                    )
                )
            )
        ))
    );
};
