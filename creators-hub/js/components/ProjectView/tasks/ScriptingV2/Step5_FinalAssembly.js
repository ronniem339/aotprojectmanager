// creators-hub/js/components/ProjectView/tasks/ScriptingV2/Step5_FinalAssembly.js

// This is the final step of the V2 workflow. It provides the button to trigger
// the final AI script generation and a button to mark the entire task as complete.

const { useState } = React;
const { generateScriptFromBlueprintAI } = window;

window.Step5_FinalAssembly = ({ blueprint, setBlueprint, video, settings, onUpdateTask, onClose }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');

    const handleGenerateScript = async () => {
        setIsGenerating(true);
        setError('');
        try {
            const finalBlueprint = await generateScriptFromBlueprintAI({
                blueprint,
                video,
                settings
            });

            if (!finalBlueprint || !finalBlueprint.shots) {
                throw new Error("AI did not return a valid final blueprint.");
            }

            setBlueprint(finalBlueprint);

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
            'tasks.scriptingV2_blueprint': blueprint,
            'script': blueprint.shots.map(s => s.voiceover_script || s.on_camera_dialogue).join('\n\n') // Also save a plain text version
        });
        onClose(); // Close the workspace
    };

    const isScriptGenerated = blueprint?.shots?.some(shot => shot.voiceover_script);

    return React.createElement('div', { className: 'flex flex-col h-full items-center justify-center text-center' },
        React.createElement('h3', { className: 'text-2xl font-bold text-primary-accent mb-4' }, 'Step 5: Final Assembly'),
        React.createElement('p', { className: 'text-gray-400 mb-8 max-w-md' },
            isScriptGenerated
                ? "Your final shot list and script are ready. Review the blueprint on the right and make any final manual edits. When you're happy, mark the task as complete."
                : "All the necessary information has been gathered. The AI will now act as a master scriptwriter to assemble all the pieces into a final, flowing script."
        ),

        !isScriptGenerated && React.createElement('button', {
            onClick: handleGenerateScript,
            disabled: isGenerating,
            className: 'button-primary text-xl px-10 py-4 disabled:opacity-50'
        },
            isGenerating ? 'Writing Your Script...' : '🎬 Generate Final Script'
        ),

        isScriptGenerated && React.createElement('button', {
            onClick: handleCompleteTask,
            className: 'button-success text-xl px-10 py-4'
        }, '✅ Mark Task as Complete'),


        error && React.createElement('p', { className: 'text-red-400 mt-6' }, error)
    );
};
