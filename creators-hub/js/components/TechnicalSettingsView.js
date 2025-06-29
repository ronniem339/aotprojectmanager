// js/components/TechnicalSettingsView.js

const { useState, useEffect } = React;

// IMPORTANT: The separate component 'WordPressImportTool.js' is no longer needed
// and can be safely deleted from your project.

window.TechnicalSettingsView = ({ settings, onSave, onBack }) => {
    const [localSettings, setLocalSettings] = useState({
        geminiApiKey: '',
        googleMapsApiKey: '',
        youtubeApiKey: '',
        useProModelForComplexTasks: false,
        flashModelName: '',
        proModelName: ''
    });

    // --- NEW: State for the simplified importer UI, managed directly in this component ---
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState('');
    const [importError, setImportError] = useState('');
    const [importSuccess, setImportSuccess] = useState('');
    
    // Get the full app state to ensure db/user are loaded when the button is clicked.
    const appState = window.useAppState();
    // This derived boolean will correctly reflect the connection status on every render.
    const isConnectionReady = appState && appState.db && appState.user;

    useEffect(() => {
        setLocalSettings({
            geminiApiKey: settings.geminiApiKey || '',
            googleMapsApiKey: settings.googleMapsApiKey || '',
            youtubeApiKey: settings.youtubeApiKey || '',
            useProModelForComplexTasks: settings.useProModelForComplexTasks || false,
            flashModelName: settings.flashModelName || 'gemini-1.5-flash-latest',
            proModelName: settings.proModelName || 'gemini-1.5-pro-latest'
        });
    }, [settings]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;
        setLocalSettings(prev => ({ ...prev, [name]: val }));
    };

    const handleSaveAll = () => {
        onSave({ ...settings, ...localSettings });
    };

    // --- NEW: Handler for the simplified import button ---
    const handleRunImporter = async () => {
        const { db, user, settings: currentSettings } = appState;
        
        if (!isConnectionReady) {
            setImportError("Connection not ready. Please wait a moment and try again.");
            return;
        }
        if (!currentSettings?.wordpress?.url) {
            setImportError("WordPress settings are not configured. Please set them up in the Integrations section.");
            return;
        }

        setIsImporting(true);
        setImportProgress('Starting import...');
        setImportError('');
        setImportSuccess('');

        try {
            const totalImported = await window.wordpressUtils.importAllWordPressPosts({
                db: db,
                user: user,
                wordpressConfig: currentSettings.wordpress,
                onProgress: (message) => setImportProgress(message) // Pass progress callback
            });
            setImportSuccess(`Import complete! Successfully imported ${totalImported} posts.`);
        } catch (err) {
            console.error("WordPress Import Failed:", err);
            setImportError(`Import failed: ${err.message}`);
        } finally {
            setIsImporting(false);
        }
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
                
                {/* --- NEW, SIMPLIFIED Data Management Section --- */}
                <div className="border-t border-gray-700 pt-10 max-w-2xl">
                    <h1 className="text-3xl font-bold mb-2">Data Management</h1>
                    <div className="bg-gray-800/60 border border-gray-700 p-6 rounded-lg">
                        <h3 className="text-xl font-bold mb-4">WordPress Content Importer</h3>
                        <p className="mb-4 text-gray-400">
                            Import all existing posts from your WordPress blog. This is a one-time operation.
                        </p>
                        {!isImporting && !importSuccess && (
                            <button 
                              onClick={handleRunImporter} 
                              className="btn btn-primary"
                              // The button is disabled until the connection is ready.
                              disabled={!isConnectionReady}
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
