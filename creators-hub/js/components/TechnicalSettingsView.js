// js/components/TechnicalSettingsView.js

const { useState, useEffect } = React;

window.TechnicalSettingsView = ({ settings, onSave, onBack }) => {
    const [localApiSettings, setLocalApiSettings] = useState({
        geminiApiKey: settings.geminiApiKey || '',
        googleMapsApiKey: settings.googleMapsApiKey || '',
        youtubeApiKey: settings.youtubeApiKey || ''
    });

    useEffect(() => {
        setLocalApiSettings({
            geminiApiKey: settings.geminiApiKey || '',
            googleMapsApiKey: settings.googleMapsApiKey || '',
            youtubeApiKey: settings.youtubeApiKey || ''
        });
    }, [settings]);

    const handleApiChange = (e) => {
        const { name, value } = e.target;
        setLocalApiSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveApiKeys = () => {
        onSave({ ...settings, ...localApiSettings });
    };

    // The main onSave function is passed to WordpressSettings for a unified save button logic
    const handleSaveAll = (newSettings) => {
        onSave(newSettings);
    };

    return (
        <div className="p-8">
            <button onClick={onBack} className="flex items-center gap-2 text-secondary-accent hover:text-secondary-accent-light mb-6">
                ⬅️ Back to Settings Menu
            </button>
            <div className="space-y-12">
                {/* API Keys Section */}
                <div className="max-w-2xl">
                    <h1 className="text-3xl font-bold mb-2">API Keys</h1>
                    <p className="text-gray-400 mb-6">Manage API keys for various services. Keep these secure!</p>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Google Gemini API Key</label>
                            <input type="password" name="geminiApiKey" value={localApiSettings.geminiApiKey} onChange={handleApiChange} className="w-full form-input" placeholder="Enter your Google Gemini API Key"/>
                            <p className="text-xs text-gray-500 mt-1">Required for all AI-powered generation features.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Google Maps JavaScript API Key</label>
                            <input type="password" name="googleMapsApiKey" value={localApiSettings.googleMapsApiKey} onChange={handleApiChange} className="w-full form-input" placeholder="Enter your Google Maps JavaScript API Key"/>
                            <p className="text-xs text-gray-500 mt-1">Required for location search and mapping features.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">YouTube Data API Key</label>
                            <input type="password" name="youtubeApiKey" value={localApiSettings.youtubeApiKey} onChange={handleApiChange} className="w-full form-input" placeholder="Enter your YouTube Data API Key"/>
                            <p className="text-xs text-gray-500 mt-1">Required for importing existing YouTube playlists/videos.</p>
                        </div>
                    </div>
                    <div className="mt-8 text-right">
                        <button onClick={handleSaveApiKeys} className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors">
                            Save API Keys
                        </button>
                    </div>
                </div>

                {/* Integrations Section */}
                <div className="border-t border-gray-700 pt-10 max-w-2xl">
                     <h1 className="text-3xl font-bold mb-2">Integrations</h1>
                     <p className="text-gray-400 mb-6">Connect to external services like your blog.</p>
                     <window.WordpressSettings settings={settings} onSave={handleSaveAll} />
                </div>
            </div>
        </div>
    );
};
