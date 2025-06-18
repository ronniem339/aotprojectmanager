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
    script.async = true; // Add this line
    script.defer = true; // Also good practice to add defer
    document.body.appendChild(script);
    script.onload = () => { if (callback) callback() };
    script.onerror = () => console.error("Google Maps script failed to load.");
};


window.LoadingSpinner = ({ text = "", isButton = false }) => {
    // Made the dots larger and with more space for better prominence
    const spinner = (
        <div className="flex items-center justify-center space-x-2">
            <div className="h-3 w-3 bg-primary-accent rounded-full animate-pulse" style={{ animationDuration: '1.2s' }}></div>
            <div className="h-3 w-3 bg-primary-accent rounded-full animate-pulse" style={{ animationDelay: '0.2s', animationDuration: '1.2s' }}></div>
            <div className="h-3 w-3 bg-primary-accent rounded-full animate-pulse" style={{ animationDelay: '0.4s', animationDuration: '1.2s' }}></div>
        </div>
    );

    // If used inside a button, we only want the spinner dots.
    if (isButton) {
        return spinner;
    }

    // This is for a standalone loader, taking up its own space.
    // It has no background itself, just padding for the text.
    return (
        <div className="flex flex-col justify-center items-center py-4">
            {spinner}
            {text && <p className="mt-4 text-sm text-gray-400">{text}</p>}
        </div>
    );
};

window.ImageComponent = ({ src, alt, className }) => {
    const [imgSrc, setImgSrc] = useState(src);
    const placeholder = `https://placehold.co/600x400/1f2937/00bfff?text=${encodeURIComponent(alt)}`; // Updated placeholder color to new primary accent
    useEffect(() => { setImgSrc(src) }, [src]);
    return <img src={imgSrc || placeholder} alt={alt} className={className} onError={() => setImgSrc(placeholder)} />;
};


// Updated LoginScreen component for email/password authentication
window.LoginScreen = ({ onLogin }) => {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            if (isRegister) {
                // Register new user with email and password
                await auth.createUserWithEmailAndPassword(email, password);
            } else {
                // Sign in existing user with email and password
                await auth.signInWithEmailAndPassword(email, password);
            }
            // onLogin is likely just setting a state to hide this screen,
            // Firebase's onAuthStateChanged will handle actual user state
            onLogin();
        } catch (err) {
            console.error("Authentication error:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col justify-center items-center bg-gray-900 text-white p-4">
            <h1 className="text-5xl font-bold mb-4">Creator's Hub</h1>
            <p className="text-xl text-gray-400 mb-8">Your AI-Powered Content Co-Pilot</p>

            <div className="glass-card p-8 rounded-lg w-full max-w-md">
                <h2 className="text-3xl font-bold text-center mb-6">
                    {isRegister ? 'Register' : 'Login'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            className="form-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && (
                        <div className="bg-red-900/50 text-red-400 p-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full px-8 py-3 bg-primary-accent hover:bg-primary-accent-darker rounded-lg text-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <window.LoadingSpinner isButton={true} /> : (isRegister ? 'Register Account' : 'Login')}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsRegister(!isRegister)}
                        className="text-secondary-accent hover:text-secondary-accent-light text-sm"
                    >
                        {isRegister ? 'Already have an account? Login' : 'Need an account? Register here'}
                    </button>
                </div>
            </div>
        </div>
    );
};


window.DeleteConfirmationModal = ({ project, onConfirm, onCancel }) => {
    const [confirmText, setConfirmText] = useState('');
    const isConfirmationMatching = confirmText === 'YES';

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[60] p-4"
            onMouseDown={e => e.stopPropagation()} // Stop mousedown event from bubbling up to document
        >
            <div className="glass-card rounded-lg p-8 w-full max-w-md text-center">
                <h3 className="text-2xl font-bold text-red-400 mb-4">Delete {project.playlistTitle === 'this draft' ? 'Draft' : 'Project'}</h3>
                <p className="text-gray-300 mb-2">This action is irreversible and will permanently delete the {project.playlistTitle === 'this draft' ? 'draft' : 'project'}:</p>
                <p className="font-bold text-lg text-white mb-6">"{project.playlistTitle === 'this draft' ? 'this draft' : project.playlistTitle}"</p>
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

    useEffect(() => {
        if (!inputRef.current || !window.google?.maps?.places) return;

        // --- MODIFIED: Location Biasing Logic ---
        const autocompleteOptions = {
            // Expanded types for better matching of tourist locations
            types: ['(regions)', 'locality', 'tourist_attraction', 'point_of_interest', 'establishment'],
        };

        // Find the first location that has valid coordinates to act as our anchor
        const anchorLocation = (existingLocations || []).find(loc => loc.lat && loc.lng);

        if (anchorLocation) {
            const location = new window.google.maps.LatLng(anchorLocation.lat, anchorLocation.lng);
            // Bias towards a 100km radius around the anchor location.
            autocompleteOptions.bounds = new window.google.maps.Circle({
                center: location,
                radius: 100000
            }).getBounds();
            autocompleteOptions.strictBounds = false; // Prefer, but don't restrict to, this area.
        }
        // --- End of Modified Logic ---

        // Initialize the Autocomplete service with our options
        autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, autocompleteOptions);
        autocompleteRef.current.setFields(['place_id', 'name', 'geometry', 'types']);

        const placeChangedListener = () => {
            const place = autocompleteRef.current.getPlace();

            if (place && place.geometry) { // Check for geometry to ensure we have lat/lng
                const newLocation = {
                    name: place.name,
                    place_id: place.place_id,
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                    types: place.types
                };

                // Check for duplicates before adding
                if (!(existingLocations || []).some(loc => loc.place_id === newLocation.place_id)) {
                    onLocationsChange([...(existingLocations || []), newLocation]);
                }

                if (inputRef.current) {
                    inputRef.current.value = '';
                }
            }
        };

        const listenerHandle = autocompleteRef.current.addListener('place_changed', placeChangedListener);

        // Cleanup function to prevent memory leaks
        return () => {
            if (window.google?.maps?.event) {
                window.google.maps.event.removeListener(listenerHandle);
                // The pac-container is the dropdown. We need to remove it to prevent duplicates on re-render.
                const pacContainers = document.querySelectorAll('.pac-container');
                pacContainers.forEach(container => container.remove());
            }
        };

    }, [onLocationsChange, existingLocations]); // Rerun this effect if the locations change

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

window.MockLocationSearchInput = () => {
    return <p className="text-sm text-amber-400 p-3 bg-amber-900/50 rounded-lg">Please enter a valid Google Maps API Key in the settings to enable location search.</p>;
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

window.CanvaModal = ({ canvaUrl, onClose }) => {
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, []);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-[100] flex flex-col p-4">
            <div className="flex justify-end mb-4">
                <button onClick={onClose} className="text-white text-3xl font-bold leading-none">&times;</button>
            </div>
            <div className="flex-grow bg-white rounded-lg">
                <iframe
                    src={canvaUrl}
                    className="w-full h-full border-0 rounded-lg"
                    title="Canva Editor"
                ></iframe>
            </div>
        </div>
    );
};


