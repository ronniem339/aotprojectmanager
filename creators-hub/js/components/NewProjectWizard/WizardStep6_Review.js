// js/components/NewProjectWizard/WizardStep6_Review.js

window.WizardStep6_Review = ({
    videos,
    refiningVideoIndex,
    refinement,
    isLoading,
    error,
    onRefinementChange,
    onRefineVideo,
    onAcceptVideo,
    onSetRefiningVideoIndex
}) => {
    return (
        <div className="max-h-[70vh] overflow-y-auto pr-4">
            <h2 className="text-2xl font-bold mb-4">New Project Wizard: Step 6 of 6 - Review Video Plan</h2>
            <p className="text-gray-400 mb-6">This is the overall plan for your video series. Review and accept each video idea to finalize the project.</p>
            {isLoading && !videos.length && <window.LoadingSpinner text="Generating..." />}
            {videos.length > 0 && (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {videos.map((video, index) => (
                        <div key={index} className={`p-4 bg-gray-800/60 rounded-lg border transition-all ${video.status === 'accepted' ? 'border-green-500' : 'border-gray-700'}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-lg text-primary-accent">{`Video ${index + 1}: ${video.title}`}</h3>
                                    <p className="text-sm text-gray-400 mt-1 italic">Est. Length: {video.estimatedLengthMinutes} minutes</p>
                                </div>
                                {video.status === 'accepted' && <span className="text-green-400 font-bold text-sm flex items-center gap-2">✅ Accepted</span>}
                            </div>
                            <p className="text-sm mt-3">{video.concept}</p>
                            
                            {/* Further details like keywords, locations etc. can be added here if needed */}

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
