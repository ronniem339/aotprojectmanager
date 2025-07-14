// REPLACE THE ENTIRE FILE: ScriptingV2_Workspace.js

const {
    Step1_TranscriptInput,
    Step2_DialogueMapper,
    Step3_NarrativeRefiner,
    Step4_ResearchApproval,
    Step5_DraftReviewer,
    LegacyScriptView,
    BlueprintStepper,
    TaskQueue // Import TaskQueue
} = window;

const ScriptingV2_Workspace = () => {
    const { video, handlers, taskQueue } = window.useAppState(); // Get handlers and taskQueue
    const blueprint = video?.tasks?.scriptingV2_blueprint || {};

    const getWorkflowStatus = () => {
        if (blueprint.workflowStatus) return blueprint.workflowStatus;
        if (blueprint.final_script || blueprint.full_video_script_text) return 'legacy_view';
        return 'transcript_input';
    };

    const status = getWorkflowStatus();

    const steps = [
        { id: 'transcript_input', name: 'Transcript' },
        { id: 'dialogue_mapping', name: 'Dialogue Map' },
        { id: 'narrative_refinement', name: 'Narrative' },
        { id: 'research_approval', name: 'Research' },
        { id: 'draft_review', name: 'Review Script' },
        { id: 'final', name: 'Complete' }
    ];

    const currentStepIndex = steps.findIndex(s => s.id === status);

    const renderStepComponent = () => {
        switch (status) {
            case 'transcript_input': return React.createElement(Step1_TranscriptInput);
            case 'dialogue_mapping': return React.createElement(Step2_DialogueMapper);
            case 'narrative_refinement': return React.createElement(Step3_NarrativeRefiner);
            case 'research_approval': return React.createElement(Step4_ResearchApproval);
            case 'draft_review': return React.createElement(Step5_DraftReviewer);
            case 'legacy_view': return React.createElement(LegacyScriptView);
            case 'final': return React.createElement('div', { className: 'text-center p-8' },
                                React.createElement('h2', { className: 'text-2xl font-bold text-green-400' }, 'Script Complete!'),
                                React.createElement('p', { className: 'text-gray-400 mt-2' }, 'You can now view the final script in the project details.')
                             );
            default: return React.createElement(Step1_TranscriptInput);
        }
    };

    // We don't show the stepper for the legacy view
    if (status === 'legacy_view') {
        return React.createElement('div', { className: 'scripting-v2-workspace' },
            renderStepComponent(),
            // TaskQueue for legacy view also
            React.createElement(TaskQueue, {
                tasks: taskQueue,
                onView: handlers.handleViewGeneratedPost,
                onRetry: handlers.handleRetryTask,
                onNavigateToTask: handlers.handleNavigateToTask
            })
        );
    }

    return React.createElement('div', { className: 'scripting-v2-workspace' },
        React.createElement(BlueprintStepper, { steps, currentStepIndex }),
        React.createElement('div', { className: 'mt-6' }, renderStepComponent()),
        // Add TaskQueue here as well for the V2 workflow
        React.createElement(TaskQueue, {
            tasks: taskQueue,
            onView: handlers.handleViewGeneratedPost,
            onRetry: handlers.handleRetryTask,
            onNavigateToTask: handlers.handleNavigateToTask
        })
    );
};
