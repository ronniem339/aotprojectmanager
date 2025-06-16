// js/components/NewVideoWizard/WizardStep_AIParse.js

const { useState } = React;

window.WizardStep_AIParse = ({ onAnalyze, onSkip, isLoading }) => {
    const [textInput, setTextInput] = useState('');

    return (
        <div className="space-y-4 flex flex-col h-full">
            <h3 className="text-xl font-bold text-primary-accent text-center">Describe Your New Video</h3>
            <p className="text-gray-400 text-center">
                Paste in any information you have—a title, a concept, a full script, location notes, etc.
                The AI will parse it and pre-fill the details for you.
            </p>
            <div className="flex-grow">
                <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    className="w-full h-full form-textarea resize-none"
                    placeholder="Paste your video details here..."
                    disabled={isLoading}
                />
            </div>
            <div className="flex-shrink-0 flex flex-col sm:flex-row gap-4 pt-4">
                <button
                    onClick={() => onAnalyze(textInput)}
                    disabled={isLoading || !textInput.trim()}
                    className="w-full px-6 py-3 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-75"
                >
                    {isLoading ? <window.LoadingSpinner isButton={true} /> : '🤖 Analyze with AI'}
                </button>
                <button
                    onClick={onSkip}
                    disabled={isLoading}
                    className="w-full sm:w-auto px-6 py-3 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold"
                >
                    Skip & Fill Manually
                </button>
            </div>
        </div>
    );
};
