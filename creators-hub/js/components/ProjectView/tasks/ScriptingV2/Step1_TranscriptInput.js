// WRITE to file: ./creators-hub/js/components/ProjectView/tasks/ScriptingV2/Step1_TranscriptInput.js

import React, { useState } from 'react';

const Step1_TranscriptInput = ({ video, updateVideo }) => {
    const [transcript, setTranscript] = useState(video?.tasks?.scriptingV2_blueprint?.rawTranscript || '');

    const handleNext = () => {
        // Here you would trigger the first AI task: mapDialogueToLocationsAI
        // For now, we'll just update the state to move to the next step
        const newBlueprint = {
            ...video.tasks.scriptingV2_blueprint,
            rawTranscript: transcript,
            workflowStatus: 'dialogue_mapping' // Move to the next step
        };
        
        // This function needs to be passed down from a higher-level component, likely through useAppState
        // and it would handle the AI call and the subsequent state update.
        // For example: triggerAiTask('mapDialogueToLocationsAI', { videoId: video.id, transcript });

        console.log("Moving to dialogue mapping. In a real scenario, an AI task would be triggered here.");
        
        // Simulate updating the video object for now.
        // The real implementation will rely on the triggerAiTask function to handle this.
        updateVideo({
            ...video,
            tasks: {
                ...video.tasks,
                scriptingV2_blueprint: newBlueprint
            }
        });
    };

    return (
        <div className="p-4 border rounded-lg">
            <h2 className="text-xl font-bold mb-3">Step 1: Input Your On-Camera Transcript</h2>
            <p className="mb-4 text-gray-600">
                Paste the full, unedited transcript of all your on-camera dialogue here. This will form the foundation of your video's narrative.
            </p>
            <textarea
                className="w-full h-64 p-2 border rounded"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste your transcript here..."
            />
            <div className="mt-4 flex justify-end">
                <button
                    onClick={handleNext}
                    disabled={!transcript.trim()}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400"
                >
                    Map Dialogue to Locations
                </button>
            </div>
        </div>
    );
};

export default Step1_TranscriptInput;
