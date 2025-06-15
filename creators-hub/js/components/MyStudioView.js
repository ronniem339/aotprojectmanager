// js/components/MyStudioView.js

const MyStudioView = ({ settings, onSave, onBack }) => {
    const [styleInputs, setStyleInputs] = useState({
        myWriting: settings.myWriting || '',
        admiredWriting: settings.admiredWriting || '',
        keywords: settings.keywords || '',
        dosAndDonts: settings.dosAndDonts || '',
        excludedPhrases: settings.excludedPhrases || ''
    });
    const [styleGuideText, setStyleGuideText] = useState(settings.styleGuideText || '');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setStyleGuideText(settings.styleGuideText || '');
        setStyleInputs({
            myWriting: settings.myWriting || '',
            admiredWriting: settings.admiredWriting || '',
            keywords: settings.keywords || '',
            dosAndDonts: settings.dosAndDonts || '',
            excludedPhrases: settings.excludedPhrases || ''
        })
    }, [settings]);

    const handleAnalyzeStyle = async () => {
        const apiKey = settings.geminiApiKey || "";
        if (!apiKey) {
            // A more user-friendly notification would be better than an alert.
            console.error("Please set your Gemini API Key in Settings first.");
            return;
        }
        setIsLoading(true);
        const prompt = `Analyze the following inputs to define a detailed YouTube creator's style guide.
        1.  **My Writing Sample:** "${styleInputs.myWriting}"
        2.  **Admired Writing Sample:** "${styleInputs.admiredWriting}"
        3.  **Descriptive Keywords:** "${styleInputs.keywords}"
        4.  **Specific Dos and Don'ts:** "${styleInputs.dosAndDonts}"
        5.  **Excluded Phrases:** "${styleInputs.excludedPhrases}"

        Synthesize these inputs into a structured style guide covering: Tone, Pacing, Vocabulary, Sentence Structure, and Humor. Also include the explicit Dos/Don'ts and Excluded Phrases. Provide a detailed, actionable description for each category.`;
        try {
            const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) { const err = await response.json(); throw new Error(err?.error?.message || 'API Error'); }
            const result = await response.json();
            const generatedGuide = result.candidates[0].content.parts[0].text;
            setStyleGuideText(generatedGuide);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = () => {
        onSave({ ...settings, ...styleInputs, styleGuideText: styleGuideText });
    };

    return (
        <div className="p-8">
            <button onClick={onBack} className="flex items-center gap-2 text-secondary-accent hover:text-secondary-accent-light mb-6">
                ⬅️ Back to Dashboard
            </button>
            <h1 className="text-4xl font-bold mb-4">🎨 My Studio</h1>
            <p className="text-gray-400 mb-8">Train the AI on your unique creative style. The more detail you provide, the better the AI's suggestions will be.</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <h2 className="text-2xl font-semibold mb-4">Style Inputs</h2>
                    <div className="space-y-4">
                        <div><label className="block text-sm font-medium text-gray-300 mb-2">An example of your writing</label><textarea value={styleInputs.myWriting} onChange={(e) => setStyleInputs(p => ({ ...p, myWriting: e.target.value }))} rows="6" className="form-textarea" placeholder="Paste a sample of a previous script or blog post here..."></textarea></div>
                        <div><label className="block text-sm font-medium text-gray-300 mb-2">Writing you admire</label><textarea value={styleInputs.admiredWriting} onChange={(e) => setStyleInputs(p => ({ ...p, admiredWriting: e.target.value }))} rows="6" className="form-textarea" placeholder="Paste a sample from another creator or writer whose style you like..."></textarea></div>
                        <div><label className="block text-sm font-medium text-gray-300 mb-2">Keywords describing your style</label><input type="text" value={styleInputs.keywords} onChange={(e) => setStyleInputs(p => ({ ...p, keywords: e.target.value }))} className="form-input" placeholder="e.g., witty, cinematic, fast-paced, educational" /></div>
                        <div><label className="block text-sm font-medium text-gray-300 mb-2">Style Dos and Don'ts</label><textarea value={styleInputs.dosAndDonts} onChange={(e) => setStyleInputs(p => ({ ...p, dosAndDonts: e.target.value }))} rows="3" className="form-textarea" placeholder="e.g., DO use humor. DON'T be too formal."></textarea></div>
                        <div><label className="block text-sm font-medium text-gray-300 mb-2">Excluded Phrases & Words</label><textarea value={styleInputs.excludedPhrases} onChange={(e) => setStyleInputs(p => ({ ...p, excludedPhrases: e.target.value }))} rows="3" className="form-textarea" placeholder="e.g., synergy, circle back, at the end of the day"></textarea></div>
                        <button onClick={handleAnalyzeStyle} disabled={isLoading} className="w-full px-6 py-3 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold flex items-center justify-center gap-2 disabled:bg-gray-500">{isLoading ? <LoadingSpinner /> : '🧬 Analyze & Create Style Guide'}</button>
                    </div>
                </div>
                <div>
                    <h2 className="text-2xl font-semibold mb-4">Your AI-Powered Style Guide</h2>
                    <textarea value={styleGuideText} onChange={(e) => setStyleGuideText(e.target.value)} rows="32" className="form-textarea leading-relaxed" placeholder="Your generated style guide will appear here. You can edit it directly."></textarea>
                </div>
            </div>
            <div className="mt-8 text-right">
                <button onClick={handleSave} className="px-8 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors">Save My Style</button>
            </div>
        </div>
    );
};
