// creators-hub/js/components/ProjectView/tasks/ScriptingV2/Step5_FinalAssembly.js

// This is the final step of the V2 workflow. It provides the button to trigger
// the final AI script generation and a button to mark the entire task as complete.

const { useState } = React;
const { CopyButton } = window; 

window.Step5_FinalAssembly = ({ blueprint, setBlueprint, video, settings, onUpdateTask, onClose, triggerAiTask }) => {
    // MODIFICATION: Removed direct call to useAppState and now expect triggerAiTask as a prop
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');

    const handleGenerateScript = async () => {
        if (!triggerAiTask) {
            console.error("triggerAiTask handler is missing.");
            setError("AI generation function is not available.");
            return;
        }
        setIsGenerating(true);
        setError(''); 

        const taskId = `scriptingV2-final-script-${video.id}-${Date.now()}`;
        const taskName = "Final Script Assembly";

        try {
            await triggerAiTask({
                id: taskId,
                type: 'scriptingV2-final-script',
                name: taskName,
                aiFunction: window.aiUtils.generateScriptFromBlueprintAI,
                args: {
                    blueprint,
                    video,
                    settings
                },
                onSuccess: (result) => {
                    if (!result || !result.updated_shots || !result.full_video_script_text || !result.recording_voiceover_script_text) {
                        throw new Error("AI did not return a complete script package.");
                    }

                    const updatedBlueprint = {
                        ...blueprint,
                        shots: result.updated_shots,
                        final_full_video_script: result.full_video_script_text,
                        final_recording_voiceover_script: result.recording_voiceover_script_text,
                        finalScriptGenerated: true
                    };

                    setBlueprint(updatedBlueprint);
                },
                onFailure: (err) => {
                    console.error("Local handler caught final script generation error:", err);
                    setError(`Failed to generate the final script: ${err.message || 'Unknown error.'}`);
                }
            });

        } catch (err) {
            console.error("Unhandled error from triggerAiTask in Step5_FinalAssembly:", err);
            setError(`An unhandled error occurred: ${err.message || 'Please check console.'}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCompleteTask = () => {
        onUpdateTask('scripting', 'complete', {
            'tasks.scriptingV2_blueprint': {
                ...blueprint,
                finalScriptGenerated: true
            },
            'script': blueprint.final_full_video_script || '',
            'recording_voiceover_script': blueprint.final_recording_voiceover_script || ''
        });
        onClose(); 
    };

    const isFinalScriptAssembled = blueprint?.finalScriptGenerated;

    // MODIFICATION: Removed the flex centering and height classes to fix the layout.
    return React.createElement('div', { className: 'p-6' }, 
        React.createElement('div', { className: 'text-center' }, // Add a wrapper for centered content
            React.createElement('h3', { className: 'text-2xl font-bold text-primary-accent mb-4' }, 'Step 4: Final Assembly'),
            React.createElement('p', { className: 'text-gray-400 mb-8 max-w-2xl mx-auto' },
                isFinalScriptAssembled
                    ? "Your final shot list and scripts are ready. Review them below and make any final manual edits. You can regenerate the script or mark the task as complete."
                    : "All the necessary dialogue and information has been gathered. Click below to have the AI act as a master scriptwriter and assemble all the pieces into your final video script and a dedicated voiceover recording script."
            ),
            React.createElement('button', {
                onClick: handleGenerateScript,
                disabled: isGenerating,
                className: 'button-primary text-xl px-10 py-4 disabled:opacity-50 mb-8'
            },
                isGenerating ? 'Writing Your Script...' : (isFinalScriptAssembled ? '🔁 Regenerate Script' : '🎬 Generate Final Script')
            ),
            error && React.createElement('p', { className: 'text-red-400 mt-6 mb-4' }, error),
        ),

        // Display scripts and Complete button if script assembled
        isFinalScriptAssembled && React.createElement(React.Fragment, null,
            React.createElement('div', { className: 'w-full max-w-4xl mx-auto text-left bg-gray-800/70 p-6 rounded-lg border border-gray-700' },
                React.createElement('h4', { className: 'text-xl font-semibold text-white mb-3' }, 'Voiceover Script for Recording'),
                React.createElement('p', { className: 'text-gray-300 text-sm whitespace-pre-wrap mb-4' }, blueprint.final_recording_voiceover_script || 'Recording script not generated.'),
                blueprint.final_recording_voiceover_script && React.createElement(CopyButton, {
                    textToCopy: blueprint.final_recording_voiceover_script,
                    buttonText: 'Copy for Recording'
                })
            ),
            React.createElement('div', {className: 'text-center'}, // Wrapper for the complete button
                 React.createElement('button', {
                    onClick: handleCompleteTask,
                    className: 'button-success text-xl px-10 py-4 mt-8'
                }, '✅ Mark Task as Complete')
            )
        )
    );
};
