// js/components/MyStudioView.js

const { useState, useEffect } = React;

window.MyStudioView = ({ settings, onSave, onBack }) => {
    // Initialize the state directly from the settings prop, providing a fallback for each value.
    const [styleInputs, setStyleInputs] = useState({
        myWriting: settings.myWriting || '',
        admiredWriting: settings.admiredWriting || '',
        keywords: settings.keywords || '',
        dosAndDonts: settings.dosAndDonts || '',
        excludedPhrases: settings.excludedPhrases || ''
    });
    
    const [styleGuideText, setStyleGuideText] = useState(settings.knowledgeBases?.creator?.styleGuideText || '');
    const [styleGuideLog, setStyleGuideLog] = useState(settings.knowledgeBases?.creator?.styleGuideLog || []);
    
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // This effect syncs the component if the 'settings' prop itself is replaced.
        setStyleGuideText(settings.knowledgeBases?.creator?.styleGuideText || '');
        setStyleGuideLog(settings.knowledgeBases?.creator?.styleGuideLog || []);
        setStyleInputs({
            myWriting: settings.myWriting || '',
            admiredWriting: settings.admiredWriting || '',
            keywords: settings.keywords || '',
            dosAndDonts: settings.dosAndDonts || '',
            excludedPhrases: settings.excludedPhrases || ''
        });
    }, [settings]);

    const handleAnalyzeStyle = async () => {
        setIsLoading(true);
        const whoAmIKb = settings.knowledgeBases?.creator?.whoAmI || '';

        const prompt = `Analyze the following inputs to define a detailed YouTube creator's style guide.
        
        ${whoAmIKb ? `User Persona (Who Am I): "${whoAmIKb}"` : ''}

        1.  **My Writing Sample:** "${styleInputs.myWriting}"
        2.  **Admired Writing Sample:** "${styleInputs.admiredWriting}"
        3.  **Descriptive Keywords:** "${styleInputs.keywords}"
        4.  **Specific Dos and Don'ts:** "${styleInputs.dosAndDonts}"
        5.  **Excluded Phrases:** "${styleInputs.excludedPhrases}"

        Synthesize these inputs into a structured style guide covering: Tone, Pacing, Vocabulary, Sentence Structure, and Humor. Also include the explicit Dos/Don'ts and Excluded Phrases. Provide a detailed, actionable description for each category.`;
        
        try {
            const generatedGuide = await window.aiUtils.callGeminiAPI(prompt, settings, { responseMimeType: "text/plain" });
            setStyleGuideText(generatedGuide);
        } catch (e) {
            console.error("Error generating style guide:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = () => {
        // --- FINAL FIX START ---
        // The previous version was missing styleGuideLog in the object being saved.
        // This ensures that when you save changes on this page, the existing log is not erased.
        const updatedSettings = {
            ...settings,
            ...styleInputs,
            knowledgeBases: {
                ...settings.knowledgeBases,
                creator: {
                    ...settings.knowledgeBases?.creator,
                    styleGuideText: styleGuideText,
                    styleGuideLog: styleGuideLog // This line is critical
                }
            }
        };
        // --- FINAL FIX END ---
        onSave(updatedSettings);
    };

    // Correctly get the log for rendering, ensuring it's always an array
    const refinementLog = settings.knowledgeBases?.creator?.styleGuideLog || [];

    return (
        <div className="p-4 sm:p-8">
            <button onClick={onBack} className="flex items-center gap-2 text-secondary-accent hover:text-secondary-accent-light mb-6">
                ⬅️ Back to Settings Menu
            </button>
            <h1 className="text-3xl sm:text-4xl font-bold mb-4">🎨 Style & Tone</h1>
            <p className="text-gray-400 mb-8">Train the AI on your unique creative style. The more detail you provide, the better the AI's suggestions will be.</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Column 1: Style Inputs */}
                <div>
                    <h2 className="text-2xl font-semibold mb-4">Style Inputs</h2>
                    <div className="space-y-4">
                        <div><label className="block text-sm font-medium text-gray-300 mb-2">An example of your writing</label><textarea value={styleInputs.myWriting} onChange={(e) => setStyleInputs(p => ({ ...p, myWriting: e.target.value }))} rows="6" className="form-textarea" placeholder="Paste a sample of a previous script or blog post here..."></textarea></div>
                        <div><label className="block text-sm font-medium text-gray-300 mb-2">Writing you admire</label><textarea value={styleInputs.admiredWriting} onChange={(e) => setStyleInputs(p => ({ ...p, admiredWriting: e.target.value }))} rows="6" className="form-textarea" placeholder="Paste a sample from another creator or writer whose style you like..."></textarea></div>
                        <div><label className="block text-sm font-medium text-gray-300 mb-2">Keywords describing your style</label><input type="text" value={styleInputs.keywords} onChange={(e) => setStyleInputs(p => ({ ...p, keywords: e.target.value }))} className="form-input" placeholder="e.g., witty, cinematic, fast-paced, educational" /></div>
                        <div><label className="block text-sm font-medium text-gray-300 mb-2">Style Dos and Don'ts</label><textarea value={styleInputs.dosAndDonts} onChange={(e) => setStyleInputs(p => ({ ...p, dosAndDonts: e.target.value }))} rows="3" className="form-textarea" placeholder="e.g., DO use humor. DON'T be too formal."></textarea></div>
                        <div><label className="block text-sm font-medium text-gray-300 mb-2">Excluded Phrases & Words</label><textarea value={styleInputs.excludedPhrases} onChange={(e) => setStyleInputs(p => ({ ...p, excludedPhrases: e.target.value }))} rows="3" className="form-textarea" placeholder="e.g., synergy, circle back, at the end of the day"></textarea></div>
                        <button onClick={handleAnalyzeStyle} disabled={isLoading} className="w-full px-6 py-3 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold flex items-center justify-center gap-2 disabled:bg-gray-500">{isLoading ? <window.LoadingSpinner isButton={true} /> : '🧬 Analyze & Create Style Guide'}</button>
                    </div>
                </div>

                {/* Column 2: Style Guide and new Refinement History */}
                <div>
                    <h2 className="text-2xl font-semibold mb-4">Your AI-Powered Style Guide</h2>
                    <textarea value={styleGuideText} onChange={(e) => setStyleGuideText(e.target.value)} rows="20" className="form-textarea leading-relaxed" placeholder="Your generated style guide will appear here. You can edit it directly."></textarea>
                    
                    <div className="mt-6">
                        <h3 className="text-xl font-semibold mb-3">Refinement History</h3>
                        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 h-48 overflow-y-auto">
                            {refinementLog.length > 0 ? (
                                <ul className="space-y-3">
                                    {refinementLog.map((entry, index) => (
                                        <li key={index} className="text-gray-300 text-sm border-b border-gray-700 pb-3 last:border-b-0">
                                            <span className="block font-semibold text-gray-400 text-xs">
                                                {new Date(entry.date).toLocaleDateString()}
                                            </span>
                                            <p className="mt-1">{entry.change}</p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-400 text-sm italic">No refinement history yet. Your feedback from the script editor's "Refine Script" button will appear here.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 text-right">
                <button onClick={handleSave} className="px-8 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors">Save My Style</button>
            </div>
        </div>
    );
};
