window.ScriptPlanModal = ({ video, onSave, onClose, settings }) => {
    const { useState, useEffect } = React;
    const [plan, setPlan] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [refinementRequest, setRefinementRequest] = useState('');

    useEffect(() => {
        setPlan(video.scriptPlan || []);
    }, [video]);

    const handleGeneratePlan = async () => {
        setIsLoading(true);
        try {
            const result = await window.aiUtils.generateScriptPlanAI({
                video: video,
                scriptPlanKb: settings.knowledgeBases?.scriptPlan || '',
                apiKey: settings.geminiApiKey,
                useProModelSetting: settings.useProModel,
                flashModelName: settings.geminiFlashModelName,
                proModelName: settings.geminiProModelName
            });
            if (result.refinementPlan) {
                setPlan(result.refinementPlan);
            }
        } catch (error) {
            console.error("Failed to generate script plan:", error);
            alert("Failed to generate script plan. Check the console for details.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefinePlan = async () => {
        if (!refinementRequest.trim()) return;
        setIsLoading(true);
        try {
            const result = await window.aiUtils.refineScriptPlanAI({
                scriptPlan: plan,
                refinementRequests: refinementRequest,
                apiKey: settings.geminiApiKey,
                useProModelSetting: settings.useProModel,
                flashModelName: settings.geminiFlashModelName,
                proModelName: settings.geminiProModelName
            });
            if (result.refinedScriptPlan) {
                setPlan(result.refinedScriptPlan);
                setRefinementRequest('');
            }
        } catch (error) {
            console.error("Failed to refine script plan:", error);
            alert("Failed to refine script plan. Check the console for details.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveAndClose = () => {
        onSave({ ...video, scriptPlan: plan });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-700">
                    <h2 className="text-xl font-bold">Script Refinement Plan</h2>
                    <p className="text-sm text-gray-400">For video: {video.title}</p>
                </div>
                <div className="p-6 overflow-y-auto flex-grow space-y-4">
                    <button onClick={handleGeneratePlan} disabled={isLoading} className="btn-primary w-full">
                        {isLoading ? 'Generating...' : 'Generate New Plan with AI'}
                    </button>
                    
                    <div className="space-y-3">
                        {plan.map((item, index) => (
                            <div key={index} className="bg-gray-700 p-3 rounded-md">
                                <h4 className="font-bold text-primary-accent">{item.area}</h4>
                                <p className="text-gray-300">{item.suggestion}</p>
                            </div>
                        ))}
                         {plan.length === 0 && !isLoading && <p className="text-gray-400 text-center">No plan yet. Generate one to get started.</p>}
                    </div>

                    <div className="pt-4 border-t border-gray-700">
                        <label htmlFor="refinement-request" className="block text-sm font-medium mb-2">Refinement Request</label>
                        <textarea
                            id="refinement-request"
                            value={refinementRequest}
                            onChange={(e) => setRefinementRequest(e.target.value)}
                            rows="2"
                            className="form-textarea w-full bg-gray-700"
                            placeholder="e.g., 'Focus more on humor', 'Add a point about the location'"
                        ></textarea>
                        <button onClick={handleRefinePlan} disabled={isLoading || !refinementRequest.trim()} className="btn-secondary w-full mt-2">
                             {isLoading ? 'Refining...' : 'Refine Plan'}
                        </button>
                    </div>

                </div>
                <div className="p-6 bg-gray-900 flex justify-end space-x-4 rounded-b-lg">
                    <button onClick={onClose} className="btn-secondary">Cancel</button>
                    <button onClick={handleSaveAndClose} className="btn-primary">Save Plan</button>
                </div>
            </div>
        </div>
    );
};
