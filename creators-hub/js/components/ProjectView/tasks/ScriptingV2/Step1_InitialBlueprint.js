// creators-hub/js/components/ProjectView/tasks/ScriptingV2/Step1_InitialBlueprint.js

const { useState, useEffect } = React;
const { createInitialBlueprintAI } = window; // Import the new AI function

window.Step1_InitialBlueprint = ({ blueprint, setBlueprint, video, project, settings }) => {
    // Local state to hold the user's initial thoughts.
    // Initialize it with an empty string, and let useEffect handle populating from blueprint.
    const [initialThoughts, setInitialThoughts] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
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
        setError('');
        try {
            // Call the real AI function
            const newBlueprint = await createInitialBlueprintAI({
                initialThoughts,
                video,
                project,
                settings
            });

            if (!newBlueprint || !newBlueprint.shots) {
                throw new Error("AI did not return a valid blueprint structure.");
            }

            // Also save the initial thoughts to the blueprint for persistence.
            newBlueprint.initialThoughts = initialThoughts;

            setBlueprint(newBlueprint); // Update the main blueprint state.

        } catch (err) {
            console.error("Error generating blueprint:", err);
            setError(`Failed to generate the blueprint: ${err.message}. Please try again.`);
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
        error && React.createElement('p', { className: 'text-red-400 mt-4 text-center' }, error)
    );
};
