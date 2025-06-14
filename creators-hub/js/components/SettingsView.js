// js/components/SettingsView.js

const SettingsView = ({ settings, onSave, onBack }) => {
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
            <button onClick={onBack} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6">
                ⬅️ Back to Dashboard
            </button>
            <h1 className="text-4xl font-bold mb-4">Technical Settings</h1>
            <p className="text-gray-400 mb-8">Manage your API keys here. These are stored securely in your user profile and are never shared.</p>
            <div className="space-y-6 max-w-lg">
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
            </div>
            <div className="mt-8 text-right max-w-lg">
                <button onClick={handleSave} className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors">
                    Save Keys
                </button>
            </div>
        </div>
    );
};
