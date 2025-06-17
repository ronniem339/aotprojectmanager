window.EditVideoModal = ({ video, onSave, onClose, settings, onGenerateKeywords }) => {
    const { useState, useEffect } = React;
    const [localVideo, setLocalVideo] = useState(null);
    const [generating, setGenerating] = useState(null); // 'title', 'concept', or 'keywords'

    useEffect(() => {
        // Deep copy to avoid direct mutation
        if (video) {
            setLocalVideo(JSON.parse(JSON.stringify(video)));
        }
    }, [video]);

    const handleChange = (field, value) => {
        setLocalVideo(prev => ({ ...prev, [field]: value }));
    };
    
    const handleKeywordChange = (newKeywords) => {
        setLocalVideo(prev => ({...prev, keywords: newKeywords}));
    };

    const handleSave = () => {
        onSave(localVideo);
    };

    const handleRefine = async (type) => {
        setGenerating(type);
        const apiKey = settings.geminiApiKey || "";
        if (!apiKey) {
            alert("Please set your Gemini API key in Technical Settings.");
            setGenerating(null);
            return;
        }

        let model = settings.geminiFlashModelName || 'gemini-1.5-flash-latest';
        const taskType = type === 'title' ? 'refineVideoTitle' : 'refineVideoConcept';
        if (settings.useProModel && window.CREATOR_HUB_CONFIG.PRO_MODEL_TASKS.includes(taskType)) {
            model = settings.geminiProModelName || 'gemini-1.5-pro-latest';
        }

        let prompt = '';
        if (type === 'title') {
            prompt = `You are a YouTube expert. Refine the following video title to be more catchy, SEO-friendly, and intriguing. The video concept is: "${localVideo.concept}". The current title is: "${localVideo.title}". Return a JSON object with a single key "refinedText".`;
        } else {
            prompt = `You are a YouTube expert. Refine the following video concept to be clearer and more exciting. The video title is: "${localVideo.title}". The current concept is: "${localVideo.concept}". Return a JSON object with a single key "refinedText".`;
        }

        try {
            const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } };
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

            if (!response.ok) throw new Error(`API Error: ${await response.text()}`);

            const result = await response.json();
            const refinedText = JSON.parse(result.candidates[0].content.parts[0].text).refinedText;
            
            if (refinedText) {
                handleChange(type, refinedText);
            }
        } catch (error) {
            console.error(`Error refining ${type}:`, error);
            alert(`Failed to refine ${type}.`);
        } finally {
            setGenerating(null);
        }
    };

    const handleGenerateKeywords = async () => {
        setGenerating('keywords');
        try {
            const result = await window.aiUtils.generateKeywordsAI({
                videoTitle: localVideo.title,
                videoConcept: localVideo.concept,
                locations: localVideo.locations,
                apiKey: settings.geminiApiKey,
                useProModelSetting: settings.useProModel, // Pass the setting
                flashModelName: settings.geminiFlashModelName, // Pass the setting
                proModelName: settings.geminiProModelName // Pass the setting
            });
            if (result.keywords) {
                const combined = [...new Set([...(localVideo.keywords || []), ...result.keywords])];
                handleChange('keywords', combined);
            }
        } catch (e) {
            console.error("Error generating keywords:", e);
            alert("Failed to generate keywords.");
        } finally {
            setGenerating(null);
        }
    };

    if (!localVideo) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-700">
                    <h2 className="text-xl font-bold">Edit Video Details</h2>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                        <div className="flex items-center space-x-2">
                            <input type="text" value={localVideo.title} onChange={(e) => handleChange('title', e.target.value)} className="form-input w-full bg-gray-700"/>
                            <button onClick={() => handleRefine('title')} disabled={generating === 'title'} className="btn-secondary whitespace-nowrap">{generating === 'title' ? 'Refining...' : 'Refine AI'}</button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Concept</label>
                        <div className="flex items-center space-x-2">
                            <textarea value={localVideo.concept} onChange={(e) => handleChange('concept', e.target.value)} rows="3" className="form-textarea w-full bg-gray-700"></textarea>
                            <button onClick={() => handleRefine('concept')} disabled={generating === 'concept'} className="btn-secondary whitespace-nowrap self-start">{generating === 'concept' ? 'Refining...' : 'Refine AI'}</button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Keywords</label>
                        <div className="flex items-center space-x-2">
                           <window.common.EditableTagList tags={localVideo.keywords || []} onTagsChange={(newTags) => handleChange('keywords', newTags)} />
                           <button onClick={handleGenerateKeywords} disabled={generating === 'keywords'} className="btn-secondary whitespace-nowrap self-start">{generating === 'keywords' ? 'Generating...' : 'Generate AI'}</button>
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Script</label>
                        <textarea value={localVideo.script || ''} onChange={(e) => handleChange('script', e.target.value)} rows="10" className="form-textarea w-full bg-gray-700 font-mono text-sm"></textarea>
                    </div>
                </div>
                <div className="p-6 bg-gray-900 flex justify-end space-x-4 rounded-b-lg">
                    <button onClick={onClose} className="btn-secondary">Cancel</button>
                    <button onClick={handleSave} className="btn-primary">Save Changes</button>
                </div>
            </div>
        </div>
    );
};
