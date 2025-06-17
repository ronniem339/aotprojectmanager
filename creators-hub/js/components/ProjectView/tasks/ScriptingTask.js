window.ScriptingTask = ({ video, onUpdate, onCompletion, settings }) => {
    const { useState, useEffect } = React;
    const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
    const [script, setScript] = useState('');
    
    useEffect(() => {
        setScript(video.script || '');
    }, [video.script]);
    
    const handleSaveScript = (newScript, newPlan) => {
        setScript(newScript);
        onUpdate({ ...video, script: newScript, scriptPlan: newPlan });
    };

    const handleComplete = () => {
        onCompletion(video.id, 'scripting', { script });
    };


    return (
        <div className="bg-gray-800 p-4 rounded-lg space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">Scripting</h3>
                <button onClick={() => setIsWorkspaceOpen(true)} className="btn-secondary btn-sm">Open Workspace</button>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Current Script</label>
                <pre className="text-sm bg-gray-900 p-2 rounded-md whitespace-pre-wrap max-h-48 overflow-y-auto font-mono">
                    {script || "No script yet. Open the workspace to get started."}
                </pre>
            </div>
            <button onClick={handleComplete} className="btn-primary w-full">Mark as Complete</button>
            
            {isWorkspaceOpen && (
                <window.ScriptingWorkspaceModal
                    video={video}
                    settings={settings}
                    onClose={() => setIsWorkspaceOpen(false)}
                    onSave={handleSaveScript}
                />
            )}
        </div>
    );
};


