// js/components/NewProjectWizard/WizardStep5_Description.js

window.WizardStep5_Description = ({
    description,
    refinement,
    isLoading,
    error,
    onDescriptionChange,
    onRefinementChange,
    onRefine
}) => {
    return (
        <div className="max-h-[70vh] overflow-y-auto pr-4">
            <h2 className="text-2xl font-bold mb-4">New Project Wizard: Step 5 of 6 - Refine Description</h2>
            <p className="text-gray-400 mb-6">Review the AI-generated description for your playlist. You can edit it directly or use the refinement box below.</p>
            {isLoading && !description && <window.LoadingSpinner text="Generating..." />}
            {description && (
                <textarea
                    value={isLoading ? 'Regenerating...' : description}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                    readOnly={isLoading}
                    rows="10"
                    className="w-full form-textarea leading-relaxed bg-gray-800/60"
                />
            )}
            <div className="mt-6">
                <label className="block text-sm font-medium text-gray-300 mb-1">Refinement Instructions</label>
                <textarea value={refinement} onChange={(e) => onRefinementChange(e.target.value)} rows="2" className="w-full form-textarea" placeholder="e.g., 'Make it more personal', 'Mention the drone footage specifically'"/>
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