// A new common Accordion component for collapsible sections
window.Accordion = ({ title, children, isOpen, onToggle, status = 'pending', isLocked = false, onRevisit, onRestart }) => {
    const statusColors = {
        'complete': 'border-green-500 bg-green-900/20',
        'pending': 'border-blue-500 bg-blue-900/20',
        'locked': 'border-gray-700 bg-gray-800/50 opacity-60',
        'revisited': 'border-amber-500 bg-amber-900/20',
        'in-progress': 'border-amber-500 bg-amber-900/20',
    };
    const statusTextColors = {
        'complete': 'text-green-400',
        'pending': 'text-blue-400',
        'locked': 'text-gray-400',
        'revisited': 'text-amber-400',
        'in-progress': 'text-amber-400',
    };

    return (
        <div className={`glass-card rounded-lg border ${statusColors[status] || 'border-gray-700 bg-gray-800/50'} overflow-hidden`}>
            <div
                onClick={isLocked ? null : onToggle}
                className={`w-full flex justify-between items-center p-4 text-left font-semibold text-white transition-colors duration-200 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                role="button"
                tabIndex={isLocked ? -1 : 0}
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-3">
                    <span className="text-xl">{isLocked ? '🔒' : (isOpen ? '▼' : '►')}</span>
                    <h3 className="text-xl">{title}</h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${statusTextColors[status] || 'text-gray-400'}`}>
                        {status === 'complete' && 'Complete'}
                        {status === 'pending' && 'Pending'}
                        {status === 'locked' && 'Locked'}
                        {status === 'revisited' && 'Revisiting'}
                        {status === 'in-progress' && 'In Progress'}
                        {!status && 'Not Started'}
                    </span>
                    {onRevisit && (status === 'complete') && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onRevisit(); }}
                            className="text-xs text-secondary-accent hover:text-secondary-accent-light px-2 py-1 rounded border border-gray-600 hover:border-gray-500"
                        >
                            Revisit
                        </button>
                    )}
                    {/* NEW: Restart button for "In Progress" tasks */}
                    {onRestart && (status === 'in-progress') && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onRestart(); }}
                            className="text-xs text-amber-400 hover:text-amber-300 px-2 py-1 rounded border border-amber-600 hover:border-amber-500"
                        >
                            Restart Task
                        </button>
                    )}
                </div>
            </div>
            <div className={`transition-max-height duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-screen' : 'max-h-0'}`}>
                <div className="p-4 pt-0">
                    {children}
                </div>
            </div>
        </div>
    );
};


// EXPOSE NEW COMPONENTS GLOBALLY
window.CopyButton = CopyButton;
