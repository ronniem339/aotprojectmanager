// js/components/TechnicalSettingsView.js

const { useState, useEffect } = React;

window.TechnicalSettingsView = ({ settings, onSave, onBack }) => {
    // MODIFIED: This local state now manages all technical settings
    const [localSettings, setLocalSettings] = useState({
        geminiApiKey: '',
        googleMapsApiKey: '',
        youtubeApiKey: '',
        useProModelForComplexTasks: false,
        flashModelName: '',
        proModelName: ''
    });

    useEffect(() => {
        // MODIFIED: Populate all fields from the main settings prop
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
        // The main save function now saves all local settings, including API keys and WordPress
        onSave({ ...settings, ...localSettings });
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
                    
                    {/* API Keys */}
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Google Gemini API Key</label>
                            <input type="password" name="geminiApiKey" value={localSettings.geminiApiKey} onChange={handleChange} className="w-full form-input" placeholder="Enter your Google Gemini API Key"/>
                            <p className="text-xs text-gray-500 mt-1">Required for all AI-powered generation features.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Google Maps JavaScript API Key</label>
                            <input type="password" name="googleMapsApiKey" value={localSettings.googleMapsApiKey} onChange={handleChange} className="w-full form-input" placeholder="Enter your Google Maps JavaScript API Key"/>
                            <p className="text-xs text-gray-500 mt-1">Required for location search and mapping features.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">YouTube Data API Key</label>
                            <input type="password" name="youtubeApiKey" value={localSettings.youtubeApiKey} onChange={handleChange} className="w-full form-input" placeholder="Enter your YouTube Data API Key"/>
                            <p className="text-xs text-gray-500 mt-1">Required for importing existing YouTube playlists/videos.</p>
                        </div>
                    </div>

                    {/* NEW: AI Model Settings */}
                    <div className="mt-10 pt-8 border-t border-gray-700">
                        <h2 className="text-2xl font-semibold mb-2">AI Model Configuration</h2>
                        <p className="text-gray-400 mb-6">Control which AI models are used for different tasks. The "Pro" model is more powerful but may be slower and more expensive.</p>
                        
                        <div className="space-y-6">
                            {/* Toggle Switch */}
                            <div className="flex items-center justify-between bg-gray-800/50 p-4 rounded-lg">
                                <span className="text-md font-medium text-white">Use Pro Model for Complex Tasks</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        name="useProModelForComplexTasks"
                                        checked={localSettings.useProModelForComplexTasks}
                                        onChange={handleChange}
                                        className="sr-only peer" 
                                    />
                                    <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-primary-accent peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-accent"></div>
                                </label>
                            </div>
                            
                            {/* Model Name Inputs */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Flash Model Name</label>
                                <input 
                                    type="text" 
                                    name="flashModelName" 
                                    value={localSettings.flashModelName} 
                                    onChange={handleChange} 
                                    className="w-full form-input" 
                                    placeholder="e.g., gemini-1.5-flash-latest"
                                />
                                <p className="text-xs text-gray-500 mt-1">Used for simple, fast tasks like generating titles, tags, and keywords.</p>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Pro Model Name</label>
                                <input 
                                    type="text" 
                                    name="proModelName" 
                                    value={localSettings.proModelName} 
                                    onChange={handleChange} 
                                    className="w-full form-input" 
                                    placeholder="e.g., gemini-1.5-pro-latest"
                                />
                                <p className="text-xs text-gray-500 mt-1">Used for complex tasks like writing full scripts and detailed plans, if enabled above.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Integrations Section */}
                <div className="border-t border-gray-700 pt-10 max-w-2xl">
                     <h1 className="text-3xl font-bold mb-2">Integrations</h1>
                     <p className="text-gray-400 mb-6">Connect to external services like your blog.</p>
                     <window.WordpressSettings settings={settings} onSave={onSave} />
                </div>
                
                 {/* Unified Save Button */}
                <div className="mt-12 pt-8 border-t border-gray-700 text-right max-w-2xl">
                    <button onClick={handleSaveAll} className="px-8 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors text-lg">
                        Save All Technical Settings
                    </button>
                </div>
            </div>
        </div>
    );
};
