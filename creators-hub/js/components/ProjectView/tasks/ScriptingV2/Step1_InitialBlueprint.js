// creators-hub/js/components/ProjectView/tasks/ScriptingV2/Step1_InitialBlueprint.js

const { useState, useEffect } = React;

// **FIX**: The component now correctly receives triggerAiTask from its props.
window.Step1_InitialBlueprint = ({ blueprint, setBlueprint, video, project, settings, triggerAiTask }) => {
    // We no longer need the global handlers from useAppState.
    // const { handlers } = window.useAppState();

    const [initialThoughts, setInitialThoughts] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (blueprint?.initialThoughts !== undefined) {
            setInitialThoughts(blueprint.initialThoughts || '');
        }
    }, [blueprint]);

    const handleGenerateBlueprint = async () => {
        // **FIX**: Ensure the correct triggerAiTask function (from props) is available.
        if (!triggerAiTask) {
            console.error("triggerAiTask handler is missing from props.");
            setError("The AI task handler is not available. Cannot generate blueprint.");
            return;
        }

        setIsGenerating(true);
        setError('');

        const taskId = `scriptingV2-initial-blueprint-${video.id}-${Date.now()}`;

        try {
            // **FIX**: The component now uses the triggerAiTask function passed down
            // from the workspace, which includes the necessary save-locking logic.
            await triggerAiTask({
                id: taskId,
                type: 'scriptingV2-blueprint-initial',
                name: 'Create Initial Blueprint', // Corrected name for clarity in the queue
                aiFunction: window.aiUtils.createInitialBlueprintAI,
                args: { 
                    initialThoughts, 
                    video, 
                    project, 
                    settings 
                },
                onSuccess: (newBlueprint) => {
                    newBlueprint.initialThoughts = initialThoughts;
                    setBlueprint(newBlueprint);
                },
                onFailure: (err) => {
                    console.error("Local handler caught blueprint generation error:", err);
                    setError(`Failed to generate blueprint. Details: ${err.message || 'Unknown error.'}`);
                }
            });

        } catch (err) {
            // The triggerAiTask handler now manages global notifications, so this is a fallback.
            console.error("Unhandled error from triggerAiTask in Step1_InitialBlueprint:", err);
            setError(`An unhandled error occurred: ${err.message || 'Please check console.'}`);
        } finally {
            setIsGenerating(false);
        }
    };

    return React.createElement('div', { className: 'flex flex-col h-full' },
        React.createElement('h3', { className: 'text-xl font-semibold text-primary-accent mb-3' }, 'Step 1: The Brain Dump'),
        React.createElement('p', { className: 'text-gray-400 mb-6' }, 'Jot down everything you\'re thinking for this video. The more you add, the better the AI can structure the initial narrative and shot list.'),
        React.createElement('textarea', {
            value: initialThoughts,
            onChange: (e) => setInitialThoughts(e.target.value),
            rows: "15",
            className: 'w-full form-textarea bg-gray-900 border-gray-700 focus:ring-primary-accent focus:border-primary-accent flex-grow',
            placeholder: 'Paste your notes, describe your experience, list key points, define the video\'s goal...'
        }),
        React.createElement('div', { className: 'text-center mt-6' },
            React.createElement('button', {
                onClick: handleGenerateBlueprint,
                disabled: isGenerating || !initialThoughts.trim(),
                className: 'btn btn-primary text-lg px-8 py-3 disabled:opacity-50'
            },
                isGenerating ? 'Generating...' : 'Create Initial Blueprint'
            )
        ),
        error && React.createElement('p', { className: 'text-red-400 mt-4 text-center' }, error)
    );
};
