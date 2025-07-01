// creators-hub/js/components/ProjectView/ShotListViewer.js

window.ShotListViewer = ({ video, project, settings, onUpdateTask }) => {
  const { React } = window;
  const { useState, useEffect } = React;
  const callGeminiAPI = window.aiUtils.callGeminiAPI;
  const LoadingSpinner = window.LoadingSpinner;

  const [shotListData, setShotListData] = useState(video.tasks?.shotList || null);
  const [isLoading, setIsLoading] = useState(!shotListData);
  const [error, setError] = useState('');

  useEffect(() => {
    // Only generate the list if it doesn't already exist in the video data
    if (!video.tasks?.shotList && video.script) {
      generateAndSaveShotList();
    }
  }, [video.id, video.tasks?.shotList]); // Rerun if the video changes or shotlist is reset

  const generateAndSaveShotList = async () => {
    setIsLoading(true);
    setError('');
    try {
        // --- STEP 1: Programmatically create a master list of all content blocks ---
        const contentBlocks = [];

        // Add all on-camera dialogue blocks, pre-enriched with place_id
        const onCameraTranscripts = video.tasks?.onCameraDescriptions || {};
        for (const locationName in onCameraTranscripts) {
            const dialogue = onCameraTranscripts[locationName];
            if (dialogue && dialogue.trim() !== '') {
                const locationData = project.locations.find(l => l.name === locationName);
                contentBlocks.push({
                    id: `oncamera-${locationData?.place_id || locationName}`,
                    type: 'onCamera',
                    cue: dialogue,
                    locationName: locationName,
                    place_id: locationData?.place_id || null,
                });
            }
        }

        // Add all voiceover paragraphs as blocks
        const voiceoverParagraphs = video.script.split('\n\n').filter(p => p.trim() !== '');
        voiceoverParagraphs.forEach((p, index) => {
            contentBlocks.push({
                id: `vo-${index}`,
                type: 'voiceover',
                cue: p.trim(),
                locationName: 'Unknown',
                place_id: null
            });
        });

        // --- STEP 2: Use AI for the simpler task of sequencing and location tagging ---
        const prompt = `
            You are an expert video editor. Your task is to sequence a list of content blocks (voiceover and on-camera dialogue) into a coherent narrative timeline. You also need to assign the correct location to each voiceover block.

            **Input:**
            You will receive a JSON array of "Content Blocks". Each block has an "id", "type" ('onCamera' or 'voiceover'), and the "cue" (the text content). On-camera blocks are already assigned to a location.

            **Your Tasks:**
            1.  **Sequence:** Arrange all the provided content blocks into the correct storytelling order. The on-camera segments should be placed logically within the flow of the voiceover.
            2.  **Assign Locations:** For each "voiceover" block, determine which location it best describes from the "Available Locations" list and update its "locationName" field.
            3.  **Return Ordered List:** Your final output MUST be a valid JSON array containing ALL of the original content block objects, now in the correct order and with updated "locationName" fields for the voiceovers. Do not change the 'id' or 'cue' of any block.

            ---
            **CONTEXT - AVAILABLE LOCATIONS:**
            ${project.locations.map(loc => `- ${loc.name}`).join('\n')}
            - General
            ---
            **CONTEXT - SCRIPT PLAN (for structure):**
            ${video.tasks?.scriptPlan || 'No plan provided.'}
            ---
            **CONTENT BLOCKS TO SEQUENCE AND TAG:**
            ${JSON.stringify(contentBlocks, null, 2)}
            ---

            Now, return the complete, sequenced, and location-tagged JSON array of content blocks.
        `;
        
        // --- STEP 3: Call AI (as a complex task) and Enrich the Sequenced Data ---
        const sequencedBlocks = await callGeminiAPI(prompt, settings, { responseMimeType: "application/json" }, true);
        
        const enrichedShotList = sequencedBlocks.map(block => {
            const location = project.locations.find(l => l.name === block.locationName);
            const placeId = location ? location.place_id : null;
            const footage = placeId && project.footageInventory ? project.footageInventory[placeId] : null;

            return {
                ...block,
                place_id: placeId,
                availableFootage: footage ? {
                    bRoll: !!(footage.bRoll && footage.bRoll.length > 0),
                    onCamera: !!(footage.onCamera && footage.onCamera.length > 0),
                    drone: !!(footage.drone && footage.drone.length > 0),
                } : { bRoll: false, onCamera: false, drone: false },
            };
        });

        setShotListData(enrichedShotList);
        // Save the generated and enriched list to Firestore
        onUpdateTask('scripting', 'complete', { 'tasks.shotList': enrichedShotList });

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
        <p className="ml-2 text-gray-300">Generating Shot List for the first time...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-gray-300 bg-red-900/20 rounded-lg">
        <p className="font-bold text-lg text-red-400 mb-2">An Error Occurred</p>
        <p>{error}</p>
        <p className="mt-2 text-sm text-gray-400">Please check your settings and try again. You can reset by going back to the Scripting task and re-saving the script.</p>
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
                  {(row.availableFootage.bRoll || row.availableFootage.onCamera || row.availableFootage.drone) ? (
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
