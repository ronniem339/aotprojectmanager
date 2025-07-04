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
        defaultV2StandardModel: 'lite',
        liteModelName: ''
    });

    // State for the deduplication tool
    const [isDeduplicating, setIsDeduplicating] = useState(false);
    const [deduplicationProgress, setDeduplicationProgress] = useState('');
    const [deduplicationError, setDeduplicationError] = useState('');
    const [deduplicationSuccess, setDeduplicationSuccess] = useState('');

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
                defaultV2StandardModel: settings.technical?.defaultV2StandardModel || 'lite',
                liteModelName: settings.models?.lite || 'gemini-1.5-flash-lite-001'
            });
        }
    }, [settings]);

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
                defaultV2StandardModel: localSettings.defaultV2StandardModel,
            },
            models: {
                ...settings.models,
                flash: localSettings.flashModelName,
                pro: localSettings.proModelName,
                // NEW: Add lite model to the models object
                lite: localSettings.liteModelName,
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
                        <h2 className="text-2xl font-semibold mb-2">AI Model Configuration (Legacy)</h2>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between bg-gray-800/50 p-4 rounded-lg">
                                <span className="text-md font-medium text-white">Use Pro Model for Complex Tasks</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" name="useProModelForComplexTasks" checked={localSettings.useProModelForComplexTasks} onChange={handleChange} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-primary-accent peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-accent"></div>
                                </label>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Flash Model Name (Legacy)</label>
                                <input type="text" name="flashModelName" value={localSettings.flashModelName} onChange={handleChange} className="w-full form-input" placeholder="e.g., gemini-1.5-flash-latest"/>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Pro Model Name (Legacy)</label>
                                <input type="text" name="proModelName" value={localSettings.proModelName} onChange={handleChange} className="w-full form-input" placeholder="e.g., gemini-1.5-pro-latest"/>
                            </div>
                        </div>
                    </div>

                    {/* NEW: Scripting V2 Settings Section */}
                    <div className="mt-10 pt-8 border-t border-gray-700">
                        <h2 className="text-2xl font-semibold mb-2">Scripting V2 Model Configuration</h2>
                        <p className="text-gray-400 mb-4 text-sm">Configure the tiered AI models specifically for the new Scripting V2 workflow.</p>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between bg-gray-800/50 p-4 rounded-lg">
                                <span className="text-md font-medium text-white">Use Pro for Heavy V2 Tasks</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" name="useProForV2HeavyTasks" checked={localSettings.useProForV2HeavyTasks} onChange={handleChange} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-primary-accent peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-accent"></div>
                                </label>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Default Model for Standard V2 Tasks</label>
                                <select name="defaultV2StandardModel" value={localSettings.defaultV2StandardModel} onChange={handleChange} className="w-full form-input">
                                    <option value="lite">Flash Lite (Fastest, Lowest Cost)</option>
                                    <option value="flash">Flash (Balanced)</option>
                                </select>
                                <p className="text-xs text-gray-400 mt-1">Select the model for tasks like AI Research and generating Experience Questions.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Lite Model Name</label>
                                <input type="text" name="liteModelName" value={localSettings.liteModelName} onChange={handleChange} className="w-full form-input" placeholder="e.g., gemini-1.5-flash-lite-001"/>
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
                
                {/* --- Data Management Section --- */}
                <div className="border-t border-gray-700 pt-10 max-w-2xl">
                    <h1 className="text-3xl font-bold mb-2">Data Management</h1>

                    {/* --- One-Off Updater Tool --- */}
                    <window.OneOffWordPressUpdater appState={appState} />

                    <hr className="my-8 border-gray-700" />
                    
                    {/* --- Data Cleanup Tool --- */}
                    <div className="bg-gray-800/60 border border-gray-700 p-6 rounded-lg">
                        <h3 className="text-xl font-bold mb-4">Data Cleanup Tool</h3>
                        <p className="mb-4 text-gray-400">
                            If a previous import failed, you might have duplicate posts. Run this cleanup tool once to find and remove them.
                        </p>
                        {!isDeduplicating && !deduplicationSuccess && (
                            <button 
                                onClick={handleRunDeduplicator} 
                                className="btn btn-secondary"
                                disabled={!isConnectionReady}
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
