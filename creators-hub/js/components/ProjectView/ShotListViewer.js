// creators-hub/js/components/ProjectView/ShotListViewer.js

window.ShotListViewer = ({ video, project }) => {
  const useAppState = window.useAppState;
  // FIX: Correctly reference the callGeminiAPI function from the global aiUtils object.
  const callGeminiAPI = window.aiUtils.callGeminiAPI;
  const { React } = window;
  const LoadingSpinner = window.LoadingSpinner;

  // Get settings and addAlert from the global state.
  const { settings, addAlert } = useAppState();
  const [shotListData, setShotListData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (video && project && video.script) {
      generateShotList();
    }
  }, [video, project]);

  const generateShotList = async () => {
    setLoading(true);
    try {
      const onCameraTranscripts = project.onCameraDescriptions || {};

      const prompt = `
        You are an expert video editor and production assistant. Your task is to create a "Shot List" by analyzing a video script and mapping each part of it to a specific location and any corresponding on-camera dialogue.

        You will be given:
        1. A full video script.
        2. A list of available locations for the project.
        3. A JSON object containing transcripts of on-camera dialogue, keyed by location.

        Your task is to break down the script into paragraphs (cues for the voiceover). For each paragraph, you must identify the most appropriate location from the provided list.

        **RULES:**
        - The output must be a valid JSON array of objects.
        - Each object in the array represents a "shot" and must have the following properties:
          - "scriptCue": The paragraph from the voiceover script.
          - "locationName": The name of the location that best matches the script cue. If no specific location matches, use "General".
          - "onCameraTranscript": If the script cue corresponds to a piece of on-camera dialogue, provide the exact transcript for that location. If it's a voiceover-only cue, this must be null.

        **Full Video Script:**
        ---
        ${video.script} 
        ---

        **Available Locations:**
        ---
        ${project.locations.map(loc => `- ${loc.name}`).join('\n')}
        - General
        ---

        **On-Camera Dialogue Transcripts:**
        ---
        ${JSON.stringify(onCameraTranscripts, null, 2)}
        ---

        Now, generate the JSON shot list based on the script, locations, and dialogue provided.
      `;

      // FIX: Call the API with the correct arguments (prompt, settings, and generationConfig).
      // The shared API function handles JSON parsing, so we await the final result directly.
      const parsedResponse = await callGeminiAPI(prompt, settings, { responseMimeType: "application/json" });

      const enhancedShotList = parsedResponse.map(shot => {
        const location = project.locations.find(loc => loc.name === shot.locationName);
        const footage = location ? project.footageInventory[location.place_id] : null;

        return {
          ...shot,
          availableFootage: footage ? {
            bRoll: footage.bRoll && footage.bRoll.length > 0,
            onCamera: footage.onCamera && footage.onCamera.length > 0,
            drone: footage.drone && footage.drone.length > 0,
          } : { bRoll: false, onCamera: false, drone: false },
        };
      });

      setShotListData(enhancedShotList);
    } catch (error) {
      console.error('Error generating shot list:', error);
      addAlert('error', `Failed to generate shot list: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <LoadingSpinner />
        <p className="ml-2 text-gray-300">Generating Shot List...</p>
      </div>
    );
  }

  if (!shotListData || shotListData.length === 0) {
    return <p className="p-8 text-center text-gray-400">No shot list could be generated for this script.</p>;
  }

  return (
    <div className="p-4">
      <div className="overflow-x-auto rounded-lg shadow">
        <table className="w-full text-sm text-left text-gray-300">
          <thead className="bg-gray-700/50 text-xs text-gray-400 uppercase">
            <tr>
              <th scope="col" className="px-6 py-3">Voiceover Script Cue</th>
              <th scope="col" className="px-6 py-3">Scene Location</th>
              <th scope="col" className="px-6 py-3">Available Footage</th>
              <th scope="col" className="px-6 py-3">On-Camera Dialogue Transcript</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {shotListData.map((row, index) => (
              <tr key={index} className="hover:bg-gray-800/50">
                <td className="px-6 py-4 whitespace-pre-wrap">{row.scriptCue}</td>
                <td className="px-6 py-4">{row.locationName}</td>
                <td className="px-6 py-4">
                  {row.availableFootage.bRoll && <p>✅ B-Roll</p>}
                  {row.availableFootage.drone && <p>✅ Drone Footage</p>}
                  {row.availableFootage.onCamera && <p>✅ On-Camera Segment</p>}
                </td>
                <td className="px-6 py-4 whitespace-pre-wrap">{row.onCameraTranscript || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
