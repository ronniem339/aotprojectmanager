// WRITE to file: ./creators-hub/js/components/ProjectView/tasks/ScriptingV2/Step2_DialogueMapper.js

import React, { useState, useEffect } from 'react';

const Step2_DialogueMapper = ({ video, updateVideo }) => {
    const blueprint = video.tasks.scriptingV2_blueprint;
    // We will use the dialogueMap from the state, or initialize it if it doesn't exist.
    const [dialogueMap, setDialogueMap] = useState(blueprint.dialogueMap || []);
    
    // This effect runs once when the component loads.
    // It simulates the AI having processed the raw transcript.
    // In a real app, this data would be populated by the 'mapDialogueToLocationsAI' call.
    useEffect(() => {
        if (dialogueMap.length === 0 && blueprint.rawTranscript) {
            // Simulate breaking the transcript into paragraphs/chunks.
            const chunks = blueprint.rawTranscript.split('\n').filter(chunk => chunk.trim() !== '');
            
            // In a real app, this would be the output of the mapDialogueToLocationsAI function.
            // We simulate it here for UI development purposes.
            const simulatedAiOutput = chunks.map(chunk => ({
                dialogueChunk: chunk,
                locationTag: 'Unassigned', // AI would make a best guess here
                status: 'needs_review'
            }));
            setDialogueMap(simulatedAiOutput);
        }
    }, [blueprint.rawTranscript, dialogueMap.length]);

    // Extract unique location tags from the footage log to populate dropdowns.
    // This assumes a 'footage_log' exists on the video object.
    const locationTags = [...new Set(video.footage_log?.map(item => item.location_tag) || [])];
    locationTags.unshift('Unassigned'); // Add an option for unassigned dialogue

    const handleLocationChange = (index, newLocationTag) => {
        const updatedMap = [...dialogueMap];
        updatedMap[index].locationTag = newLocationTag;
        updatedMap[index].status = 'confirmed'; // Mark as reviewed by the user
        setDialogueMap(updatedMap);
    };

    const handleNext = () => {
        const newBlueprint = {
            ...blueprint,
            dialogueMap: dialogueMap,
            workflowStatus: 'narrative_refinement' // Move to the next step
        };

        // Here you would trigger the 'proposeNarrativeAI' task
        console.log("Moving to narrative refinement. An AI task would be triggered here.");
        
        updateVideo({
            ...video,
            tasks: {
                ...video.tasks,
                scriptingV2_blueprint: newBlueprint
            }
        });
    };
    
    const allDialogueAssigned = dialogueMap.every(item => item.locationTag !== 'Unassigned');

    return (
        <div className="p-4 border rounded-lg">
            <h2 className="text-xl font-bold mb-3">Step 2: Verify Dialogue Mapping</h2>
            <p className="mb-4 text-gray-600">
                The AI has analyzed your transcript. Please review its work and assign each dialogue chunk to the correct location.
            </p>
            <div className="space-y-4">
                {dialogueMap.map((item, index) => (
                    <div key={index} className="p-3 border rounded-md bg-gray-50 flex items-start">
                        <p className="flex-grow mr-4 text-gray-800">{item.dialogueChunk}</p>
                        <select
                            value={item.locationTag}
                            onChange={(e) => handleLocationChange(index, e.target.value)}
                            className="p-2 border rounded bg-white"
                        >
                            {locationTags.map(tag => (
                                <option key={tag} value={tag}>{tag}</option>
                            ))}
                        </select>
                    </div>
                ))}
            </div>
            <div className="mt-4 flex justify-end">
                <button
                    onClick={handleNext}
                    disabled={!allDialogueAssigned}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400"
                >
                    Confirm Mapping & Propose Narrative
                </button>
            </div>
        </div>
    );
};

export default Step2_DialogueMapper;
