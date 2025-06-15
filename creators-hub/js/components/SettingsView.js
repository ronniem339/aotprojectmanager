// js/components/SettingsView.js
// This component displays the API key input fields.

const { useState, useEffect } = React;

window.SettingsView = ({ settings, onSave, onBack }) => {
    const [localSettings, setLocalSettings] = useState({
        geminiApiKey: settings.geminiApiKey || '',
        googleMapsApiKey: settings.googleMapsApiKey || '',
        youtubeApiKey: settings.youtubeApiKey || ''
    });

    useEffect(() => {
        setLocalSettings({
            geminiApiKey: settings.geminiApiKey || '',
            googleMapsApiKey: settings.googleMapsApiKey || '',
            youtubeApiKey: settings.youtubeApiKey || ''
        });
    }, [settings]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setLocalSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        onSave({ ...settings, ...localSettings });
    };

    return (
        <div className="p-8">
            <button onClick={onBack} className="flex items-center gap-2 text-secondary-accent hover:text-secondary-accent-light mb-6">
                ⬅️ Back to Settings Menu
            </button>
            <h1 className="text-4xl font-bold mb-4">🔧 Technical Settings</h1>
            <p className="text-gray-400 mb-8">Manage API keys for various services. Keep these secure!</p>
            <div className="space-y-6 max-w-2xl">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Google Gemini API Key</label>
                    <input
                        type="password" // Use password type for security
                        name="geminiApiKey"
                        value={localSettings.geminiApiKey}
                        onChange={handleChange}
                        className="w-full form-input"
                        placeholder="Enter your Google Gemini API Key"
                    />
                    <p className="text-xs text-gray-500 mt-1">Required for AI script, metadata, and keyword generation.</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Google Maps JavaScript API Key</label>
                    <input
                        type="password"
                        name="googleMapsApiKey"
                        value={localSettings.googleMapsApiKey}
                        onChange={handleChange}
                        className="w-full form-input"
                        placeholder="Enter your Google Maps JavaScript API Key"
                    />
                    <p className="text-xs text-gray-500 mt-1">Required for location search in project and video details.</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">YouTube Data API Key</label>
                    <input
                        type="password"
                        name="youtubeApiKey"
                        value={localSettings.youtubeApiKey}
                        onChange={handleChange}
                        className="w-full form-input"
                        placeholder="Enter your YouTube Data API Key"
                    />
                    <p className="text-xs text-gray-500 mt-1">Required for importing existing YouTube playlists/videos.</p>
                </div>
            </div>
            <div className="mt-8 text-right max-w-2xl">
                <button onClick={handleSave} className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors">
                    Save API Keys
                </button>
            </div>
        </div>
    );
};
