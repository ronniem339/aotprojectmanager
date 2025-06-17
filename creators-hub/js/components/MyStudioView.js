window.MyStudioView = ({ settings, onSave, onBack }) => {
    const { useState, useEffect } = React;
    const [persona, setPersona] = useState('');
    const [styleGuide, setStyleGuide] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);

    useEffect(() => {
        setPersona(settings.creatorPersona || '');
        setStyleGuide(settings.creatorStyleGuide || '');
    }, [settings]);

    const handleSave = () => {
        onSave({
            ...settings,
            creatorPersona: persona,
            creatorStyleGuide: styleGuide
        });
    };
    
    const handleAnalyzeStyle = async () => {
        const apiKey = settings.geminiApiKey || "";
        if (!apiKey) {
            alert("Please set your Gemini API Key in the Technical Settings first.");
            return;
        }
        if (!persona && !styleGuide) {
            alert("Please provide some text in the persona or style guide fields to analyze.");
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        // Model selection logic using configurable names
        let model = settings.geminiFlashModelName || 'gemini-1.5-flash-latest';
        if (settings.useProModel && window.CREATOR_HUB_CONFIG.PRO_MODEL_TASKS.includes('analyzeStyle')) {
            model = settings.geminiProModelName || 'gemini-1.5-pro-latest';
        }

        const prompt = `
        Analyze the following creator profile and provide a summary of their style.

        **Creator Persona:**
        ${persona}

        **Creator Style Guide / Notes:**
        ${styleGuide}

        Based on the provided text, generate a JSON object that summarizes the creator's style. The JSON object should include:
        - "tone": A list of adjectives describing the tone (e.g., "Humorous", "Educational", "Inspirational").
        - "pacing": A description of the likely video pacing (e.g., "Fast-paced with quick cuts", "Calm and deliberate").
        - "language": A description of the language style (e.g., "Casual and conversational", "Formal and technical").
        - "audience": A description of the likely target audience.
        - "summary": A one-paragraph summary combining these elements.

        Return ONLY the JSON object.
        `;
        
        try {
            const payload = { 
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" } 
            };
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(payload) 
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
            }

            const result = await response.json();
            const jsonText = result.candidates[0].content.parts[0].text;
            setAnalysisResult(JSON.parse(jsonText));

        } catch (e) {
            console.error("Error analyzing style:", e);
            alert("Failed to analyze style. Check the console for more details.");
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="p-8">
            <button onClick={onBack} className="mb-6 text-sm hover:text-primary-accent flex items-center">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold mb-2">My Studio</h1>
            <p className="text-gray-400 mb-8">Define your creative identity. This information will be used by the AI to match your style.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <div className="mb-6">
                        <label htmlFor="creator-persona" className="block text-lg font-medium text-gray-300 mb-2">My Creator Persona</label>
                        <textarea
                            id="creator-persona"
                            rows="10"
                            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-primary-accent focus:border-primary-accent"
                            placeholder="Describe your on-screen personality. Are you funny, serious, an expert? What's your vibe? Paste in channel descriptions or video transcripts."
                            value={persona}
                            onChange={(e) => setPersona(e.target.value)}
                        ></textarea>
                    </div>
                    <div className="mb-6">
                        <label htmlFor="style-guide" className="block text-lg font-medium text-gray-300 mb-2">My Style Guide & Notes</label>
                        <textarea
                            id="style-guide"
                            rows="10"
                            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-primary-accent focus:border-primary-accent"
                            placeholder="Describe your editing style, common phrases you use, how you structure videos, topics you avoid, etc."
                            value={styleGuide}
                            onChange={(e) => setStyleGuide(e.target.value)}
                        ></textarea>
                    </div>
                </div>

                <div>
                    <h2 className="text-xl font-bold mb-4">AI Style Analysis</h2>
                    <button onClick={handleAnalyzeStyle} disabled={isLoading} className="btn-secondary w-full mb-4">
                        {isLoading ? 'Analyzing...' : 'Analyze My Style'}
                    </button>
                    {analysisResult && (
                        <div className="p-4 bg-gray-800 rounded-lg space-y-3">
                             <h3 className="text-lg font-semibold text-primary-accent">Analysis Summary</h3>
                             <p className="text-gray-300">{analysisResult.summary}</p>
                             <div>
                                <h4 className="font-semibold">Tone:</h4>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {analysisResult.tone.map(t => <span key={t} className="bg-gray-700 px-2 py-1 text-sm rounded">{t}</span>)}
                                </div>
                             </div>
                             <div>
                                 <h4 className="font-semibold">Pacing:</h4>
                                 <p className="text-gray-400">{analysisResult.pacing}</p>
                            </div>
                             <div>
                                 <h4 className="font-semibold">Language:</h4>
                                 <p className="text-gray-400">{analysisResult.language}</p>
                            </div>
                             <div>
                                 <h4 className="font-semibold">Target Audience:</h4>
                                 <p className="text-gray-400">{analysisResult.audience}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>


            <div className="mt-8 text-right">
                <button onClick={handleSave} className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors">
                    Save My Studio Settings
                </button>
            </div>
        </div>
    );
};