window.ScriptingWorkspaceModal = ({ video, settings, onClose, onSave }) => {
    const { useState, useEffect } = React;
    const [activeTab, setActiveTab] = useState('script'); // script, outline, plan
    const [localScript, setLocalScript] = useState('');
    const [draftOutline, setDraftOutline] = useState(null);
    const [refinementPlan, setRefinementPlan] = useState([]);
    const [isLoading, setIsLoading] = useState(null); // 'outline', 'plan', 'full-script', 'refine-script', 'refine-plan'
    const [thoughts, setThoughts] = useState('');
    const [refinementRequest, setRefinementRequest] = useState('');


    useEffect(() => {
        setLocalScript(video.script || '');
        setRefinementPlan(video.scriptPlan || []);
        setDraftOutline(video.draftOutline || null);
    }, [video]);
    
     const knowledgeBases = settings.knowledgeBases || {};


    const handleGenerateDraftOutline = async () => {
        setIsLoading('outline');
        try {
            const result = await window.aiUtils.generateDraftOutlineAI({
                videoTitle: video.title,
                videoConcept: video.concept,
                initialThoughts: thoughts,
                apiKey: settings.geminiApiKey,
                useProModelSetting: settings.useProModel,
                flashModelName: settings.geminiFlashModelName,
                proModelName: settings.geminiProModelName
            });
            setDraftOutline(result.draftOutline);
        } catch(e) { console.error(e); alert("Failed to generate outline."); }
        finally { setIsLoading(null); }
    };

    const handleGenerateRefinementPlan = async () => {
        setIsLoading('plan');
        try {
             const result = await window.aiUtils.generateScriptPlanAI({
                video,
                scriptPlanKb: knowledgeBases.scriptPlan,
                apiKey: settings.geminiApiKey,
                useProModelSetting: settings.useProModel,
                flashModelName: settings.geminiFlashModelName,
                proModelName: settings.geminiProModelName
            });
            setRefinementPlan(result.refinementPlan);
        } catch(e) { console.error(e); alert("Failed to generate plan."); }
        finally { setIsLoading(null); }
    };
    
    const handleGenerateFullScript = async () => {
        setIsLoading('full-script');
        try {
            const result = await window.aiUtils.generateFullScriptAI({
                video,
                draftOutline,
                fullScriptKb: knowledgeBases.fullScript,
                apiKey: settings.geminiApiKey,
                useProModelSetting: settings.useProModel,
                flashModelName: settings.geminiFlashModelName,
                proModelName: settings.geminiProModelName
            });
            setLocalScript(result.fullScript);
            setActiveTab('script');
        } catch(e) { console.error(e); alert("Failed to generate script."); }
        finally { setIsLoading(null); }
    };

    const handleRefineScript = async () => {
        setIsLoading('refine-script');
        try {
            const result = await window.aiUtils.refineScriptAI({
                script: localScript,
                refinementRequests: refinementRequest,
                apiKey: settings.geminiApiKey,
                useProModelSetting: settings.useProModel,
                flashModelName: settings.geminiFlashModelName,
                proModelName: settings.geminiProModelName
            });
            setLocalScript(result.refinedScript);
            setRefinementRequest('');
        } catch(e) { console.error(e); alert("Failed to refine script."); }
        finally { setIsLoading(null); }
    };
    
    const handleRefineScriptPlan = async () => {
        setIsLoading('refine-plan');
        try {
             const result = await window.aiUtils.refineScriptPlanAI({
                scriptPlan: refinementPlan,
                refinementRequests: refinementRequest,
                apiKey: settings.geminiApiKey,
                useProModelSetting: settings.useProModel,
                flashModelName: settings.geminiFlashModelName,
                proModelName: settings.geminiProModelName
            });
            setRefinementPlan(result.refinedScriptPlan);
            setRefinementRequest('');
        } catch(e) { console.error(e); alert("Failed to refine plan."); }
        finally { setIsLoading(null); }
    };


    const handleSaveAndClose = () => {
        onSave(localScript, refinementPlan);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col">
                <div className="p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold">Scripting Workspace: {video.title}</h2>
                </div>
                <div className="flex-grow flex">
                    {/* Left Panel for AI tools */}
                    <div className="w-1/3 bg-gray-900 p-4 space-y-4 overflow-y-auto">
                        <div>
                            <h4 className="font-bold mb-2">1. Generate Outline</h4>
                            <textarea value={thoughts} onChange={e => setThoughts(e.target.value)} rows="4" className="form-textarea w-full" placeholder="Your initial ideas, research, keywords..."></textarea>
                            <button onClick={handleGenerateDraftOutline} disabled={isLoading} className="btn-secondary w-full mt-2">
                                {isLoading === 'outline' ? 'Generating...' : 'Generate Outline'}
                            </button>
                        </div>
                        <div>
                            <h4 className="font-bold mb-2">2. Generate Refinement Plan</h4>
                             <button onClick={handleGenerateRefinementPlan} disabled={isLoading} className="btn-secondary w-full">
                                {isLoading === 'plan' ? 'Generating...' : 'Generate Plan'}
                            </button>
                        </div>
                        <div>
                            <h4 className="font-bold mb-2">3. Generate Full Script</h4>
                            <button onClick={handleGenerateFullScript} disabled={!draftOutline || isLoading} className="btn-secondary w-full">
                                {isLoading === 'full-script' ? 'Generating...' : 'Generate Script from Outline'}
                            </button>
                        </div>
                         <div className="pt-4 border-t border-gray-700">
                            <h4 className="font-bold mb-2">Refine Existing Content</h4>
                            <textarea value={refinementRequest} onChange={e => setRefinementRequest(e.target.value)} rows="3" className="form-textarea w-full" placeholder="e.g., 'Make the hook shorter', 'Change the CTA'"></textarea>
                            <div className="flex space-x-2 mt-2">
                                <button onClick={handleRefineScript} disabled={isLoading || !localScript} className="btn-secondary w-full text-sm">
                                    {isLoading === 'refine-script' ? '...' : 'Refine Script'}
                                </button>
                                <button onClick={handleRefineScriptPlan} disabled={isLoading || !refinementPlan?.length} className="btn-secondary w-full text-sm">
                                    {isLoading === 'refine-plan' ? '...' : 'Refine Plan'}
                                </button>
                            </div>
                        </div>
                    </div>
                    {/* Right Panel for Content */}
                    <div className="w-2/3 p-4 flex flex-col">
                        <div className="border-b border-gray-700 mb-2">
                            <nav className="flex space-x-4">
                                <button onClick={() => setActiveTab('script')} className={`py-2 px-4 ${activeTab === 'script' ? 'border-b-2 border-primary-accent text-white' : 'text-gray-400'}`}>Script</button>
                                <button onClick={() => setActiveTab('outline')} className={`py-2 px-4 ${activeTab === 'outline' ? 'border-b-2 border-primary-accent text-white' : 'text-gray-400'}`}>Outline</button>
                                <button onClick={() => setActiveTab('plan')} className={`py-2 px-4 ${activeTab === 'plan' ? 'border-b-2 border-primary-accent text-white' : 'text-gray-400'}`}>Plan</button>
                            </nav>
                        </div>
                        <div className="flex-grow overflow-y-auto">
                            {activeTab === 'script' && <textarea value={localScript} onChange={e => setLocalScript(e.target.value)} className="w-full h-full form-textarea bg-gray-800 border-none font-mono text-sm focus:ring-0"></textarea>}
                            {activeTab === 'outline' && <pre className="whitespace-pre-wrap text-sm">{draftOutline ? JSON.stringify(draftOutline, null, 2) : "No outline generated yet."}</pre>}
                            {activeTab === 'plan' && <pre className="whitespace-pre-wrap text-sm">{refinementPlan?.length ? JSON.stringify(refinementPlan, null, 2) : "No plan generated yet."}</pre>}
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-900 flex justify-end space-x-4 rounded-b-lg">
                    <button onClick={onClose} className="btn-secondary">Cancel</button>
                    <button onClick={handleSaveAndClose} className="btn-primary">Save & Close</button>
                </div>
            </div>
        </div>
    );
}
