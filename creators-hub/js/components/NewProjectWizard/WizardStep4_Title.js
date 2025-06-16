// js/components/NewProjectWizard/WizardStep4_Title.js

window.WizardStep4_Title = ({
    suggestions,
    selectedTitle,
    refinement,
    isLoading,
    error,
    onTitleSelect,
    onRefinementChange,
    onRefine,
}) => {
    return (
        <div className="max-h-[70vh] overflow-y-auto pr-4">
            <h2 className="text-2xl font-bold mb-4">New Project Wizard: Step 4 of 6 - Refine Title</h2>
            <p className="text-gray-400 mb-6">Choose the best title for your series, or ask for new ideas.</p>
            {isLoading && !suggestions.length && <window.LoadingSpinner text="Thinking..." />}
            {suggestions.length > 0 && (
                <div className="space-y-3">
                    {suggestions.map(title => (
                        <label key={title} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedTitle === title ? 'bg-primary-accent/[.50] border-primary-accent' : 'bg-gray-800/60 border-gray-700 hover:bg-gray-700/60'} border`}>
                            <input type="radio" name="playlistTitle" value={title} checked={selectedTitle === title} onChange={(e) => onTitleSelect(e.target.value)} className="h-4 w-4 bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent"/>
                            <span>{title}</span>
                        </label>
                    ))}
                </div>
            )}
            <div className="mt-6">
                <label className="block text-sm font-medium text-gray-300 mb-1">Refinement Instructions</label>
                <textarea value={refinement} onChange={(e) => onRefinementChange(e.target.value)} rows="2" className="w-full form-textarea" placeholder="e.g., 'Make them more mysterious', 'Add the year'"/>
                <div className="text-right mt-2">
                    <button onClick={onRefine} disabled={isLoading || !refinement} className="px-4 py-2 text-sm bg-primary-accent hover:bg-primary-accent-darker rounded-lg flex items-center gap-2 disabled:bg-gray-500">
                        {isLoading ? <window.LoadingSpinner isButton={true} /> : '🔁 Refine'}
                    </button>
                </div>
            </div>
            {error && <p className="text-red-400 mt-4 bg-red-900/50 p-3 rounded-lg">{error}</p>}
        </div>
    );
};
