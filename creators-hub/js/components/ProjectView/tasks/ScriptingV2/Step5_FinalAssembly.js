// creators-hub/js/components/ProjectView/tasks/ScriptingV2/Step5_FinalAssembly.js

// This is the final step of the V2 workflow. It provides the button to trigger
// the final AI script generation and a button to mark the entire task as complete.

const { useState } = React;
// generateScriptFromBlueprintAI is now called via handlers.triggerAiTask
const { CopyButton } = window; // ADDED: CopyButton assuming it's available globally

window.Step5_FinalAssembly = ({ blueprint, setBlueprint, video, settings, onUpdateTask, onClose }) => {
    // Access handlers from useAppState
    const { handlers } = window.useAppState();

    const [isGenerating, setIsGenerating] = useState(false);
    // Local error state can be simplified/removed if all error messaging is handled globally
    const [error, setError] = useState('');

    const handleGenerateScript = async () => {
        setIsGenerating(true);
        setError(''); // Clear local error before starting

        const taskId = `scriptingV2-final-script-${video.id}-${Date.now()}`;
        const taskName = "Final Script Assembly";

        try {
            // Call the AI function via the centralized triggerAiTask handler
            const aiOutput = await handlers.triggerAiTask({
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
                    // Output validation is handled inside generateScriptFromBlueprintAI.js,
                    // but a final check here just in case.
                    if (!result || !result.updated_shots || !result.full_video_script_text || !result.recording_voiceover_script_text) {
                        throw new Error("AI did not return a complete script package. (Post-processing validation)");
                    }

                    // Create a new blueprint object with the updated shots and the new scripts
                    const updatedBlueprint = {
                        ...blueprint,
                        // Update blueprint.shots with the AI's refined shots
                        shots: result.updated_shots,
                        // Store the two new script outputs
                        final_full_video_script: result.full_video_script_text,
                        final_recording_voiceover_script: result.recording_voiceover_script_text,
                        finalScriptGenerated: true // Set flag indicating final script has been generated
                    };

                    setBlueprint(updatedBlueprint);
                },
                onFailure: (err) => {
                    // triggerAiTask already displays a notification.
                    // This local callback can be used for any component-specific cleanup or logging.
                    console.error("Local handler caught final script generation error:", err);
                    setError(`Failed to generate the final script: ${err.message || 'Unknown error.'}`);
                }
            });

        } catch (err) {
            // This catch block will only be hit if triggerAiTask re-throws the error.
            console.error("Unhandled error from triggerAiTask in Step5_FinalAssembly:", err);
            setError(`An unhandled error occurred: ${err.message || 'Please check console.'}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCompleteTask = () => {
        // Here we would update the main video task status in Firestore.
        // Ensure the blueprint state has the latest scripts before saving
        onUpdateTask('scripting', 'complete', {
            'tasks.scriptingV2_blueprint': {
                ...blueprint,
                finalScriptGenerated: true // Ensure flag is set on completion
            },
            // UPDATED: Save both the full video script and the recording voiceover script
            'script': blueprint.final_full_video_script || '', // Main script for overall video
            'recording_voiceover_script': blueprint.final_recording_voiceover_script || '' // Specific script for recording
        });
        onClose(); // Close the workspace
    };

    // UPDATED: Check for the new finalScriptGenerated flag from blueprint state
    const isFinalScriptAssembled = blueprint?.finalScriptGenerated;

    return React.createElement('div', { className: 'flex flex-col h-full items-center justify-center text-center p-6' }, // Added p-6 for padding
        React.createElement('h3', { className: 'text-2xl font-bold text-primary-accent mb-4' }, 'Step 4: Final Assembly'), // Corrected step number in UI
        React.createElement('p', { className: 'text-gray-400 mb-8 max-w-2xl' }, // Increased max-width for better readability
            isFinalScriptAssembled
                ? "Your final shot list and scripts are ready. Review them below and make any final manual edits. You can regenerate the script or mark the task as complete." // Updated message
                : "All the necessary dialogue and information has been gathered. Click below to have the AI act as a master scriptwriter and assemble all the pieces into your final video script and a dedicated voiceover recording script."
        ),

        // Display Generate/Regenerate button always
        React.createElement('button', {
            onClick: handleGenerateScript,
            disabled: isGenerating,
            className: 'button-primary text-xl px-10 py-4 disabled:opacity-50 mb-8' // Added mb-8 for spacing
        },
            isGenerating ? 'Writing Your Script...' : (isFinalScriptAssembled ? '🔁 Regenerate Script' : '🎬 Generate Final Script') // Changed button text
        ),

        error && React.createElement('p', { className: 'text-red-400 mt-6 mb-4' }, error), // Adjusted margin for error message

        // Display scripts and Complete button if script assembled
        isFinalScriptAssembled && React.createElement(React.Fragment, null,
            // Removed Full Video Script display as per user's request
            React.createElement('div', { className: 'w-full max-w-2xl text-left bg-gray-800/70 p-6 rounded-lg border border-gray-700' },
                React.createElement('h4', { className: 'text-xl font-semibold text-white mb-3' }, 'Voiceover Script for Recording'),
                React.createElement('p', { className: 'text-gray-300 text-sm whitespace-pre-wrap mb-4' }, blueprint.final_recording_voiceover_script || 'Recording script not generated.'),
                // ADDED: Copy button for the recording script
                blueprint.final_recording_voiceover_script && React.createElement(CopyButton, {
                    textToCopy: blueprint.final_recording_voiceover_script,
                    buttonText: 'Copy for Recording'
                })
            ),
            React.createElement('button', {
                onClick: handleCompleteTask,
                className: 'button-success text-xl px-10 py-4 mt-8'
            }, '✅ Mark Task as Complete')
        )
    );
};
