// creators-hub/js/components/TechnicalSettingsView.js

const { useState, useEffect } = React;

window.TechnicalSettingsView = ({ settings, onSave, onBack, appState }) => {
    // This state now holds ALL settings, including the new V2 ones.
    const [localSettings, setLocalSettings] = useState({
        geminiApiKey: '',
        googleMapsApiKey: '',
        youtubeApiKey: '',
        // V1 settings
        useProModelForComplexTasks: false,
        flashModelName: '',
        proModelName: '',
        // NEW: V2 settings
        useProForV2HeavyTasks: true,
        // We will add the v2 model names here as well
        v2_proModelName: '',
        v2_flashModelName: '',
        v2_liteModelName: ''
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
                // V1 settings
                useProModelForComplexTasks: settings.useProModelForComplexTasks || false,
                flashModelName: settings.models?.flash || 'gemini-1.5-flash-latest',
                proModelName: settings.models?.pro || 'gemini-1.5-pro-latest',
                // NEW: Initialize V2 settings from the main settings object
                useProForV2HeavyTasks: settings.technical?.useProForV2HeavyTasks !== undefined ? settings.technical.useProForV2HeavyTasks : true,
                // NEW: Separate model names for V2
                v2_proModelName: settings.models?.v2_pro || 'gemini-1.5-pro-latest',
                v2_flashModelName: settings.models?.v2_flash || 'gemini-1.5-flash-latest',
                v2_liteModelName: settings.models?.v2_lite || 'gemini-1.5-flash-lite-001'
            });
        }
    }, [settings]);

    // MODIFICATION: This effect is no longer needed and has been removed to prevent the hanging issue.

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;
        setLocalSettings(prev => ({ ...prev, [name]: val }));
    };

    const handleSaveAll = () => {
        // This function now correctly structures the settings object for saving.
        const updatedSettings = {
            ...settings,
            geminiApiKey: localSettings.geminiApiKey,
            googleMapsApiKey: localSettings.googleMapsApiKey,
            youtubeApiKey: localSettings.youtubeApiKey,
            // V1 setting
            useProModelForComplexTasks: localSettings.useProModelForComplexTasks,
            // NEW: Add V2 settings to the technical object
            technical: {
                ...settings.technical,
                useProForV2HeavyTasks: localSettings.useProForV2HeavyTasks,
            },
            models: {
                ...settings.models,
                // Legacy models
                flash: localSettings.flashModelName,
                pro: localSettings.proModelName,
                // NEW: Add separate V2 models to the models object
                v2_pro: localSettings.v2_proModelName,
                v2_flash: localSettings.v2_flashModelName,
                v2_lite: localSettings.v2_liteModelName,
            }
        };
        onSave(updatedSettings);
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

    // MODIFICATION: The handler now assumes success and forces a reload.
    const handleClearCache = () => {
        if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
            setCacheClearError('Service worker not available. Please try reloading the page.');
            return;
        }

        setIsClearingCache(true);
        setCacheClearError('');
        
        try {
            // Send the command to the service worker.
            navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });

            // Immediately show the success message and prepare to reload.
            setCacheClearSuccess('Cache cleared! The application will now reload...');
            
            // Force a reload after a short delay to allow the cache to clear.
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (error) {
            console.error('Error sending message to service worker:', error);
            setCacheClearError('Could not send command to service worker.');
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
                        React.createElement('h2', { className: 'text-2xl font-semibold mb-2' }, 'AI Model Configuration (Legacy)'),
                        React.createElement('div', { className: 'space-y-6' },
                            React.createElement('div', { className: 'flex items-center justify-between bg-gray-800/50 p-4 rounded-lg' },
                                React.createElement('span', { className: 'text-md font-medium text-white' }, 'Use Pro Model for Complex Tasks'),
                                React.createElement('label', { className: 'relative inline-flex items-center cursor-pointer' },
                                    React.createElement('input', { type: 'checkbox', name: 'useProModelForComplexTasks', checked: localSettings.useProModelForComplexTasks, onChange: handleChange, className: 'sr-only peer' }),
                                    React.createElement('div', { className: "w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-primary-accent peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-accent" })
                                )
                            ),
                            React.createElement('div', null,
                                React.createElement('label', { className: 'block text-sm font-medium text-gray-300 mb-2' }, 'Flash Model Name (Legacy)'),
                                React.createElement('input', { type: 'text', name: 'flashModelName', value: localSettings.flashModelName, onChange: handleChange, className: 'w-full form-input', placeholder: 'e.g., gemini-1.5-flash-latest' })
                            ),
                            React.createElement('div', null,
                                React.createElement('label', { className: 'block text-sm font-medium text-gray-300 mb-2' }, 'Pro Model Name (Legacy)'),
                                React.createElement('input', { type: 'text', name: 'proModelName', value: localSettings.proModelName, onChange: handleChange, className: 'w-full form-input', placeholder: 'e.g., gemini-1.5-pro-latest' })
                            )
                        )
                    ),

                    React.createElement('div', { className: 'mt-10 pt-8 border-t border-gray-700' },
                        React.createElement('h2', { className: 'text-2xl font-semibold mb-2' }, 'Scripting V2 Model Configuration'),
                        React.createElement('p', { className: 'text-gray-400 mb-4 text-sm' }, 'Configure the tiered AI models specifically for the new Scripting V2 workflow.'),
                        React.createElement('div', { className: 'space-y-6' },
                            React.createElement('div', { className: 'flex items-center justify-between bg-gray-800/50 p-4 rounded-lg' },
                                React.createElement('span', { className: 'text-md font-medium text-white' }, 'Use Pro for Heavy V2 Tasks'),
                                React.createElement('label', { className: 'relative inline-flex items-center cursor-pointer' },
                                    React.createElement('input', { type: 'checkbox', name: 'useProForV2HeavyTasks', checked: localSettings.useProForV2HeavyTasks, onChange: handleChange, className: 'sr-only peer' }),
                                    React.createElement('div', { className: "w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-primary-accent peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-accent" })
                                )
                            ),
                            React.createElement('div', null,
                                React.createElement('label', { className: 'block text-sm font-medium text-gray-300 mb-2' }, 'Pro Model Name (V2)'),
                                React.createElement('input', { type: 'text', name: 'v2_proModelName', value: localSettings.v2_proModelName, onChange: handleChange, className: 'w-full form-input', placeholder: 'e.g., gemini-1.5-pro-latest' })
                            ),
                            React.createElement('div', null,
                                React.createElement('label', { className: 'block text-sm font-medium text-gray-300 mb-2' }, 'Flash Model Name (V2)'),
                                React.createElement('input', { type: 'text', name: 'v2_flashModelName', value: localSettings.v2_flashModelName, onChange: handleChange, className: 'w-full form-input', placeholder: 'e.g., gemini-1.5-flash-latest' })
                            ),
                            React.createElement('div', null,
                                React.createElement('label', { className: 'block text-sm font-medium text-gray-300 mb-2' }, 'Flash Lite Model Name (V2)'),
                                React.createElement('input', { type: 'text', name: 'v2_liteModelName', value: localSettings.v2_liteModelName, onChange: handleChange, className: 'w-full form-input', placeholder: 'e.g., gemini-1.5-flash-lite-001' })
                            )
                        )
                    )
                ),

                React.createElement('div', { className: 'border-t border-gray-700 pt-10 max-w-2xl' },
                    React.createElement('h1', { className: 'text-3xl font-bold mb-2' }, 'Integrations'),
                    React.createElement('p', { className: 'text-gray-400 mb-6' }, 'Connect to external services.'),
                    React.createElement(window.WordpressSettings, { settings: settings, onSave: onSave })
                ),
                
                React.createElement('div', { className: 'border-t border-gray-700 pt-10 max-w-2xl' },
                    React.createElement('h1', { className: 'text-3xl font-bold mb-2' }, 'Data Management'),
                    React.createElement(window.OneOffWordPressUpdater, { appState: appState }),
                    React.createElement('hr', { className: 'my-8 border-gray-700' }),
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

                    React.createElement('hr', { className: 'my-8 border-gray-700' }),
                    React.createElement('div', { className: 'bg-gray-800/60 border border-red-500/50 p-6 rounded-lg' },
                        React.createElement('h3', { className: 'text-xl font-bold mb-4 text-red-400' }, 'PWA Cache Tool (For Development)'),
                        React.createElement('p', { className: 'mb-4 text-gray-400' },
                            'If you\'ve updated the app\'s code and aren\'t seeing the changes in the installed PWA, use this button to force clear all cached files and reload the application.'
                        ),
                        !isClearingCache && !cacheClearSuccess && (
                            React.createElement('button', {
                                onClick: handleClearCache,
                                className: 'btn btn-danger'
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
