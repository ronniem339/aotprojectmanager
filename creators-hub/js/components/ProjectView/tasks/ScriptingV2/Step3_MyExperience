// creators-hub/js/components/ProjectView/tasks/ScriptingV2/Step3_MyExperience.js

// This component provides the UI for Step 3 of the V2 workflow.
// It allows the user to generate AI questions about their experience for each shot
// and then provide their personal notes.

const { useState } = React;
const { generateExperienceQuestionsAI } = window;

window.Step3_MyExperience = ({ blueprint, setBlueprint, video, settings }) => {
    const [generatingForShotId, setGeneratingForShotId] = useState(null);
    const [error, setError] = useState('');
    const [questionsForShot, setQuestionsForShot] = useState({}); // { shotId: ['q1', 'q2'] }

    const handleGenerateQuestions = async (shotToProbe) => {
        setGeneratingForShotId(shotToProbe.shot_id);
        setError('');
        try {
            const response = await generateExperienceQuestionsAI({
                shot: shotToProbe,
                video,
                settings
            });

            if (!response || !Array.isArray(response.questions)) {
                throw new Error("AI did not return valid questions.");
            }

            setQuestionsForShot(prev => ({ ...prev, [shotToProbe.shot_id]: response.questions }));

        } catch (err) {
            console.error("Error generating questions:", err);
            setError(`Failed to get questions for "${shotToProbe.shot_description}". Please try again.`);
        } finally {
            setGeneratingForShotId(null);
        }
    };

    const handleExperienceNotesChange = (shotId, notes) => {
        const updatedShots = blueprint.shots.map(shot => {
            if (shot.shot_id === shotId) {
                return { ...shot, creator_experience_notes: notes };
            }
            return shot;
        });
        setBlueprint({ ...blueprint, shots: updatedShots });
    };

    const renderShotExperienceEditor = (shot) => {
        const isGenerating = generatingForShotId === shot.shot_id;
        const questions = questionsForShot[shot.shot_id];

        return React.createElement('div', { key: shot.shot_id, className: 'bg-gray-800/70 p-4 rounded-xl border border-gray-700 mb-4' },
            React.createElement('h4', { className: 'font-bold text-lg text-white' }, shot.shot_type),
            React.createElement('p', { className: 'text-sm text-gray-400 mb-4' }, shot.shot_description),

            !questions && React.createElement('button', {
                onClick: () => handleGenerateQuestions(shot),
                disabled: isGenerating,
                className: 'button-secondary-small disabled:opacity-50'
            }, isGenerating ? 'Thinking...' : '🤔 Ask Me About My Experience'),

            questions && React.createElement('div', { className: 'my-4 space-y-2' },
                React.createElement('p', { className: 'text-xs font-bold text-amber-300 uppercase' }, 'Guiding Questions:'),
                React.createElement('ul', { className: 'list-disc list-inside text-sm text-gray-300' },
                    questions.map((q, i) => React.createElement('li', { key: i }, q))
                )
            ),

            React.createElement('textarea', {
                value: shot.creator_experience_notes || '',
                onChange: (e) => handleExperienceNotesChange(shot.shot_id, e.target.value),
                rows: 4,
                className: 'w-full form-textarea bg-gray-900 border-gray-600 focus:ring-primary-accent focus:border-primary-accent mt-3',
                placeholder: 'Add your personal take, feelings, or key insights here...'
            })
        );
    };

    return React.createElement('div', { className: 'flex flex-col h-full' },
        React.createElement('h3', { className: 'text-xl font-semibold text-primary-accent mb-3' }, "Step 3: Inject Your Experience"),
        React.createElement('p', { className: 'text-gray-400 mb-6' }, "This is where the video becomes uniquely yours. Let the AI ask you some questions to jog your memory, then add your personal notes and takeaways for each shot."),
        error && React.createElement('p', { className: 'text-red-400 mb-4 text-center bg-red-900/50 p-3 rounded-lg' }, error),
        React.createElement('div', { className: 'flex-grow overflow-y-auto pr-2' },
            (blueprint?.shots || []).map(shot => renderShotExperienceEditor(shot))
        )
    );
};
