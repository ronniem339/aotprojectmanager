// WRITE to file: ./creators-hub/js/components/ProjectView/tasks/ScriptingV2/Step3_NarrativeRefiner.js

const { useState: useState3, useEffect: useEffect3, useRef: useRef3 } = React; // Use aliases to avoid redeclaration errors

window.Step3_NarrativeRefiner = () => {
    // --- ANTI-PROP-DRILLING PATTERN ---
    const { video, settings, handlers } = window.useAppState();
    const blueprint = video?.tasks?.scriptingV2_blueprint || {};
    // ------------------------------------

    const [feedbackText, setFeedbackText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    
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
                args: { 
                    narrativeProposals,
                    userFeedback: feedbackText,
                    settings 
                }
            });

            if (!newProposal) throw new Error("AI did not return a refined proposal.");

            const newBlueprint = {
                ...blueprint,
                narrativeProposals: [...narrativeProposals, newProposal]
            };
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
                args: { 
                    approvedNarrative: latestProposal, 
                    settings 
                }
            });

            if (!researchResults) throw new Error("AI did not return any research notes.");
            
            // Set all research items to be approved by default
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
            return React.createElement('p', { className: 'text-gray-400 text-center p-4' }, 'Generating initial narrative proposal...');
        }

        const narrativeArcItems = (latestProposal.narrativeArc || []).map((item, index) => 
            React.createElement('li', { key: index, className: 'mb-1' }, 
                React.createElement('strong', { className: 'text-white' }, `${item.step}: `),
                React.createElement('span', { className: 'text-gray-300' }, item.description)
            )
        );

        const researchItems = (latestProposal.valueAddResearch || []).map((item, index) => 
            React.createElement('li', { key: index, className: 'text-gray-300' }, item)
        );

        return React.createElement('div', { className: 'bg-gray-800/70 p-4 rounded-lg border border-gray-700' },
            React.createElement('h3', { className: 'font-bold text-lg text-primary-accent mb-2' }, 'Proposed Angle:'),
            React.createElement('p', { className: 'text-gray-300 mb-4' }, latestProposal.coreAngle),

            React.createElement('h3', { className: 'font-bold text-lg text-primary-accent mb-2' }, 'Narrative Arc:'),
            React.createElement('ul', { className: 'list-disc list-inside mb-4 pl-2' }, ...narrativeArcItems),

            React.createElement('h3', { className: 'font-bold text-lg text-primary-accent mb-2' }, 'Proposed Research Topics:'),
            React.createElement('ul', { className: 'list-disc list-inside pl-2' }, ...researchItems)
        );
    };

    return React.createElement('div', { className: 'p-4 border border-gray-700 rounded-lg' },
        React.createElement('h2', { className: 'text-xl font-bold text-white mb-3' }, "Step 3: Shape the Narrative"),
        React.createElement('p', { className: 'mb-4 text-gray-400' }, "Review the AI's proposed story. Provide feedback to refine it, or approve it to continue."),
        
        latestProposal ? renderProposal() : React.createElement('div', {className: 'text-center p-8'}, React.createElement(window.LoadingSpinner)),

        latestProposal && React.createElement('div', { className: 'mt-4' },
            React.createElement('h3', { className: 'font-bold text-lg text-white mb-2' }, 'Your Feedback'),
            React.createElement('textarea', {
                className: 'w-full h-24 p-2 border border-gray-600 rounded bg-gray-900 text-white',
                value: feedbackText,
                onChange: (e) => setFeedbackText(e.target.value),
                placeholder: 'e.g., "I like the angle, but for Belém Tower, let\'s focus on a different story..."',
                disabled: isProcessing
            }),
            React.createElement('div', { className: 'mt-4 flex justify-between items-center' },
                 React.createElement('button', {
                    onClick: handleRefine,
                    disabled: !feedbackText.trim() || isProcessing,
                    className: 'btn btn-secondary disabled:opacity-50'
                }, isProcessing ? '🤖 Revising...' : 'Request Revision'),
                React.createElement('button', {
                    onClick: handleApprove,
                    disabled: isProcessing,
                    className: 'btn btn-primary disabled:opacity-50'
                }, isProcessing ? '🤖 Researching...' : '✅ Approve & Conduct Research')
            )
        )
    );
};
