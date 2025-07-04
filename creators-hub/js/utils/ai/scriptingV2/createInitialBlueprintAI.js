// creators-hub/js/utils/ai/scriptingV2/createInitialBlueprintAI.js

// This AI utility function is the first creative step in the V2 workflow.
// It takes the user's raw notes and, using the project's context and style guides,
// generates a structured, narrative-driven blueprint for the video.

// We need a UUID generator for unique shot and scene IDs.
const simpleUUID = () => ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
  (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
);

window.createInitialBlueprintAI = async ({ initialThoughts, video, project, settings }) => {
    console.log("Generating Initial Blueprint with AI...");

    const footageNotes = Object.values(project.footageInventory || {})
        .filter(details => (video.locations_featured || []).includes(details.name))
        .map(details => {
            const footageTypes = [];
            if (details.bRoll) footageTypes.push('B-Roll');
            if (details.onCamera) footageTypes.push('On-Camera');
            if (details.drone) footageTypes.push('Drone');
            return `- ${details.name}: Available Footage: ${footageTypes.join(', ')}`;
        })
        .join('\n');

    // **THE FIX IS HERE:**
    // We are now calling the new V2 style guide prompt generator.
    const styleGuidePrompt = window.aiUtils.getStyleGuidePromptV2(settings);

    const prompt = `
        You are an expert YouTube scriptwriter and video producer. Your task is to take a creator's initial "brain dump" for a video and structure it into a compelling narrative blueprint and shot list.

        **Creator's Style Guide & Tone:**
        ${styleGuidePrompt}

        **Storytelling Principles to Follow:**
        ${settings.knowledgeBases?.storytelling?.videoStorytellingPrinciples || 'Create a clear hook, a developing middle, and a satisfying conclusion.'}

        **Video Context:**
        - **Title:** ${video.title}
        - **Featured Locations:** ${(video.locations_featured || []).join(', ')}
        - **Available Footage Notes:**
        ${footageNotes || 'No specific footage notes provided. Do not assume any footage exists unless it is listed here.'}

        **Creator's Initial Brain Dump:**
        ---
        ${initialThoughts}
        ---

        **Your Task:**
        Based on all the information above, create a structured Creative Blueprint. The blueprint must be a list of scenes, and each scene must contain a list of shots.
        1.  **Analyze the Brain Dump:** Identify the core message, key points, and narrative goal.
        2.  **Structure the Narrative:** Create a logical story flow with a hook, rising action, and a conclusion. Assign a "scene_narrative_purpose" to each scene that reflects its role in the story.
        3.  **Create Shots:** For each scene, create a sequence of shots. A shot can be a "Wide B-Roll Shot", "On-Camera Dialogue", "B-Roll Detail Shot", "Walking and Talking", etc. Be specific. **Crucially, you MUST only suggest shot types that are explicitly mentioned as available in the "Available Footage Notes" for a given location. Do NOT invent footage types (like "Drone Shot") if they are not listed for that location.**
        4.  **Describe the Visuals:** For each shot, write a clear "shot_description".
        5.  **Estimate Timing:** Provide a rough time estimate in seconds for each shot.
        6.  **Adhere to the JSON Schema:** Your final output MUST be a JSON object that strictly follows the provided schema. Ensure every required field is present. Generate unique UUIDs for shot_id and scene_id.
    `;

    const responseSchema = {
      type: "OBJECT",
      properties: {
        shots: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              shot_id: { type: "STRING" },
              scene_id: { type: "STRING" },
              scene_narrative_purpose: { type: "STRING" },
              location_name: { type: "STRING" },
              shot_type: { type: "STRING" },
              shot_description: { type: "STRING" },
              voiceover_script: { type: "STRING" },
              on_camera_dialogue: { type: "STRING" },
              ai_research_notes: { type: "ARRAY", items: { type: "STRING" } },
              creator_experience_notes: { type: "STRING" },
              estimated_time_seconds: { type: "NUMBER" },
            },
            required: ["shot_id", "scene_id", "scene_narrative_purpose", "location_name", "shot_type", "shot_description", "estimated_time_seconds"]
          }
        }
      },
      required: ["shots"]
    };

    // Call the upgraded global function with the 'heavy' task tier and correct generationConfig structure.
    const response = await window.aiUtils.callGeminiAPI(prompt, settings, { taskTier: 'heavy' }, { responseSchema });

    // Add unique IDs to the response shots as a fallback
    if (response && response.shots) {
        let lastSceneId = simpleUUID();
        response.shots.forEach((shot, index) => {
            shot.shot_id = shot.shot_id || simpleUUID();
            if (index > 0 && shot.scene_narrative_purpose !== response.shots[index - 1].scene_narrative_purpose) {
                lastSceneId = simpleUUID();
            }
            shot.scene_id = shot.scene_id || lastSceneId;
        });
    }

    return response;
};
