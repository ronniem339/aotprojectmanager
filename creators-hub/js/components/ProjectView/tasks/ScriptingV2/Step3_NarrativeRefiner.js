const { useState: useState3, useEffect: useEffect3 } = React;

window.Step3_NarrativeRefiner = ({ video, settings, handlers }) => {
    const blueprint = video?.tasks?.scriptingV2_blueprint || {};
    const [feedbackText, setFeedbackText] = useState3('');
    const [isProcessing, setIsProcessing] = useState3(false);
    
    const narrativeProposals = blueprint.narrativeProposals || [];
    const latestProposal = narrativeProposals.length > 0 ? narrativeProposals[narrativeProposals.length - 1] : null;

    const handleRefine = async () => {
        if (!feedbackText.trim()) {
            handlers.displayNotification("Feedback cannot be empty.", 'warning');
            return;
        }
        setIsProcessing(true);
        const taskId = `scriptingV2-refine-narrative-${video.id}-${Date.now()}`;
        try {
            const newProposal = await handlers.triggerAiTask({
                id: taskId,
                type: 'scriptingV2-refine-narrative',
                name: 'Refining Story Narrative',
                intensity: 'medium',
                aiFunction: window.aiUtils.refineNarrativeAI,
                args: { narrativeProposals, userFeedback: feedbackText, settings }
            });
            if (!newProposal) throw new Error("AI did not return a refined proposal.");
            const newBlueprint = { ...blueprint, narrativeProposals: [...narrativeProposals, newProposal] };
            handlers.updateVideo(video.id, { tasks: { ...video.tasks, scriptingV2_blueprint: newBlueprint } });
            setFeedbackText('');
        } catch (error) {
            handlers.displayNotification(`Error refining narrative: ${error.message}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleApprove = async () => {
        setIsProcessing(true);
        const taskId = `scriptingV2-conduct-research-${video.id}-${Date.now()}`;
        try {
            const researchResults = await handlers.triggerAiTask({
                id: taskId,
                type: 'scriptingV2-conduct-research',
                name: 'Conducting Research',
                intensity: 'medium',
                aiFunction: window.aiUtils.conductResearchAI,
                args: { approvedNarrative: latestProposal, settings }
            });
            if (!researchResults) throw new Error("AI did not return any research notes.");
            const approvedResearch = {};
            Object.keys(researchResults).forEach(locationTag => {
                approvedResearch[locationTag] = researchResults[locationTag].map(note => ({ ...note, approved: true }));
            });
            const newBlueprint = {
                ...blueprint,
                approvedNarrative: latestProposal,
                researchNotes: approvedResearch,
                workflowStatus: 'research_approval'
            };
            handlers.updateVideo(video.id, { tasks: { ...video.tasks, scriptingV2_blueprint: newBlueprint } });
        } catch (error) {
            handlers.displayNotification(`Error conducting research: ${error.message}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const renderProposal = () => {
        if (!latestProposal) {
            return <div className="text-center p-8"><window.LoadingSpinner /></div>;
        }
        return (
            <div className="bg-gray-800/70 p-4 rounded-lg border border-gray-700">
                <h3 className="font-bold text-lg text-primary-accent mb-2">Proposed Angle:</h3>
                <p className="text-gray-300 mb-4">{latestProposal.coreAngle}</p>
                <h3 className="font-bold text-lg text-primary-accent mb-2">Narrative Arc:</h3>
                <ul className="list-disc list-inside mb-4 pl-2">
                    {(latestProposal.narrativeArc || []).map((item, index) => (
                        <li key={index} className="mb-1">
                            <strong className="text-white">{item.step}: </strong>
                            <span className="text-gray-300">{item.description}</span>
                        </li>
                    ))}
                </ul>
                <h3 className="font-bold text-lg text-primary-accent mb-2">Proposed Research Topics:</h3>
                <ul className="list-disc list-inside pl-2">
                    {(latestProposal.valueAddResearch || []).map((item, index) => <li key={index} className="text-gray-300">{item}</li>)}
                </ul>
            </div>
        );
    };

    return (
        <div className="p-4 border border-gray-700 rounded-lg">
            <h2 className="text-xl font-bold text-white mb-3">Step 3: Shape the Narrative</h2>
            <p className="mb-4 text-gray-400">Review the AI's proposed story. Provide feedback to refine it, or approve it to continue.</p>
            {renderProposal()}
            {latestProposal && (
                <div className="mt-4">
                    <h3 className="font-bold text-lg text-white mb-2">Your Feedback</h3>
                    <textarea
                        className="w-full h-24 p-2 border border-gray-600 rounded bg-gray-900 text-white"
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="e.g., 'I like the angle, but for Belém Tower, let's focus on a different story...'"
                        disabled={isProcessing}
                    />
                    <div className="mt-4 flex justify-between items-center">
                        <button onClick={handleRefine} disabled={!feedbackText.trim() || isProcessing} className="btn btn-secondary disabled:opacity-50">
                            {isProcessing ? '🤖 Revising...' : 'Request Revision'}
                        </button>
                        <button onClick={handleApprove} disabled={isProcessing} className="btn btn-primary disabled:opacity-50">
                            {isProcessing ? '🤖 Researching...' : '✅ Approve & Conduct Research'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
