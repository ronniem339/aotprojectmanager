window.ScriptingV2_Workspace = ({ video, settings, handlers, project }) => {
    const blueprint = video?.tasks?.scriptingV2_blueprint || {};

    const getHighestStepIndex = (bp) => {
        if (!bp) return 0;
        let highestIndex = 0;
        if (bp.dialogueMap) highestIndex = Math.max(highestIndex, 1);
        if (bp.narrativeProposals) highestIndex = Math.max(highestIndex, 2);
        if (bp.researchNotes) highestIndex = Math.max(highestIndex, 3);
        if (bp.draftScript) highestIndex = Math.max(highestIndex, 4);
        if (bp.finalScript || bp.workflowStatus === 'final') highestIndex = Math.max(highestIndex, 5);
        return highestIndex;
    }

    const highestStepIndex = getHighestStepIndex(blueprint);

    const getWorkflowStatus = () => {
        if (blueprint.workflowStatus) return blueprint.workflowStatus;
        if (blueprint.finalScript || blueprint.full_video_script_text) return 'legacy_view';
        return 'transcript_input';
    };

    const status = getWorkflowStatus();

    const steps = [
        { id: 'transcript_input', name: 'Transcript' },
        { id: 'dialogue_mapping', name: 'Dialogue Map' },
        { id: 'narrative_refinement', name: 'Narrative' },
        { id: 'research_approval', name: 'Research' },
        { id: 'draft_review', name: 'Draft Voiceover' },
        { id: 'final_review', name: 'Final Script' },
        { id: 'final', name: 'Complete' }
    ];

    const currentStepIndex = steps.findIndex(s => s.id === status);
    const stepProps = { video, settings, handlers, project };

    const renderStepComponent = () => {
        switch (status) {
            case 'transcript_input': return <window.Step1_TranscriptInput {...stepProps} />;
            case 'dialogue_mapping': return <window.Step2_DialogueMapper {...stepProps} />;
            case 'narrative_refinement': return <window.Step3_NarrativeRefiner {...stepProps} />;
            case 'research_approval': return <window.Step4_ResearchApproval {...stepProps} />;
            case 'draft_review': return <window.Step5_DraftReviewer {...stepProps} />;
            case 'final_review': return <window.Step6_FinalScriptReview {...stepProps} />;
            case 'legacy_view': return <window.LegacyScriptView {...stepProps} />;
            case 'final': return (
                <div className="text-center p-8">
                    <h2 className="text-2xl font-bold text-green-400">Script Complete!</h2>
                    <p className="text-gray-400 mt-2">You can now view the final script in the project details.</p>
                </div>
            );
            default: return <window.Step1_TranscriptInput {...stepProps} />;
        }
    };

    if (status === 'legacy_view') {
        return <div className="scripting-v2-workspace">{renderStepComponent()}</div>;
    }

    return (
        <div className="scripting-v2-workspace">
            <window.BlueprintStepper steps={steps} currentStepIndex={currentStepIndex} video={video} handlers={handlers} highestStepIndex={highestStepIndex} />
            <div className="mt-6">{renderStepComponent()}</div>
        </div>
    );
};
