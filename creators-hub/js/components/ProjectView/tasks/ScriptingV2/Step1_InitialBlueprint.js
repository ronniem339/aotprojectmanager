// creators-hub/js/components/ProjectView/tasks/ScriptingV2/Step1_InitialBlueprint.js

// This component provides the UI for the first step of the V2 workflow.
// It includes a textarea for the user's "brain dump" and a button
// to trigger the AI generation of the initial Creative Blueprint.

const { useState } = React;

window.Step1_InitialBlueprint = ({ blueprint, setBlueprint, video, project, settings }) => {
    // Local state to hold the user's initial thoughts.
    const [initialThoughts, setInitialThoughts] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');

    const handleGenerateBlueprint = async () => {
        setIsGenerating(true);
        setError('');
        try {
            // This is where we will call the new AI function.
            // For now, we'll simulate the output.
            console.log("Calling createInitialBlueprintAI with:", {
                initialThoughts,
                video,
                project,
                settings
            });

            // --- MOCK AI CALL ---
            // In the future, this will be:
            // const newBlueprint = await window.aiUtils.v2.createInitialBlueprintAI(...);
            const mockBlueprint = {
                shots: [
                    {
                        shot_id: "shot_1",
                        scene_id: "scene_1",
                        scene_narrative_purpose: "Hook: Introduce the location and the main question.",
                        location_name: project.locations[0]?.name || "First Location",
                        shot_type: "Wide Drone Shot",
                        shot_description: "A sweeping aerial shot of the location at sunrise.",
                        voiceover_script: "",
                        on_camera_dialogue: "",
                        ai_research_notes: [],
                        creator_experience_notes: "",
                        estimated_time_seconds: 10
                    }
                ]
            };
            // --- END MOCK ---

            setBlueprint(mockBlueprint); // Update the main blueprint state.

        } catch (err) {
            console.error("Error generating blueprint:", err);
            setError("Failed to generate the blueprint. Please try again.");
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
