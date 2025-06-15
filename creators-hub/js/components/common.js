// js/components/common.js

const { useState, useEffect, useRef, useCallback } = React;

window.useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
};

window.loadGoogleMapsScript = (apiKey, callback) => {
    if (window.google?.maps?.places) {
        if (callback) callback();
        return;
    }
    const existingScript = document.getElementById('googleMaps');
    if (existingScript) {
        // If script tag exists, but window.google is not ready, wait a bit.
        const checkGoogle = setInterval(() => {
            if (window.google?.maps?.places) {
                clearInterval(checkGoogle);
                if (callback) callback();
            }
        }, 100);
        return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.id = 'googleMaps';
    document.body.appendChild(script);
    script.onload = () => { if (callback) callback() };
    script.onerror = () => console.error("Google Maps script failed to load.");
};


window.LoadingSpinner = ({ text = "" }) => (<div className="flex flex-col justify-center items-center p-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-accent"></div>{text && <p className="mt-3 text-sm text-gray-400">{text}</p>}</div>);

window.ImageComponent = ({ src, alt, className }) => {
    const [imgSrc, setImgSrc] = useState(src);
    const placeholder = `https://placehold.co/600x400/1f2937/dc493a?text=${encodeURIComponent(alt)}`; // Updated placeholder color
    useEffect(() => { setImgSrc(src) }, [src]);
    return <img src={imgSrc || placeholder} alt={alt} className={className} onError={() => setImgSrc(placeholder)} />;
};

window.LoginScreen = ({ onLogin }) => (<div className="min-h-screen flex flex-col justify-center items-center bg-gray-900 text-white"><h1 className="text-5xl font-bold mb-4">Creator's Hub</h1><p className="text-xl text-gray-400 mb-8">Your AI-Powered Content Co-Pilot</p><button onClick={onLogin} className="px-8 py-3 bg-primary-accent hover:bg-primary-accent-darker rounded-lg text-lg font-semibold transition-all duration-300 transform hover:scale-105">Start Creating</button></div>);


window.DeleteConfirmationModal = ({ project, onConfirm, onCancel }) => {
    const [confirmText, setConfirmText] = useState('');
    const isConfirmationMatching = confirmText === 'YES';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
            <div className="glass-card rounded-lg p-8 w-full max-w-md text-center">
                <h3 className="text-2xl font-bold text-red-400 mb-4">Delete Project</h3>
                <p className="text-gray-300 mb-2">This action is irreversible and will permanently delete the project:</p>
                <p className="font-bold text-lg text-white mb-6">"{project.playlistTitle}"</p>
                <p className="text-gray-400 mb-4">To confirm, please type <strong className="text-red-300">YES</strong> in the box below.</p>
                
                <input 
                    type="text" 
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="w-full form-input text-center font-bold tracking-widest"
                    placeholder="Type YES to confirm"
                />

                <div className="flex justify-center gap-4 mt-6">
                    <button onClick={onCancel} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold">Cancel</button>
                    <button 
                        onClick={() => onConfirm(project.id)} 
                        disabled={!isConfirmationMatching}
                        className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold disabled:bg-red-900/50 disabled:cursor-not-allowed disabled:text-gray-400"
                    >
                        Confirm Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

// Reusable component for location searching
window.LocationSearchInput = ({ onLocationsChange, existingLocations }) => {
    const inputRef = useRef(null);
    const autocompleteRef = useRef(null);
    const geocoderRef = useRef(null);

    const determineDefaultImportance = (types) => {
        const majorTypes = ['locality', 'administrative_area_level_1', 'administrative_area_level_2', 'country'];
        if (types.some(type => majorTypes.includes(type))) {
            return 'major';
        }
        return 'quick';
    };

    useEffect(() => {
        if (!inputRef.current || !window.google?.maps?.places) return;
        
        if (!geocoderRef.current) {
            geocoderRef.current = new window.google.maps.Geocoder();
        }

        autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current);
        autocompleteRef.current.setFields(['place_id', 'name', 'geometry', 'types']);

        const placeChangedListener = () => {
            const place = autocompleteRef.current.getPlace();
            if (place && place.geometry && place.types) {
                const newLocation = {
                    name: place.name,
                    place_id: place.place_id,
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                    importance: determineDefaultImportance(place.types),
                    types: place.types
                };
                if (!existingLocations.some(loc => loc.place_id === newLocation.place_id)) {
                    onLocationsChange([...existingLocations, newLocation]);
                }
                if (inputRef.current) {
                    inputRef.current.value = '';
                }
            }
        };
        const placeChangedListenerHandle = autocompleteRef.current.addListener('place_changed', placeChangedListener);

        const handleKeyDown = (e) => {
            if (e.key === 'Enter' && !e.defaultPrevented) {
                e.preventDefault();
                const firstSuggestion = document.querySelector('.pac-container .pac-item');
                if (firstSuggestion) {
                    const mainText = firstSuggestion.querySelector('.pac-item-query')?.innerText || '';
                    const secondaryText = firstSuggestion.querySelector('span:not(.pac-item-query)')?.innerText || '';
                    const fullAddress = `${mainText} ${secondaryText}`.trim();
                    
                    if (fullAddress && geocoderRef.current) {
                        geocoderRef.current.geocode({ 'address': fullAddress }, (results, status) => {
                            if (status === 'OK' && results[0]) {
                                const place = results[0];
                                const newLocation = {
                                    name: mainText || place.formatted_address.split(',')[0],
                                    place_id: place.place_id,
                                    lat: place.geometry.location.lat(),
                                    lng: place.geometry.location.lng(),
                                    importance: determineDefaultImportance(place.types),
                                    types: place.types
                                };
                                 if (!existingLocations.some(loc => loc.place_id === newLocation.place_id)) {
                                    onLocationsChange([...existingLocations, newLocation]);
                                }
                                if (inputRef.current) {
                                    inputRef.current.value = '';
                                }
                            } else {
                                console.error('Geocode was not successful for the following reason: ' + status);
                            }
                        });
                    }
                }
            }
        };

        const inputElement = inputRef.current;
        inputElement.addEventListener('keydown', handleKeyDown);

        return () => {
            if (window.google?.maps?.event && placeChangedListenerHandle) {
                window.google.maps.event.removeListener(placeChangedListenerHandle);
            }
            if (inputElement) {
                inputElement.removeEventListener('keydown', handleKeyDown);
            }
            const pacContainers = document.querySelectorAll('.pac-container');
            pacContainers.forEach(container => container.remove());
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
            />
            <div className="flex flex-wrap gap-2 mt-3">
                {existingLocations.map((loc) => (
                    <div key={loc.place_id} className="bg-secondary-accent-darker-opacity text-secondary-accent-lighter-text text-sm px-3 py-1.5 rounded-full flex items-center gap-2">
                        <span>{loc.name}</span>
                        <button onClick={() => removeLocation(loc.place_id)} className="text-secondary-accent-lighter-text hover:text-white font-bold text-lg leading-none transform hover:scale-110 transition-transform">×</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

window.MockLocationSearchInput = () => {
    return <p className="text-sm text-amber-400 p-3 bg-amber-900/50 rounded-lg">Please enter a valid Google Maps API Key in the settings to enable location search.</p>;
};

// New components to be exposed globally

// TaskItem Component
const TaskItem = ({ title, status, isLocked, children, onRevisit }) => {
    const statusColors = {
        'complete': 'border-green-500 bg-green-900/20',
        'pending': 'border-blue-500 bg-blue-900/20',
        'locked': 'border-gray-700 bg-gray-800/50 opacity-60',
        'revisited': 'border-orange-500 bg-orange-900/20',
    };
    const statusTextColors = {
        'complete': 'text-green-400',
        'pending': 'text-blue-400',
        'locked': 'text-gray-400',
        'revisited': 'text-orange-400',
    };

    return (
        <div className={`glass-card p-6 rounded-lg border ${statusColors[status] || 'border-gray-700 bg-gray-800/50'}`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-white">{title}</h3>
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${statusTextColors[status] || 'text-gray-400'}`}>
                        {status === 'complete' && 'Complete'}
                        {status === 'pending' && 'Pending'}
                        {status === 'locked' && 'Locked'}
                        {status === 'revisited' && 'Revisited'}
                        {!status && 'Not Started'}
                    </span>
                    {status === 'complete' && onRevisit && (
                        <button onClick={onRevisit} className="text-xs text-secondary-accent hover:text-secondary-accent-light px-2 py-1 rounded">Revisit</button>
                    )}
                </div>
            </div>
            {isLocked ? (
                <div className="p-4 bg-gray-900/50 rounded-lg text-gray-400 text-center">
                    This task is locked until previous steps are completed.
                </div>
            ) : (
                children
            )}
        </div>
    );
};

// CopyButton Component
const CopyButton = ({ textToCopy }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-secondary-accent hover:text-secondary-accent-light transition-colors"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            {copied ? 'Copied!' : 'Copy'}
        </button>
    );
};

// EXPOSE NEW COMPONENTS GLOBALLY
window.TaskItem = TaskItem;
window.CopyButton = CopyButton;
