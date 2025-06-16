// js/components/ScriptPlanModal.js

/**
 * ScriptPlanModal component for displaying and interacting with AI-generated script plans.
 * This modal provides a full-screen view for the script outline and user questions,
 * improving the user experience over a cramped accordion.
 *
 * @param {object} props - The component props.
 * @param {string} props.scriptPlan - The AI-generated high-level script outline.
 * @param {Array<object>} props.locationQuestions - An array of questions for the user, each with {locationName, question}.
 * @param {function} props.onClose - Function to call when the modal should be closed.
 * @param {function} props.onSaveExperiences - Function to call to save the user's location experiences.
 * Expected signature: (locationExperiences: object) => void.
 * @param {object} [props.initialLocationExperiences={}] - Optional initial state for user's location experiences.
 */
window.ScriptPlanModal = ({
    scriptPlan,
    locationQuestions,
    onClose,
    onSaveExperiences,
    initialLocationExperiences = {}
}) => {
    const { useState, useEffect } = React;
    const [locationExperiences, setLocationExperiences] = useState(initialLocationExperiences);

    // Update internal state if initial experiences change (e.g., when editing an existing project)
    useEffect(() => {
        setLocationExperiences(initialLocationExperiences);
    }, [initialLocationExperiences]);

    const handleExperienceChange = (locationName, value) => {
        setLocationExperiences(prev => ({
            ...prev,
            [locationName]: value
        }));
    };

    const handleSave = () => {
        onSaveExperiences(locationExperiences);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
            <div className="glass-card rounded-lg p-8 w-full max-w-4xl h-5/6 flex flex-col relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-6 text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                <h2 className="text-3xl font-bold text-white mb-6 text-center">AI-Generated Script Plan</h2>

                {/* Content Area */}
                <div className="flex-grow overflow-y-auto pr-4 custom-scrollbar">
                    <div className="mb-8">
                        <h3 className="text-xl font-semibold text-primary-accent mb-3">Video Script Outline:</h3>
                        <div className="bg-gray-800/50 p-4 rounded-lg text-gray-200 whitespace-pre-wrap leading-relaxed">
                            {scriptPlan}
                        </div>
                    </div>

                    {locationQuestions && locationQuestions.length > 0 && (
                        <div>
                            <h3 className="text-xl font-semibold text-primary-accent mb-3">Your Experience & Footage Details:</h3>
                            <p className="text-gray-400 mb-4">Answer these questions to help the AI craft a personalized script. Be specific!</p>
                            <div className="space-y-6">
                                {locationQuestions.map((item, index) => (
                                    <div key={index} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                                        <label htmlFor={`question-${index}`} className="block text-gray-200 text-md font-medium mb-2">
                                            {item.locationName && <span className="font-semibold text-primary-accent mr-1">{item.locationName}:</span>}
                                            {item.question}
                                        </label>
                                        <textarea
                                            id={`question-${index}`}
                                            value={locationExperiences[item.locationName || `general_question_${index}`] || ''}
                                            onChange={(e) => handleExperienceChange(item.locationName || `general_question_${index}`, e.target.value)}
                                            placeholder="Type your details here..."
                                            rows="4"
                                            className="w-full form-textarea bg-gray-900 border-gray-600 focus:ring-primary-accent focus:border-primary-accent"
                                        ></textarea>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer buttons */}
                <div className="flex-shrink-0 pt-6 mt-6 border-t border-gray-700 flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold text-white">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold text-white">Save & Continue</button>
                </div>
            </div>
        </div>
    );
};
