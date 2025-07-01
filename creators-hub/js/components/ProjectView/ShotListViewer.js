// creators-hub/js/components/ProjectView/ShotListViewer.js

window.ShotListViewer = ({ video, project }) => {
  // Dependencies are now accessed from global objects like 'window' and 'MaterialUI'
  const { useAppState } = window;
  const { callGeminiAPI } = window;
  const { React } = window;
  const {
    Box,
    CircularProgress,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
  } = MaterialUI;

  const { addAlert } = useAppState();
  const [shotListData, setShotListData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (video && project && video.finalScript) {
      generateShotList();
    }
  }, [video, project]);

  const generateShotList = async () => {
    setLoading(true);
    try {
      // Note: project.onCameraDescriptions might not exist on older projects. Default to empty object.
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
        ${video.finalScript}
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

      const aiResponse = await callGeminiAPI(prompt);
      const parsedResponse = JSON.parse(aiResponse);

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
      addAlert('error', 'Failed to generate the shot list. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Generating Shot List...</Typography>
      </Box>
    );
  }

  if (!shotListData || shotListData.length === 0) {
    return <Typography sx={{ my: 4, textAlign: 'center' }}>No shot list could be generated for this script.</Typography>;
  }

  return (
    <Box sx={{ p: 2 }}>
        <Typography variant="h5" gutterBottom>Shot List</Typography>
        <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="shot list table">
                <TableHead>
                    <TableRow>
                        <TableCell>Voiceover Script Cue</TableCell>
                        <TableCell>Scene Location</TableCell>
                        <TableCell>Available Footage</TableCell>
                        <TableCell>On-Camera Dialogue Transcript</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {shotListData.map((row, index) => (
                        <TableRow key={index}>
                            <TableCell component="th" scope="row">
                                {row.scriptCue}
                            </TableCell>
                            <TableCell>{row.locationName}</TableCell>
                            <TableCell>
                                {row.availableFootage.bRoll && <Typography variant="body2">✅ B-Roll</Typography>}
                                {row.availableFootage.drone && <Typography variant="body2">✅ Drone Footage</Typography>}
                                {row.availableFootage.onCamera && <Typography variant="body2">✅ On-Camera Segment</Typography>}
                            </TableCell>
                            <TableCell>{row.onCameraTranscript || 'N/A'}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    </Box>
  );
};
