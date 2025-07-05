// creators-hub/js/components/ProjectView/tasks/ScriptingV2/Step5_FinalAssembly.js

// This is the final step of the V2 workflow. It provides the button to trigger
// the final AI script generation and a button to mark the entire task as complete.

const { useState } = React;
const { generateScriptFromBlueprintAI, CopyButton } = window; // ADDED: CopyButton assuming it's available globally

window.Step5_FinalAssembly = ({ blueprint, setBlueprint, video, settings, onUpdateTask, onClose }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');

    const handleGenerateScript = async () => {
        setIsGenerating(true);
        setError('');
        try {
            // UPDATED: generateScriptFromBlueprintAI now returns multiple outputs
            const aiOutput = await generateScriptFromBlueprintAI({
                blueprint,
                video,
                settings
            });

            if (!aiOutput || !aiOutput.updated_shots || !aiOutput.full_video_script_text || !aiOutput.recording_voiceover_script_text) {
                throw new Error("AI did not return a complete script package.");
            }

            // Create a new blueprint object with the updated shots and the new scripts
            const updatedBlueprint = {
                ...blueprint,
                // Update blueprint.shots with the AI's refined shots
                shots: aiOutput.updated_shots,
                // Store the two new script outputs
                final_full_video_script: aiOutput.full_video_script_text,
                final_recording_voiceover_script: aiOutput.recording_voiceover_script_text,
                finalScriptGenerated: true // Set flag indicating final script has been generated
            };

            setBlueprint(updatedBlueprint);

        } catch (err) {
            console.error("Error generating final script:", err);
            setError(`Failed to generate the final script: ${err.message}. Please try again.`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCompleteTask = () => {
        // Here we would update the main video task status in Firestore.
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
                ? "Your final shot list and scripts are ready. Review them below and make any final manual edits. When you're happy, mark the task as complete."
                : "All the necessary dialogue and information has been gathered. Click below to have the AI act as a master scriptwriter and assemble all the pieces into your final video script and a dedicated voiceover recording script."
        ),

        // Display Generate button if script not assembled
        !isFinalScriptAssembled && React.createElement('button', {
            onClick: handleGenerateScript,
            disabled: isGenerating,
            className: 'button-primary text-xl px-10 py-4 disabled:opacity-50'
        },
            isGenerating ? 'Writing Your Script...' : '🎬 Generate Final Script'
        ),

        // Display scripts and Complete button if script assembled
        isFinalScriptAssembled && React.createElement(React.Fragment, null,
            // Removed Full Video Script display as per user's request
            React.createElement('div', { className: 'w-full max-w-2xl text-left mt-8 bg-gray-800/70 p-6 rounded-lg border border-gray-700' }, // Adjusted mt-8 for spacing
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
        ),

        error && React.createElement('p', { className: 'text-red-400 mt-6' }, error)
    );
};
