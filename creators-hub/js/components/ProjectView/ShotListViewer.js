// creators-hub/js/components/ProjectView/ShotListViewer.js

window.ShotListViewer = ({ video, project, settings, onUpdateTask, onRegenerate }) => {
  const { React } = window;
  const { useState, useEffect, useCallback } = React;
  const callGeminiAPI = window.aiUtils.callGeminiAPI;
  const LoadingSpinner = window.LoadingSpinner;

  const [shotListData, setShotListData] = useState(video.tasks?.shotList || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('Generating Shot List...');

  const generateAndSaveShotList = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setShotListData(null);
    setLoadingMessage('Step 1/3: Assembling content from your script...');
    
    try {
        // --- STEP 1: Assemble all content blocks using the definitive, user-provided data ---
        const allContentBlocks = [];
        const locationAnswers = video.tasks?.locationAnswers || {};
        const onCameraDescriptions = video.tasks?.onCameraDescriptions || {};

        // Add on-camera blocks
        for (const locationName in onCameraDescriptions) {
            // Handle both direct strings and the object format from transcript parsing
            const descriptionData = onCameraDescriptions[locationName];
            const transcript = Array.isArray(descriptionData) ? descriptionData.join('\n') : (typeof descriptionData === 'string' ? descriptionData : '');

            if (transcript && transcript.trim() !== '') {
                const locationData = project.locations.find(l => l.name === locationName);
                allContentBlocks.push({
                    id: `oncamera-${locationData?.place_id || locationName.replace(/\s+/g, '-')}`,
                    type: 'onCamera',
                    cue: transcript,
                    locationName: locationName,
                    place_id: locationData?.place_id || null,
                });
            }
        }

        // Add voiceover blocks
        const voiceoverQuestions = video.tasks?.locationQuestions || [];
        voiceoverQuestions.forEach((questionObj, index) => {
            const cue = questionObj.question; // Access the text cue correctly
            const userAnswer = (video.tasks?.userExperiences || {})[index];
            
            // Only include voiceover sections that have been answered by the user.
            if (cue && typeof cue === 'string' && cue.trim() !== '' && userAnswer && userAnswer.trim() !== '') {
                allContentBlocks.push({
                    id: `vo-${index}`,
                    type: 'voiceover',
                    cue: userAnswer, // Use the user's answer as the cue
                    locationName: locationAnswers[cue] || 'General',
                    place_id: project.locations.find(l => l.name === (locationAnswers[cue] || 'General'))?.place_id || null,
                });
            }
        });

        if (allContentBlocks.length === 0) {
            setError("No content found to generate a shot list. Please ensure you have answered the scripting questions and/or provided on-camera dialogue.");
            setIsLoading(false);
            return;
        }

        // --- STEP 2: Use AI for the final task of sequencing all blocks ---
        setLoadingMessage('Step 2/3: Sequencing timeline...');
        const sequencingPrompt = `
            You are an expert video editor. Your only task is to sequence a list of pre-made content blocks (voiceover and on-camera dialogue) into a coherent narrative timeline.

            Input:
            You will receive a JSON array of "Content Blocks". Each block is pre-tagged with its type, content, and location.

            Your Task:
            Arrange all the provided content blocks into the correct storytelling order. The on-camera segments should be placed logically within the flow of the voiceover.
            Your final output MUST be a valid JSON array containing ALL of the original content block objects, now in the correct order. Do not change any properties of the objects.

            CONTEXT - SCRIPT PLAN (for structure):
            ${video.tasks?.scriptPlan || 'No plan provided.'}

            CONTENT BLOCKS TO SEQUENCE:
            ${JSON.stringify(allContentBlocks.map(({id, type, cue, locationName}) => ({id, type, cue, locationName})), null, 2)}

            Now, return the complete, sequenced JSON array of content blocks.
        `;
        const sequencedBlocks = await callGeminiAPI(sequencingPrompt, settings, { responseMimeType: "application/json" }, true);

        // --- STEP 3: Final enrichment and saving ---
        setLoadingMessage('Step 3/3: Finalizing and saving...');
        const finalShotList = sequencedBlocks.map(block => {
            const originalBlock = allContentBlocks.find(b => b.id === block.id);
            if (!originalBlock) return null; 
            
            const footage = originalBlock.place_id && project.footageInventory ? project.footageInventory[originalBlock.place_id] : null;
            return {
                ...originalBlock,
                ...block,
                availableFootage: footage ? {
                    bRoll: !!(footage.bRoll && footage.bRoll.length > 0),
                    onCamera: !!(footage.onCamera && footage.onCamera.length > 0),
                    drone: !!(footage.drone && footage.drone.length > 0),
                } : { bRoll: false, onCamera: false, drone: false },
            };
        }).filter(Boolean);

        setShotListData(finalShotList);
        onUpdateTask('scripting', 'complete', { 'tasks.shotList': finalShotList });

    } catch (err) {
        console.error('Error generating shot list:', err);
        setError(`Failed to generate shot list: ${err.message}`);
    } finally {
        setIsLoading(false);
    }
  }, [video, project, settings, callGeminiAPI, onUpdateTask]);

  useEffect(() => {
    // If the shotList is missing from the video object but a script exists, generate it.
    if (!video.tasks?.shotList && video.script) {
      generateAndSaveShotList();
    } else if (video.tasks?.shotList) {
      // If data exists, ensure we are not in a loading state.
      setShotListData(video.tasks.shotList);
      setIsLoading(false);
    }
  }, [video.id, video.tasks?.shotList, video.script, generateAndSaveShotList]);

  const handleRegenerate = () => {
    onRegenerate().then(() => {
        generateAndSaveShotList();
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <LoadingSpinner />
        <p className="ml-2 text-gray-300">{loadingMessage}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-gray-300 bg-red-900/20 rounded-lg">
        <p className="font-bold text-lg text-red-400 mb-2">An Error Occurred</p>
        <p>{error}</p>
        <button onClick={handleRegenerate} className="mt-4 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg">
            Try Again
        </button>
      </div>
    );
  }

  if (!shotListData || shotListData.length === 0) {
    return (
        <div className="p-8 text-center text-gray-400">
            <p>Could not generate a shot list for this script.</p>
            <button onClick={handleRegenerate} className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">
                Generate Now
            </button>
        </div>
    );
  }

  return (
    <div className="p-1">
      <div className="overflow-x-auto rounded-lg shadow">
        <table className="w-full text-sm text-left text-gray-300">
          <thead className="bg-gray-700/50 text-xs text-gray-400 uppercase sticky top-0 z-10">
            <tr>
              <th scope="col" className="px-4 py-3">Type</th>
              <th scope="col" className="px-4 py-3 w-1/2">Cue / Transcript</th>
              <th scope="col" className="px-4 py-3">Scene Location</th>
              <th scope="col" className="px-4 py-3">Available Footage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {shotListData.map((row, index) => (
              <tr key={row.id || index} className={`hover:bg-gray-800/50 ${row.type === 'onCamera' ? 'bg-blue-900/30' : 'bg-gray-800/20'}`}>
                <td className="px-4 py-4 font-medium align-top">
                  {row.type === 'onCamera' ? (
                    <span className="px-2 py-1 text-xs font-bold text-blue-300 bg-blue-800/50 rounded-full">On-Camera</span>
                  ) : (
                    <span className="px-2 py-1 text-xs text-green-300 bg-green-800/50 rounded-full">Voiceover</span>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-pre-wrap">{row.cue}</td>
                <td className="px-4 py-4 align-top">{row.locationName}</td>
                <td className="px-4 py-4 align-top">
                  {(row.availableFootage?.bRoll || row.availableFootage?.onCamera || row.availableFootage?.drone) ? (
                    <div className="flex flex-col space-y-1">
                      {row.availableFootage.bRoll && <span className="text-xs text-gray-300">✅ B-Roll</span>}
                      {row.availableFootage.onCamera && <span className="text-xs text-gray-300">✅ On-Camera</span>}
                      {row.availableFootage.drone && <span className="text-xs text-gray-300">✅ Drone</span>}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-xs italic">None</p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
