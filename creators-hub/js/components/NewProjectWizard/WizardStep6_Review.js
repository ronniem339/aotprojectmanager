// js/components/NewProjectWizard/WizardStep6_Review.js

window.WizardStep6_Review = ({
    videos,
    refiningVideoIndex,
    refinement,
    planRefinement,
    isLoading,
    error,
    onRefinementChange,
    onPlanRefinementChange,
    onRefineVideo,
    onRefineEntirePlan,
    onAcceptVideo,
    onSetRefiningVideoIndex,
    onDeleteVideo
}) => {
    return (
        <div className="max-h-[70vh] overflow-y-auto pr-4">
            <h2 className="text-2xl font-bold mb-4">New Project Wizard: Step 6 of 6 - Review Video Plan</h2>
            <p className="text-gray-400 mb-6">This is the overall plan for your video series. Review, refine, or delete each video idea to build your final project. You can also provide feedback to refine the entire plan at once.</p>
            
            {/* Plan-level refinement input */}
            <div className="p-4 mb-6 bg-gray-900/50 rounded-lg border border-amber-500">
                <label className="block text-md font-medium text-amber-400 mb-2">Refine Entire Plan</label>
                <p className="text-sm text-gray-400 mb-3">Give feedback to regenerate the whole video series plan. For example: "Make this a 3-part series instead of 5," or "Focus less on history and more on food."</p>
                <textarea
                    value={planRefinement}
                    onChange={(e) => onPlanRefinementChange(e.target.value)}
                    rows="2"
                    className="w-full form-textarea"
                    placeholder="Enter feedback for the whole plan..."
                    disabled={isLoading}
                />
                <div className="text-right mt-2">
                    <button
                        onClick={onRefineEntirePlan}
                        disabled={isLoading || !planRefinement}
                        className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-700 rounded-lg flex items-center gap-2 disabled:bg-gray-500"
                    >
                        {isLoading && !refiningVideoIndex ? <window.LoadingSpinner isButton={true} /> : '🪄 Refine Entire Plan'}
                    </button>
                </div>
            </div>

            <hr className="my-6 border-gray-700" />

            {isLoading && !videos.length && <window.LoadingSpinner text="Generating..." />}
            
            {videos.length > 0 && (
                <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-2">
                    {videos.map((video, index) => (
                        <div key={index} className={`p-4 bg-gray-800/60 rounded-lg border transition-all ${video.status === 'accepted' ? 'border-green-500' : 'border-gray-700'}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-lg text-primary-accent">{`Video ${index + 1}: ${video.title}`}</h3>
                                    <p className="text-sm text-gray-400 mt-1 italic">Est. Length: {video.estimatedLengthMinutes} minutes</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {video.status === 'accepted' && <span className="text-green-400 font-bold text-sm flex items-center gap-2">✅ Accepted</span>}
                                    <button onClick={() => onDeleteVideo(index)} className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-800/50 rounded-full flex-shrink-0" title="Delete Suggestion">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <p className="text-sm mt-3">{video.concept}</p>
                            
                            {video.status === 'pending' && (
                                <div className="mt-4 pt-4 border-t border-gray-700">
                                    {refiningVideoIndex === index ? (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1">Refinement Instructions</label>
                                            <textarea value={refinement} onChange={(e) => onRefinementChange(e.target.value)} rows="2" className="w-full form-textarea" placeholder="e.g., 'Focus more on the history of this place'"/>
                                            <div className="flex justify-end gap-2 mt-2">
                                                <button onClick={() => onSetRefiningVideoIndex(null)} className="text-xs px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded-md">Cancel</button>
                                                <button onClick={() => onRefineVideo(index)} disabled={!refinement || isLoading} className="text-xs px-3 py-1 bg-primary-accent hover:bg-primary-accent-darker rounded-md flex items-center gap-1">{isLoading ? <window.LoadingSpinner isButton={true} /> : 'Submit'}</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => { onSetRefiningVideoIndex(index); onRefinementChange(''); }} className="text-sm px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded-md">Refine</button>
                                            <button onClick={() => onAcceptVideo(index)} className="text-sm px-3 py-1 bg-green-700 hover:bg-green-600 rounded-md">Accept</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            {error && <p className="text-red-400 mt-4 bg-red-900/50 p-3 rounded-lg">{error}</p>}
        </div>
    );
};
