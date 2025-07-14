// WRITE to file: ./creators-hub/js/components/ProjectView/tasks/ScriptingV2/Step1_TranscriptInput.js

const { useState } = React;

window.Step1_TranscriptInput = ({ video, updateVideo }) => {
    const { handlers } = window.useAppState(); // Access global handlers
    const blueprint = video?.tasks?.scriptingV2_blueprint || {};
    
    const [transcript, setTranscript] = useState(blueprint.rawTranscript || '');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleNext = () => {
        setIsProcessing(true);
        
        // This is where you will trigger the first AI task
        // const taskId = `scriptingV2-map-dialogue-${video.id}-${Date.now()}`;
        // handlers.triggerAiTask({
        //     id: taskId,
        //     type: 'scriptingV2-map-dialogue',
        //     name: 'Mapping Dialogue to Locations',
        //     aiFunction: window.aiUtils.mapDialogueToLocationsAI,
        //     args: { videoId: video.id, transcript }
        // }).then(dialogueMap => {
        //     const newBlueprint = { ... };
        //     updateVideo(...);
        //     setIsProcessing(false);
        // });

        // For now, we'll simulate the update to move to the next step
        console.log("Triggering AI task 'mapDialogueToLocationsAI'...");
        setTimeout(() => { // Simulate async AI call
            const newBlueprint = {
                ...blueprint,
                rawTranscript: transcript,
                workflowStatus: 'dialogue_mapping' // Move to the next step
            };
            updateVideo({
                ...video,
                tasks: { ...video.tasks, scriptingV2_blueprint: newBlueprint }
            });
            setIsProcessing(false);
        }, 1000);
    };

    return React.createElement('div', { className: 'p-4 border border-gray-700 rounded-lg' },
        React.createElement('h2', { className: 'text-xl font-bold text-white mb-3' }, "Step 1: Input Your On-Camera Transcript"),
        React.createElement('p', { className: 'mb-4 text-gray-400' },
            "Paste the full, unedited transcript of all your on-camera dialogue here. This will form the foundation of your video's narrative."
        ),
        React.createElement('textarea', {
            className: 'w-full h-64 p-2 border border-gray-600 rounded bg-gray-900 text-white',
            value: transcript,
            onChange: (e) => setTranscript(e.target.value),
            placeholder: 'Paste your transcript here...'
        }),
        React.createElement('div', { className: 'mt-4 flex justify-end' },
            React.createElement('button', {
                onClick: handleNext,
                disabled: !transcript.trim() || isProcessing,
                className: 'btn btn-primary disabled:opacity-50'
            }, isProcessing ? 'Processing...' : 'Map Dialogue to Locations')
        )
    );
};
