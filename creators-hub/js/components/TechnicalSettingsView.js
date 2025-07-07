// creators-hub/js/components/TechnicalSettingsView.js

const { useState, useEffect } = React;

window.TechnicalSettingsView = ({ settings, onSave, onBack, appState }) => {
    const [localSettings, setLocalSettings] = useState({
        geminiApiKey: '',
        googleMapsApiKey: '',
        youtubeApiKey: '',
        useProModelForComplexTasks: false,
        flashModelName: '',
        proModelName: ''
    });

    // State for the deduplication tool
    const [isDeduplicating, setIsDeduplicating] = useState(false);
    const [deduplicationProgress, setDeduplicationProgress] = useState('');
    const [deduplicationError, setDeduplicationError] = useState('');
    const [deduplicationSuccess, setDeduplicationSuccess] = useState('');
    
    // MODIFICATION: Added state for cache clearing
    const [isClearingCache, setIsClearingCache] = useState(false);
    const [cacheClearSuccess, setCacheClearSuccess] = useState('');
    const [cacheClearError, setCacheClearError] = useState('');


    const { db, user, currentSettings } = appState;
    const isConnectionReady = db && user && currentSettings;

    useEffect(() => {
        if (settings) {
            setLocalSettings({
                geminiApiKey: settings.geminiApiKey || '',
                googleMapsApiKey: settings.googleMapsApiKey || '',
                youtubeApiKey: settings.youtubeApiKey || '',
                useProModelForComplexTasks: settings.useProModelForComplexTasks || false,
                flashModelName: settings.flashModelName || 'gemini-1.5-flash-latest',
                proModelName: settings.proModelName || 'gemini-1.5-pro-latest'
            });
        }
    }, [settings]);
    
    // MODIFICATION: Added listener for cache cleared message from service worker
    useEffect(() => {
        const handleMessage = (event) => {
            if (event.data && event.data.type === 'CACHE_CLEARED') {
                console.log('App received CACHE_CLEARED message. Reloading...');
                setCacheClearSuccess('Cache cleared successfully! Reloading...');
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            }
        };
        navigator.serviceWorker.addEventListener('message', handleMessage);
        
        return () => {
            navigator.serviceWorker.removeEventListener('message', handleMessage);
        };
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;
        setLocalSettings(prev => ({ ...prev, [name]: val }));
    };

    const handleSaveAll = () => {
        onSave({ ...settings, ...localSettings });
    };

    const handleRunDeduplicator = async () => {
        setIsDeduplicating(true);
        setDeduplicationProgress('Starting cleanup...');
        setDeduplicationError('');
        setDeduplicationSuccess('');

        try {
            const result = await window.wordpressUtils.deduplicateWordPressPosts({
                db,
                user,
                onProgress: (message) => setDeduplicationProgress(message)
            });
            setDeduplicationSuccess(`Cleanup complete! Checked ${result.checked} unique posts and removed ${result.removed} duplicates.`);
        } catch (err) {
            console.error("Deduplication Failed:", err);
            setDeduplicationError(`Cleanup failed: ${err.message}`);
        } finally {
            setIsDeduplicating(false);
        }
    };
    
    // MODIFICATION: Added handler to clear service worker cache
    const handleClearCache = () => {
        setIsClearingCache(true);
        setCacheClearError('');
        setCacheClearSuccess('');

        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            console.log('Sending CLEAR_CACHE command to service worker.');
            navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
        } else {
            setCacheClearError('Service worker not available or not in control. Try reloading the page.');
            setIsClearingCache(false);
        }
    };

    return (
        React.createElement('div', { className: 'p-8' },
            React.createElement('button', { onClick: onBack, className: 'flex items-center gap-2 text-secondary-accent hover:text-secondary-accent-light mb-6' },
                '⬅️ Back to Settings Menu'
            ),

            React.createElement('div', { className: 'space-y-12' },
                // API Keys & Model Settings Section
                React.createElement('div', { className: 'max-w-2xl' },
                    React.createElement('h1', { className: 'text-3xl font-bold mb-2' }, 'Technical Settings'),
                    React.createElement('p', { className: 'text-gray-400 mb-6' }, 'Manage API keys and AI model configurations. Keep API keys secure!'),
                    React.createElement('div', { className: 'space-y-6' },
                        React.createElement('div', null,
                            React.createElement('label', { className: 'block text-sm font-medium text-gray-300 mb-2' }, 'Google Gemini API Key'),
                            React.createElement('input', { type: 'password', name: 'geminiApiKey', value: localSettings.geminiApiKey, onChange: handleChange, className: 'w-full form-input', placeholder: 'Enter your Google Gemini API Key' })
                        ),
                        React.createElement('div', null,
                            React.createElement('label', { className: 'block text-sm font-medium text-gray-300 mb-2' }, 'Google Maps JavaScript API Key'),
                            React.createElement('input', { type: 'password', name: 'googleMapsApiKey', value: localSettings.googleMapsApiKey, onChange: handleChange, className: 'w-full form-input', placeholder: 'Enter your Google Maps JavaScript API Key' })
                        ),
                        React.createElement('div', null,
                            React.createElement('label', { className: 'block text-sm font-medium text-gray-300 mb-2' }, 'YouTube Data API Key'),
                            React.createElement('input', { type: 'password', name: 'youtubeApiKey', value: localSettings.youtubeApiKey, onChange: handleChange, className: 'w-full form-input', placeholder: 'Enter your YouTube Data API Key' })
                        )
                    ),
                    React.createElement('div', { className: 'mt-10 pt-8 border-t border-gray-700' },
                        React.createElement('h2', { className: 'text-2xl font-semibold mb-2' }, 'AI Model Configuration'),
                        React.createElement('div', { className: 'space-y-6' },
                            React.createElement('div', { className: 'flex items-center justify-between bg-gray-800/50 p-4 rounded-lg' },
                                React.createElement('span', { className: 'text-md font-medium text-white' }, 'Use Pro Model for Complex Tasks'),
                                React.createElement('label', { className: 'relative inline-flex items-center cursor-pointer' },
                                    React.createElement('input', { type: 'checkbox', name: 'useProModelForComplexTasks', checked: localSettings.useProModelForComplexTasks, onChange: handleChange, className: 'sr-only peer' }),
                                    React.createElement('div', { className: "w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-primary-accent peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-accent" })
                                )
                            ),
                            React.createElement('div', null,
                                React.createElement('label', { className: 'block text-sm font-medium text-gray-300 mb-2' }, 'Flash Model Name'),
                                React.createElement('input', { type: 'text', name: 'flashModelName', value: localSettings.flashModelName, onChange: handleChange, className: 'w-full form-input', placeholder: 'e.g., gemini-1.5-flash-latest' })
                            ),
                            React.createElement('div', null,
                                React.createElement('label', { className: 'block text-sm font-medium text-gray-300 mb-2' }, 'Pro Model Name'),
                                React.createElement('input', { type: 'text', name: 'proModelName', value: localSettings.proModelName, onChange: handleChange, className: 'w-full form-input', placeholder: 'e.g., gemini-1.5-pro-latest' })
                            )
                        )
                    )
                ),

                // Integrations Section
                React.createElement('div', { className: 'border-t border-gray-700 pt-10 max-w-2xl' },
                    React.createElement('h1', { className: 'text-3xl font-bold mb-2' }, 'Integrations'),
                    React.createElement('p', { className: 'text-gray-400 mb-6' }, 'Connect to external services.'),
                    React.createElement(window.WordpressSettings, { settings: settings, onSave: onSave })
                ),
                
                // --- Data Management Section ---
                React.createElement('div', { className: 'border-t border-gray-700 pt-10 max-w-2xl' },
                    React.createElement('h1', { className: 'text-3xl font-bold mb-2' }, 'Data Management'),

                    // --- One-Off Updater Tool ---
                    React.createElement(window.OneOffWordPressUpdater, { appState: appState }),

                    React.createElement('hr', { className: 'my-8 border-gray-700' }),
                    
                    // --- Data Cleanup Tool ---
                    React.createElement('div', { className: 'bg-gray-800/60 border border-gray-700 p-6 rounded-lg' },
                        React.createElement('h3', { className: 'text-xl font-bold mb-4' }, 'Data Cleanup Tool'),
                        React.createElement('p', { className: 'mb-4 text-gray-400' },
                            'If a previous import failed, you might have duplicate posts. Run this cleanup tool once to find and remove them.'
                        ),
                        !isDeduplicating && !deduplicationSuccess && (
                            React.createElement('button', {
                                onClick: handleRunDeduplicator,
                                className: 'btn btn-secondary',
                                disabled: !isConnectionReady
                            },
                                isConnectionReady ? 'Find & Remove Duplicates' : 'Connecting...'
                            )
                        ),
                        isDeduplicating && (
                            React.createElement('div', { className: 'flex items-center space-x-2' },
                                React.createElement(window.LoadingSpinner, { isButton: false }),
                                React.createElement('p', { className: 'text-gray-300 font-medium' }, deduplicationProgress)
                            )
                        ),
                        !isDeduplicating && deduplicationError && React.createElement('p', { className: 'text-red-400 mt-4 font-semibold' }, deduplicationError),
                        !isDeduplicating && deduplicationSuccess && React.createElement('p', { className: 'text-green-400 font-semibold mt-4' }, deduplicationSuccess)
                    ),
                    
                    // MODIFICATION: Added PWA Cache Clearing Tool
                    React.createElement('hr', { className: 'my-8 border-gray-700' }),
                    React.createElement('div', { className: 'bg-gray-800/60 border border-red-500/50 p-6 rounded-lg' },
                        React.createElement('h3', { className: 'text-xl font-bold mb-4 text-red-400' }, 'PWA Cache Tool (For Development)'),
                        React.createElement('p', { className: 'mb-4 text-gray-400' },
                            'If you\'ve updated the app\'s code and aren\'t seeing the changes in the installed PWA, use this button to force clear all cached files and reload the application.'
                        ),
                        !isClearingCache && !cacheClearSuccess && (
                            React.createElement('button', {
                                onClick: handleClearCache,
                                className: 'btn btn-danger' // Assuming you have a danger button style
                            },
                                'Clear PWA Cache & Reload'
                            )
                        ),
                        isClearingCache && (
                             React.createElement('div', { className: 'flex items-center space-x-2' },
                                React.createElement(window.LoadingSpinner, { isButton: false }),
                                React.createElement('p', { className: 'text-gray-300 font-medium' }, cacheClearSuccess || 'Clearing cache...')
                            )
                        ),
                         !isClearingCache && cacheClearError && React.createElement('p', { className: 'text-red-400 mt-4 font-semibold' }, cacheClearError)
                    )
                ),
                
                React.createElement('div', { className: 'mt-12 pt-8 border-t border-gray-700 text-right max-w-2xl' },
                    React.createElement('button', { onClick: handleSaveAll, className: 'px-8 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors text-lg' },
                        'Save All Technical Settings'
                    )
                )
            )
        )
    );
};
