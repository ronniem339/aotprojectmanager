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

    // State for the importer
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState('');
    const [importError, setImportError] = useState('');
    const [importSuccess, setImportSuccess] = useState('');
    
    // State for the deduplication tool
    const [isDeduplicating, setIsDeduplicating] = useState(false);
    const [deduplicationProgress, setDeduplicationProgress] = useState('');
    const [deduplicationError, setDeduplicationError] = useState('');
    const [deduplicationSuccess, setDeduplicationSuccess] = useState('');

    const { db, user, currentSettings } = appState;
    // CORRECTED: Connection is ready when db and user are available. Settings are checked later.
    const isConnectionReady = db && user;

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

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;
        setLocalSettings(prev => ({ ...prev, [name]: val }));
    };

    const handleSaveAll = () => {
        onSave({ ...settings, ...localSettings });
    };

    const handleRunImporter = async () => {
        setIsImporting(true);
        setImportProgress('Starting import process...');
        setImportError('');
        setImportSuccess('');

        try {
            // CORRECTED: Add a guard to ensure settings are loaded before proceeding.
            if (!currentSettings) {
                throw new Error("Settings are not loaded yet. Please wait a moment and try again.");
            }

            const { wordpress, googleMapsApiKey } = currentSettings;
            if (!wordpress || !wordpress.url || !wordpress.username || !wordpress.applicationPassword) {
                throw new Error("WordPress settings are incomplete.");
            }
            if (!googleMapsApiKey) {
                throw new Error("Google Maps API key is required for location detection.");
            }

            // 1. Fetch all tags from WordPress to identify potential locations
            setImportProgress('Fetching all WordPress tags...');
            const tagsResponse = await fetch(`/.netlify/functions/fetch-wp-tags?url=${encodeURIComponent(wordpress.url)}&user=${encodeURIComponent(wordpress.username)}&pass=${encodeURIComponent(wordpress.applicationPassword)}`);
            if (!tagsResponse.ok) throw new Error('Failed to fetch WordPress tags.');
            const tagsData = await tagsResponse.json();
            const allTagNames = tagsData.map(tag => tag.name);

            // 2. Batch geocode all tags to create a location map
            setImportProgress(`Found ${allTagNames.length} unique tags. Geocoding to find locations...`);
            const geocodeResponse = await fetch(`/.netlify/functions/batch-geocode-tags?tags=${encodeURIComponent(allTagNames.join(','))}&apiKey=${googleMapsApiKey}`);
            if (!geocodeResponse.ok) throw new Error('Failed to geocode tags for location mapping.');
            const locationTagMap = await geocodeResponse.json();
            setImportProgress('Location map created. Starting post import...');

            // 3. Run the importer with the new location map
            const totalImported = await window.wordpressUtils.importAllWordPressPosts({
                db: db,
                user: user,
                wordpressConfig: wordpress,
                onProgress: (message) => setImportProgress(message),
                locationTagMap: locationTagMap
            });

            setImportSuccess(`Import complete! Successfully imported/updated ${totalImported} posts.`);
        } catch (err) {
            console.error("Import Failed:", err);
            setImportError(`Import failed: ${err.message}`);
        } finally {
            setIsImporting(false);
        }
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
   return (
        <div className="p-8">
            <button onClick={onBack} className="flex items-center gap-2 text-secondary-accent hover:text-secondary-accent-light mb-6">
                ⬅️ Back to Settings Menu
            </button>

            {/* ADD THIS ONE-OFF TOOL HERE */}
            <window.OneOffWordPressUpdater appState={appState} />

            <div className="space-y-12">
                {/* ... all the other content of the settings page ... */}
            </div>
        </div>
    );
};

    return (
        <div className="p-8">
            <button onClick={onBack} className="flex items-center gap-2 text-secondary-accent hover:text-secondary-accent-light mb-6">
                ⬅️ Back to Settings Menu
            </button>
            <div className="space-y-12">
                {/* API Keys & Model Settings Section */}
                <div className="max-w-2xl">
                    <h1 className="text-3xl font-bold mb-2">Technical Settings</h1>
                    <p className="text-gray-400 mb-6">Manage API keys and AI model configurations. Keep API keys secure!</p>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Google Gemini API Key</label>
                            <input type="password" name="geminiApiKey" value={localSettings.geminiApiKey} onChange={handleChange} className="w-full form-input" placeholder="Enter your Google Gemini API Key"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Google Maps JavaScript API Key</label>
                            <input type="password" name="googleMapsApiKey" value={localSettings.googleMapsApiKey} onChange={handleChange} className="w-full form-input" placeholder="Enter your Google Maps JavaScript API Key"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">YouTube Data API Key</label>
                            <input type="password" name="youtubeApiKey" value={localSettings.youtubeApiKey} onChange={handleChange} className="w-full form-input" placeholder="Enter your YouTube Data API Key"/>
                        </div>
                    </div>
                    <div className="mt-10 pt-8 border-t border-gray-700">
                        <h2 className="text-2xl font-semibold mb-2">AI Model Configuration</h2>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between bg-gray-800/50 p-4 rounded-lg">
                                <span className="text-md font-medium text-white">Use Pro Model for Complex Tasks</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" name="useProModelForComplexTasks" checked={localSettings.useProModelForComplexTasks} onChange={handleChange} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-primary-accent peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-accent"></div>
                                </label>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Flash Model Name</label>
                                <input type="text" name="flashModelName" value={localSettings.flashModelName} onChange={handleChange} className="w-full form-input" placeholder="e.g., gemini-1.5-flash-latest"/>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Pro Model Name</label>
                                <input type="text" name="proModelName" value={localSettings.proModelName} onChange={handleChange} className="w-full form-input" placeholder="e.g., gemini-1.5-pro-latest"/>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Integrations Section */}
                <div className="border-t border-gray-700 pt-10 max-w-2xl">
                     <h1 className="text-3xl font-bold mb-2">Integrations</h1>
                     <p className="text-gray-400 mb-6">Connect to external services.</p>
                     <window.WordpressSettings settings={settings} onSave={onSave} />
                </div>
                
                {/* --- UPDATED Data Management Section --- */}
                <div className="border-t border-gray-700 pt-10 max-w-2xl">
                    <h1 className="text-3xl font-bold mb-2">Data Management</h1>

                    {/* --- NEW: Cleanup Tool UI --- */}
                    <div className="bg-gray-800/60 border border-gray-700 p-6 rounded-lg">
                        <h3 className="text-xl font-bold mb-4">Data Cleanup Tool</h3>
                        <p className="mb-4 text-gray-400">
                            If a previous import failed, you might have duplicate posts. Run this cleanup tool once to find and remove them.
                        </p>
                        {!isDeduplicating && !deduplicationSuccess && (
                            <button 
                              onClick={handleRunDeduplicator} 
                              className="btn btn-secondary"
                              disabled={!isConnectionReady || isImporting}
                            >
                                {isConnectionReady ? 'Find & Remove Duplicates' : 'Connecting...'}
                            </button>
                        )}
                        {isDeduplicating && (
                            <div className="flex items-center space-x-2">
                                <window.LoadingSpinner isButton={false} />
                                <p className="text-gray-300 font-medium">{deduplicationProgress}</p>
                            </div>
                        )}
                        {!isDeduplicating && deduplicationError && <p className="text-red-400 mt-4 font-semibold">{deduplicationError}</p>}
                        {!isDeduplicating && deduplicationSuccess && <p className="text-green-400 font-semibold mt-4">{deduplicationSuccess}</p>}
                    </div>

                    <hr className="my-8 border-gray-700" />
                    
                    {/* --- Importer Tool UI --- */}
                    <div className="bg-gray-800/60 border border-gray-700 p-6 rounded-lg">
                        <h3 className="text-xl font-bold mb-4">WordPress Content Importer</h3>
                        <p className="mb-4 text-gray-400">
                            Import all existing posts from your WordPress blog. This tool is now safe to run multiple times.
                        </p>
                        {!isImporting && !importSuccess && (
                            <button 
                              onClick={handleRunImporter} 
                              className="btn btn-primary"
                              disabled={!isConnectionReady || isDeduplicating}
                            >
                                {isConnectionReady ? 'Start WordPress Import' : 'Connecting...'}
                            </button>
                        )}
                        {isImporting && (
                            <div className="flex items-center space-x-2">
                                <window.LoadingSpinner isButton={false} />
                                <p className="text-gray-300 font-medium">{importProgress}</p>
                            </div>
                        )}
                        {!isImporting && importError && <p className="text-red-400 mt-4 font-semibold">{importError}</p>}
                        {!isImporting && importSuccess && <p className="text-green-400 font-semibold mt-4">{importSuccess}</p>}
                    </div>
                </div>
                
                <div className="mt-12 pt-8 border-t border-gray-700 text-right max-w-2xl">
                    <button onClick={handleSaveAll} className="px-8 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors text-lg">
                        Save All Technical Settings
                    </button>
                </div>
            </div>
        </div>
    );
};
