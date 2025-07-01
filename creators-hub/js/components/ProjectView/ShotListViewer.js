// creators-hub/js/components/ProjectView/ShotListViewer.js

window.ShotListViewer = ({ video, project }) => {
  const useAppState = window.useAppState;
  const callGeminiAPI = window.aiUtils.callGeminiAPI;
  const { React } = window;
  const LoadingSpinner = window.LoadingSpinner;

  // FIX: Get dispatch from state, not the non-existent addAlert function.
  const { settings, dispatch } = useAppState();
  const [shotListData, setShotListData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  // FIX: Add state to handle specific errors gracefully in the UI.
  const [errorState, setErrorState] = React.useState(null);

  React.useEffect(() => {
    if (video && project && video.script) {
      generateShotList();
    }
  }, [video, project]);

  const generateShotList = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const onCameraTranscripts = project.onCameraDescriptions || {};
      const prompt = `
        You are an expert video editor... [Prompt unchanged] ...
        ---
        ${video.script} 
        ---
        ... [Rest of prompt unchanged] ...
      `;

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
      // FIX: If the specific API key error occurs, set it in state to show a custom message.
      if (error.message.includes("Gemini API Key is not set")) {
        setErrorState({ type: 'apiKeyMissing', message: error.message });
      } else {
        setErrorState({ type: 'generalError', message: 'An unexpected error occurred.' });
      }
      // FIX: Use the correct dispatch function to show a global alert.
      dispatch({
        type: 'ADD_ALERT',
        payload: { type: 'error', message: `Failed to generate shot list: ${error.message}` }
      });
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

  // FIX: Render a user-friendly message if the API key is missing.
  if (errorState && errorState.type === 'apiKeyMissing') {
      return (
        <div className="p-8 text-center text-gray-300 bg-red-900/20 rounded-lg">
            <p className="font-bold text-lg text-red-400 mb-2">Configuration Error</p>
            <p>{errorState.message}</p>
            <p className="mt-2 text-sm text-gray-400">Please go to "My Studio" > "Settings" to add your API key.</p>
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
