// js/components/SettingsView.js

window.SettingsView = ({ settings, onSave, onBack }) => {
    const [localSettings, setLocalSettings] = useState(settings);

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    const handleSave = () => {
        onSave(localSettings);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setLocalSettings(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="p-8">
            <button onClick={onBack} className="flex items-center gap-2 text-secondary-accent hover:text-secondary-accent-light mb-6">
                ⬅️ Back to Settings Menu
            </button>
            <h1 className="text-4xl font-bold mb-4">Technical Settings</h1>
            <p className="text-gray-400 mb-8">Manage your API keys.</p>
            <div className="space-y-6 max-w-2xl">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Your Gemini API Key</label>
                    <input
                        type="password"
                        name="geminiApiKey"
                        value={localSettings.geminiApiKey || ''}
                        onChange={handleChange}
                        className="w-full form-input"
                        placeholder="Enter your Gemini API Key"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Your Google Maps API Key</label>
                    <input
                        type="password"
                        name="googleMapsApiKey"
                        value={localSettings.googleMapsApiKey || ''}
                        onChange={handleChange}
                        className="w-full form-input"
                        placeholder="Enter your Google Maps API Key (for location search)"
                    />
                </div>
                {/* NEW: YouTube Data API Key */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Your YouTube Data API Key</label>
                    <input
                        type="password"
                        name="youtubeApiKey"
                        value={localSettings.youtubeApiKey || ''}
                        onChange={handleChange}
                        className="w-full form-input"
                        placeholder="Enter your YouTube Data API Key"
                    />
                    <p className="text-xs text-gray-400 mt-1">Required for importing YouTube playlists/videos.</p>
                </div>
            </div>
            <div className="mt-8 text-right max-w-2xl">
                <button onClick={handleSave} className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors">
                    Save Settings
                </button>
            </div>
        </div>
    );
};
