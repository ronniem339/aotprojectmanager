const { useState: useState7, useEffect: useEffect7 } = React;

window.Step7_EditingShotList = ({ video, settings, handlers }) => {
    const blueprint = video?.tasks?.scriptingV2_blueprint || {};
    const editingShotList = blueprint.editingShotList || [];

    const handleFinalize = () => {
        const newBlueprint = {
            ...blueprint,
            workflowStatus: 'final'
        };
        handlers.updateVideo(video.id, { tasks: { ...video.tasks, scriptingV2_blueprint: newBlueprint } });
        handlers.displayNotification("Editing shot list finalized!", 'success');
    };

    return (
        <div className="p-4 border border-gray-700 rounded-lg">
            <h2 className="text-xl font-bold text-white mb-3">Step 7: Editing Shot List</h2>
            <p className="mb-4 text-gray-400">Review the generated shot list for video editing. This provides a breakdown of sequences, voiceover, and footage needed.</p>
            
            {editingShotList.length > 0 ? (
                <div className="space-y-6">
                    {editingShotList.map((sequence, index) => (
                        <div key={index} className="p-4 bg-gray-800/70 rounded-lg border border-gray-700">
                            <h3 className="text-lg font-bold text-primary-accent mb-2">Sequence: {sequence.name} ({sequence.type})</h3>
                            
                            {sequence.voiceover_script && (
                                <div className="mb-3">
                                    <h4 className="font-semibold text-gray-300">Voiceover Script:</h4>
                                    <p className="text-gray-400 whitespace-pre-wrap">{sequence.voiceover_script}</p>
                                </div>
                            )}

                            {sequence.on_camera_dialogue && (
                                <div className="mb-3">
                                    <h4 className="font-semibold text-gray-300">On-Camera Dialogue:</h4>
                                    <p className="text-gray-400 whitespace-pre-wrap">{sequence.on_camera_dialogue}</p>
                                </div>
                            )}

                            {sequence.locations && sequence.locations.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-gray-300">Locations & Footage:</h4>
                                    <ul className="list-disc list-inside pl-4">
                                        {sequence.locations.map((loc, locIndex) => (
                                            <li key={locIndex} className="text-gray-400">
                                                {loc.name} ({loc.footage_types.join(', ')})
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-center text-gray-500">No editing shot list generated yet.</p>
            )}

            <div className="mt-6 flex justify-end">
                <button
                    onClick={handleFinalize}
                    className="btn btn-primary btn-large"
                >
                    ✅ Confirm Shot List & Complete Scripting
                </button>
            </div>
        </div>
    );
};
