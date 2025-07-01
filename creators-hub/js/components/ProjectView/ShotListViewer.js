// creators-hub/js/components/ProjectView/ShotListViewer.js

window.ShotListViewer = ({ video, project, settings, onUpdateTask }) => {
  const { React } = window;
  const { useState, useEffect } = React;
  const callGeminiAPI = window.aiUtils.callGeminiAPI;
  const LoadingSpinner = window.LoadingSpinner;

  // FIX: Use shotListData from the video object if it exists, otherwise null.
  const [shotListData, setShotListData] = useState(video.tasks?.shotList || null);
  // FIX: Only show loading if we don't have data already.
  const [loading, setLoading] = useState(!shotListData);
  const [error, setError] = useState('');

  useEffect(() => {
    // FIX: Only generate the list if it doesn't already exist.
    if (!shotListData && video.script) {
      generateShotList();
    }
  }, [video, project, shotListData]);

  const generateShotList = async () => {
    setLoading(true);
    setError('');
    try {
      const onCameraTranscripts = project.onCameraDescriptions || {};
      
      // FIX: New, more comprehensive prompt to build a unified timeline.
      const prompt = `
        You are an expert video editor creating a "paper edit" timeline. Your task is to merge a voiceover script with on-camera dialogue sections into a single, sequential shot list.

        You will be given:
        1.  **Script Plan:** A high-level outline of the video's structure.
        2.  **Voiceover Script:** The full text for the narration.
        3.  **On-Camera Dialogue:** A JSON object of transcripts for segments where the host speaks to the camera, keyed by location name.

        **Your Task:**
        Create a timeline that correctly interleaves the voiceover and on-camera segments. The final output MUST be a valid JSON array of objects. Each object represents a scene and MUST have the following properties:

        -   "type": (string) Must be either "voiceover" or "onCamera".
        -   "locationName": (string) The name of the location that best matches this scene. Use a location from the provided list.
        -   "cue": (string) The text for this scene. For "voiceover", this is a paragraph from the voiceover script. For "onCamera", this is the full transcript from the On-Camera Dialogue.

        **CRITICAL INSTRUCTIONS:**
        -   Analyze the Script Plan and Voiceover Script to understand the narrative flow.
        -   Place the "onCamera" segments where they logically fit within the voiceover narration.
        -   Every piece of the Voiceover Script and every On-Camera Dialogue transcript must be included in the final shot list exactly once.
        -   Do not invent new content. Only use the text provided.

        ---
        **1. SCRIPT PLAN (for structure):**
        ${video.tasks?.scriptPlan || 'No plan provided.'}
        ---
        **2. VOICEOVER SCRIPT (for narration):**
        ${video.script}
        ---
        **3. ON-CAMERA DIALOGUE (to be inserted):**
        ${JSON.stringify(onCameraTranscripts, null, 2)}
        ---
        **4. AVAILABLE LOCATIONS:**
        ${project.locations.map(loc => `- ${loc.name}`).join('\n')}
        - General
        ---

        Now, generate the complete JSON shot list timeline.
      `;

      const parsedResponse = await callGeminiAPI(prompt, settings, { responseMimeType: "application/json" });
      
      const enhancedShotList = parsedResponse.map(shot => {
        const location = project.locations.find(loc => loc.name === shot.locationName);
        const footage = location && project.footageInventory ? project.footageInventory[location.place_id] : null;

        return {
          ...shot,
          availableFootage: footage ? {
            bRoll: footage.bRoll && footage.bRoll.length > 0,
            onCamera: footage.onCamera && footage.onCamera.length > 0,
            drone: footage.drone && footage.drone.length > 0,
          } : { bRoll: false, onCamera: false, drone: false },
        };
      });

      // FIX: Save the generated list to Firestore so we don't generate it again.
      onUpdateTask('scripting', 'complete', { 'tasks.shotList': enhancedShotList });
      setShotListData(enhancedShotList);

    } catch (err) {
      console.error('Error generating shot list:', err);
      setError(`Failed to generate shot list: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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
          <p className="mt-2 text-sm text-gray-400">Please check your settings (especially your API key) and try again.</p>
      </div>
    );
  }

  if (!shotListData || shotListData.length === 0) {
    return <p className="p-8 text-center text-gray-400">Could not generate a shot list for this script.</p>;
  }

  return (
    <div className="p-4">
      <div className="overflow-x-auto rounded-lg shadow">
        <table className="w-full text-sm text-left text-gray-300">
          <thead className="bg-gray-700/50 text-xs text-gray-400 uppercase">
            <tr>
              <th scope="col" className="px-6 py-3">Type</th>
              <th scope="col" className="px-6 py-3">Cue / Transcript</th>
              <th scope="col" className="px-6 py-3">Scene Location</th>
              <th scope="col" className="px-6 py-3">Available Footage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {shotListData.map((row, index) => (
              <tr key={index} className={`hover:bg-gray-800/50 ${row.type === 'onCamera' ? 'bg-blue-900/20' : ''}`}>
                <td className="px-6 py-4 font-medium">
                  {row.type === 'onCamera' ? (
                    <span className="px-2 py-1 text-xs font-bold text-blue-300 bg-blue-800/50 rounded-full">On-Camera</span>
                  ) : (
                    <span className="px-2 py-1 text-xs text-gray-400">Voiceover</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-pre-wrap">{row.cue}</td>
                <td className="px-6 py-4">{row.locationName}</td>
                <td className="px-6 py-4">
                  {row.availableFootage.bRoll && <p>✅ B-Roll</p>}
                  {row.availableFootage.drone && <p>✅ Drone Footage</p>}
                  {row.availableFootage.onCamera && <p>✅ On-Camera Segment</p>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
