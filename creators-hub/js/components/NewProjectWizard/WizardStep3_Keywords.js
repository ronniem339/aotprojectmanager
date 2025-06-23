// js/components/NewProjectWizard/WizardStep3_Keywords.js

window.WizardStep3_Keywords = ({ keywordIdeas, selectedKeywords, onKeywordSelection, isLoading, error }) => {
    return (
        <div className="max-h-[70vh] overflow-y-auto pr-4">
            <h2 className="text-2xl font-bold mb-4">New Project Wizard: Step 3 of 6 - Keyword Strategy</h2>
            <p className="text-gray-400 mb-6">Here are some popular search terms related to your project. Select the ones you want the AI to focus on when building the plan.</p>
            {/* FIX: This spinner is now correctly controlled by the 'isLoading' prop passed from NewProjectWizard.js,
                         which should specifically reflect the keyword generation process. */}
            {isLoading && <window.LoadingSpinner text="Generating keyword ideas..." />}
            <div className="p-4 bg-gray-900/50 border border-gray-700 rounded-lg max-h-[60vh] overflow-y-auto pr-2 flex flex-wrap gap-2">
                {keywordIdeas.map((keyword, index) => (
                    <button
                        key={`${keyword}-${index}`}
                        onClick={() => onKeywordSelection(keyword)}
                        className={`px-3 py-1.5 text-sm rounded-full transition-colors ${selectedKeywords.includes(keyword) ? 'bg-primary-accent text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
                    >
                        {keyword}
                    </button>
                ))}
            </div>
            {error && <p className="text-red-400 mt-4 bg-red-900/50 p-3 rounded-lg">{error}</p>}
        </div>
    );
};
