window.EditProjectModal = ({ project, onSave, onClose, settings }) => {
    const { useState, useEffect } = React;
    const [name, setName] = useState('');
    const [concept, setConcept] = useState('');
    const [generating, setGenerating] = useState(null); // 'title' or 'concept'

    useEffect(() => {
        if (project) {
            setName(project.name || '');
            setConcept(project.concept || '');
        }
    }, [project]);

    const handleSave = () => {
        onSave({ ...project, name, concept });
    };

    const handleRefine = async (type) => {
        setGenerating(type);
        const apiKey = settings.geminiApiKey || "";
        if (!apiKey) {
            alert("Please set your Gemini API key in Technical Settings.");
            setGenerating(null);
            return;
        }

        // Model selection logic using configurable names
        let model = settings.geminiFlashModelName || 'gemini-1.5-flash-latest';
        const taskType = type === 'title' ? 'refineProjectTitle' : 'refineProjectDescription'; // Define specific task types
        if (settings.useProModel && window.CREATOR_HUB_CONFIG.PRO_MODEL_TASKS.includes(taskType)) {
            model = settings.geminiProModelName || 'gemini-1.5-pro-latest';
        }


        let prompt = '';
        if (type === 'title') {
            prompt = `You are a YouTube expert. Refine the following video series title to be more catchy, SEO-friendly, and intriguing. The project concept is: "${concept}". The current title is: "${name}". Return a JSON object with a single key "refinedText".`;
        } else {
            prompt = `You are a YouTube expert. Refine the following project concept to be clearer, more exciting, and better define the value for the viewer. The project title is: "${name}". The current concept is: "${concept}". Return a JSON object with a single key "refinedText".`;
        }

        try {
            const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } };
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            
            if (!response.ok) {
                 const errorBody = await response.text();
                 throw new Error(`API Error: ${errorBody}`);
            }

            const result = await response.json();
            const refinedText = JSON.parse(result.candidates[0].content.parts[0].text).refinedText;
            
            if (refinedText) {
                if (type === 'title') {
                    setName(refinedText);
                } else {
                    setConcept(refinedText);
                }
            }

        } catch (error) {
            console.error(`Error refining ${type}:`, error);
            alert(`Failed to refine ${type}. Check console for details.`);
        } finally {
            setGenerating(null);
        }
    };


    if (!project) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl">
                <div className="p-6 border-b border-gray-700">
                    <h2 className="text-xl font-bold">Edit Project Details</h2>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label htmlFor="projectName" className="block text-sm font-medium text-gray-300 mb-2">Project Name</label>
                        <div className="flex items-center space-x-2">
                            <input
                                id="projectName"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="form-input w-full bg-gray-700"
                            />
                             <button onClick={() => handleRefine('title')} disabled={generating === 'title'} className="btn-secondary whitespace-nowrap">
                                {generating === 'title' ? 'Refining...' : 'Refine with AI'}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="projectConcept" className="block text-sm font-medium text-gray-300 mb-2">Project Concept</label>
                         <div className="flex items-center space-x-2">
                            <textarea
                                id="projectConcept"
                                value={concept}
                                onChange={(e) => setConcept(e.target.value)}
                                rows="4"
                                className="form-textarea w-full bg-gray-700"
                            ></textarea>
                            <button onClick={() => handleRefine('concept')} disabled={generating === 'concept'} className="btn-secondary whitespace-nowrap self-start">
                                {generating === 'concept' ? 'Refining...' : 'Refine with AI'}
                            </button>
                        </div>
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
