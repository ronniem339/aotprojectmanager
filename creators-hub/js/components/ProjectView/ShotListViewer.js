// creators-hub/js/components/ProjectView/ShotListViewer.js

window.ShotListViewer = ({ video, project, settings, onUpdateTask }) => {
  const { React } = window;
  const { useState, useEffect } = React;
  const callGeminiAPI = window.aiUtils.callGeminiAPI;
  const LoadingSpinner = window.LoadingSpinner;

  const [shotListData, setShotListData] = useState(video.tasks?.shotList || null);
  const [isLoading, setIsLoading] = useState(!shotListData);
  const [error, setError] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('Generating Shot List for the first time...');

  useEffect(() => {
    if (!video.tasks?.shotList && video.script) {
      generateAndSaveShotList();
    }
  }, [video.id, video.tasks?.shotList]);

  const generateAndSaveShotList = async () => {
    setIsLoading(true);
    setError('');
    try {
        // --- STEP 1: Programmatically create a list of all voiceover and on-camera blocks ---
        setLoadingMessage('Step 1/4: Assembling content blocks...');
        const onCameraBlocks = [];
        const onCameraDescriptions = video.tasks?.onCameraDescriptions || {};
        for (const locationName in onCameraDescriptions) {
            const dialogueObject = onCameraDescriptions[locationName];
            const transcript = dialogueObject?.transcript;
            if (transcript && typeof transcript === 'string' && transcript.trim() !== '') {
                const locationData = project.locations.find(l => l.name === locationName);
                onCameraBlocks.push({
                    id: `oncamera-${locationData?.place_id || locationName}`,
                    type: 'onCamera',
                    cue: transcript,
                    locationName: locationName,
                    place_id: locationData?.place_id || null,
                });
            }
        }
        const voiceoverBlocks = video.script.split('\n\n').filter(p => p.trim() !== '').map((p, index) => ({
            id: `vo-${index}`,
            type: 'voiceover',
            cue: p.trim(),
        }));

        // --- STEP 2: Use a targeted AI call to assign locations to voiceover blocks ---
        setLoadingMessage('Step 2/4: Tagging locations to voiceover...');
        const locationTaggingPrompt = `
            You are a production assistant. Your task is to assign a location to each paragraph of a voiceover script.
            Based on the script's content and the overall plan, match each voiceover cue to the most appropriate location from the provided list.

            **CONTEXT - SCRIPT PLAN:**
            ${video.tasks?.scriptPlan || 'No plan provided.'}

            **CONTEXT - AVAILABLE LOCATIONS:**
            ${project.locations.map(loc => `- ${loc.name}`).join('\n')}
            - General

            **VOICEOVER CUES TO TAG:**
            ${JSON.stringify(voiceoverBlocks.map(b => ({id: b.id, cue: b.cue})), null, 2)}

            Your output MUST be a valid JSON object that maps each voiceover 'id' to its 'locationName'. Example: {"vo-0": "Green Line", "vo-1": "Venetian Walls"}
        `;
        const locationMap = await callGeminiAPI(locationTaggingPrompt, settings, { responseMimeType: "application/json" }, false);

        const allContentBlocks = [
            ...onCameraBlocks,
            ...voiceoverBlocks.map(block => ({...block, locationName: locationMap[block.id] || 'General' }))
        ].map(block => {
            const location = project.locations.find(l => l.name === block.locationName);
            return {...block, place_id: location?.place_id || null };
        });

        // --- STEP 3: Use AI for the final, simpler task of sequencing all blocks ---
        setLoadingMessage('Step 3/4: Sequencing timeline...');
        const sequencingPrompt = `
            You are an expert video editor. Your only task is to sequence a list of content blocks (voiceover and on-camera dialogue) into a coherent narrative timeline.

            **Input:**
            You will receive a JSON array of "Content Blocks". Each block is pre-tagged with its type, content, and location.

            **Your Task:**
            Arrange all the provided content blocks into the correct storytelling order. The on-camera segments should be placed logically within the flow of the voiceover.
            Your final output MUST be a valid JSON array containing ALL of the original content block objects, now in the correct order. Do not change any properties of the objects.

            **CONTEXT - SCRIPT PLAN (for structure):**
            ${video.tasks?.scriptPlan || 'No plan provided.'}

            **CONTENT BLOCKS TO SEQUENCE:**
            ${JSON.stringify(allContentBlocks.map(({id, type, cue, locationName}) => ({id, type, cue, locationName})), null, 2)}

            Now, return the complete, sequenced JSON array of content blocks.
        `;
        const sequencedBlocks = await callGeminiAPI(sequencingPrompt, settings, { responseMimeType: "application/json" }, true);

        // --- STEP 4: Final enrichment and saving ---
        setLoadingMessage('Step 4/4: Finalizing and saving...');
        const finalShotList = sequencedBlocks.map(block => {
            const originalBlock = allContentBlocks.find(b => b.id === block.id);
            const footage = originalBlock.place_id && project.footageInventory ? project.footageInventory[originalBlock.place_id] : null;
            return {
                ...originalBlock, // Use the original block to preserve place_id
                ...block, // Overlay the sequenced data (which just confirms order and locationName)
                availableFootage: footage ? {
                    bRoll: !!(footage.bRoll && footage.bRoll.length > 0),
                    onCamera: !!(footage.onCamera && footage.onCamera.length > 0),
                    drone: !!(footage.drone && footage.drone.length > 0),
                } : { bRoll: false, onCamera: false, drone: false },
            };
        });

        setShotListData(finalShotList);
        onUpdateTask('scripting', 'complete', { 'tasks.shotList': finalShotList });

    } catch (err) {
        console.error('Error generating shot list:', err);
        setError(`Failed to generate shot list: ${err.message}`);
    } finally {
        setIsLoading(false);
    }
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
        <p className="mt-2 text-sm text-gray-400">Please check your settings and try again. You can reset by clicking "Regenerate".</p>
      </div>
    );
  }

  if (!shotListData || shotListData.length === 0) {
    return <p className="p-8 text-center text-gray-400">Could not generate a shot list for this script.</p>;
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
              <tr key={row.id || index} className={`hover:bg-gray-800/50 ${row.type === 'onCamera' ? 'bg-blue-900/30' : ''}`}>
                <td className="px-4 py-4 font-medium align-top">
                  {row.type === 'onCamera' ? (
                    <span className="px-2 py-1 text-xs font-bold text-blue-300 bg-blue-800/50 rounded-full">On-Camera</span>
                  ) : (
                    <span className="px-2 py-1 text-xs text-gray-400">Voiceover</span>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-pre-wrap">{row.cue}</td>
                <td className="px-4 py-4 align-top">{row.locationName}</td>
                <td className="px-4 py-4 align-top">
                  {(row.availableFootage?.bRoll || row.availableFootage?.onCamera || row.availableFootage?.drone) ? (
                    <>
                      {row.availableFootage.bRoll && <p>✅ B-Roll</p>}
                      {row.availableFootage.onCamera && <p>✅ On-Camera</p>}
                      {row.availableFootage.drone && <p>✅ Drone</p>}
                    </>
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
