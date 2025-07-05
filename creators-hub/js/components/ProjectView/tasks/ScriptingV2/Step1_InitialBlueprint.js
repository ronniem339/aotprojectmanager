// creators-hub/js/components/ProjectView/tasks/ScriptingV2/Step1_InitialBlueprint.js

const { useState, useEffect } = React;
// We no longer import createInitialBlueprintAI directly, as it's called via handlers.triggerAiTask
// const { createInitialBlueprintAI } = window; 

window.Step1_InitialBlueprint = ({ blueprint, setBlueprint, video, project, settings }) => {
    // Access handlers from useAppState
    const { handlers } = window.useAppState();

    // Local state to hold the user's initial thoughts.
    // Initialize it with an empty string, and let useEffect handle populating from blueprint.
    const [initialThoughts, setInitialThoughts] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    // Error state will now primarily be managed by global notifications, but keeping
    // a local one for immediate feedback or specific component errors might still be useful.
    const [error, setError] = useState(''); 

    useEffect(() => {
        // This effect will run:
        // 1. On initial mount.
        // 2. Whenever the 'blueprint' object itself changes (e.g., when data is fetched from Firestore).
        if (blueprint?.initialThoughts !== undefined) { // Check for undefined specifically
            setInitialThoughts(blueprint.initialThoughts || ''); // Populate, or set to empty string if null/undefined
        }
    }, [blueprint]); // Depend on the blueprint object

    const handleGenerateBlueprint = async () => {
        setIsGenerating(true);
        setError(''); // Clear local error before starting

        const taskId = `scriptingV2-initial-blueprint-${video.id}-${Date.now()}`; // Unique ID for this specific task

        try {
            await handlers.triggerAiTask({
                id: taskId,
                type: 'scriptingV2-blueprint-initial',
                name: 'Initial Blueprint Generation',
                aiFunction: window.aiUtils.createInitialBlueprintAI, // Use the globally available AI utility
                args: { 
                    initialThoughts, 
                    video, 
                    project, 
                    settings 
                },
                onSuccess: (newBlueprint) => {
                    // Update the main blueprint state with the AI-generated content
                    // Also save the initial thoughts to the blueprint for persistence.
                    newBlueprint.initialThoughts = initialThoughts;
                    setBlueprint(newBlueprint);
                },
                onFailure: (err) => {
                    // triggerAiTask already displays a notification, so here we might just
                    // set a local error or log if needed, but primary feedback is global.
                    console.error("Local handler caught blueprint generation error:", err);
                    // Optionally set a local error if you want component-specific display
                    setError(`Failed to generate blueprint. Details: ${err.message || 'Unknown error.'}`);
                }
            });

        } catch (err) {
            // This catch block will only be hit if triggerAiTask re-throws the error.
            // It primarily serves for robust error propagation, as triggerAiTask handles display.
            console.error("Unhandled error from triggerAiTask in Step1_InitialBlueprint:", err);
            // If triggerAiTask didn't handle notification for some reason, this could be a fallback
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
                className: 'button-primary text-lg px-8 py-3 disabled:opacity-50'
            },
                isGenerating ? 'Generating...' : 'Create Initial Blueprint'
            )
        ),
        // Display local error if set, otherwise rely on global notifications
        error && React.createElement('p', { className: 'text-red-400 mt-4 text-center' }, error)
    );
};
