// js/components/KnowledgeBaseView.js

window.KnowledgeBaseView = ({ settings, onSave, onBack }) => {
    const [localKnowledgeBase, setLocalKnowledgeBase] = useState(settings.youtubeSeoKnowledgeBase || '');

    useEffect(() => {
        setLocalKnowledgeBase(settings.youtubeSeoKnowledgeBase || '');
    }, [settings.youtubeSeoKnowledgeBase]);

    const handleSave = () => {
        // When saving, we update the youtubeSeoKnowledgeBase field within the settings object
        onSave({ ...settings, youtubeSeoKnowledgeBase: localKnowledgeBase });
    };

    const handleChange = (e) => {
        setLocalKnowledgeBase(e.target.value);
    };

    return (
        <div className="p-8">
            <button onClick={onBack} className="flex items-center gap-2 text-secondary-accent hover:text-secondary-accent-light mb-6">
                ⬅️ Back to Dashboard
            </button>
            <h1 className="text-4xl font-bold mb-4">📚 Knowledge Bases</h1>
            <p className="text-gray-400 mb-8">Manage the AI's knowledge for content generation.</p>
            <div className="space-y-6 max-w-2xl">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">YouTube SEO Best Practices</label>
                    <p className="text-xs text-gray-400 mb-2">Customize the SEO best practices the AI uses for video metadata generation. If you leave this blank, it will use the default system knowledge base.</p>
                     <textarea
                        name="youtubeSeoKnowledgeBase"
                        value={localKnowledgeBase}
                        onChange={handleChange}
                        rows="15"
                        className="w-full form-textarea leading-relaxed"
                        placeholder="Provide detailed information about YouTube SEO best practices..."
                    />
                </div>
                {/* You can add more knowledge bases here later */}
            </div>
            <div className="mt-8 text-right max-w-2xl">
                <button onClick={handleSave} className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors">
                    Save Knowledge Base
                </button>
            </div>
        </div>
    );
};
