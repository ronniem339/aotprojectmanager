// creators-hub/js/utils/ai/scriptingV2/createInitialBlueprintAI.js

// This AI utility function is the first creative step in the V2 workflow.
// It takes the user's raw notes and, using the project's context and style guides,
// generates a structured, narrative-driven blueprint for the video.

// We need a UUID generator for unique shot and scene IDs.
const simpleUUID = () => ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
);

window.aiUtils.createInitialBlueprintAI = async ({ initialThoughts, video, project, settings }) => { // CHANGED: Attached to window.aiUtils
    console.log("Generating Initial Blueprint with AI...");

    // --- Input Validation ---
    if (!initialThoughts || typeof initialThoughts !== 'string') {
        throw new Error("Initial thoughts for blueprint creation are required and must be a string.");
    }
    if (!video || !video.title) {
        throw new Error("Video context (title) is missing for blueprint creation.");
    }
    if (!project || !project.footageInventory) {
        // Footage inventory might be empty but the object itself should exist for mapping
        console.warn("Project or footage inventory missing; proceeding without footage notes.");
    }
    if (!settings || !settings.knowledgeBases) {
        throw new Error("User settings are incomplete for AI blueprint creation.");
    }

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
        Based on all the information above, create a structured Creative Blueprint. The blueprint must be a list of shots.
        1.  **Analyze the Brain Dump:** Identify the core message, key points, and narrative goal.
        2.  **Structure the Narrative:** Create a logical story flow with a hook, rising action, and a conclusion. Group shots that serve the same purpose into scenes.
        3.  **Create Shots:** For each scene, create a sequence of shots.
        
        **CRITICAL INSTRUCTIONS FOR JSON OUTPUT:**
        For EACH and EVERY shot in the output, you MUST:
        a.  **Assign a Location:** Set the "location" field to one of the names from the "Featured Locations" list provided above.
        b.  **Assign a Scene ID:** Group related shots by giving them the same "scene_id". A new "scene_id" should be generated only when the location changes or the narrative purpose shifts significantly.
        c.  **Assign a Narrative Purpose:** All shots in the same scene must have the same "scene_narrative_purpose".
        d.  **Adhere to the JSON Schema:** Your final output MUST be a JSON object that strictly follows the provided schema. Ensure every required field is present. Generate unique UUIDs for shot_id and scene_id.
    `;

    // MODIFICATION: Changed 'location_name' to 'location' for consistency.
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
                        location: { type: "STRING" }, // Changed from location_name
                        shot_type: { type: "STRING" },
                        shot_description: { type: "STRING" },
                        voiceover_script: { type: "STRING" },
                        on_camera_dialogue: { type: "STRING" },
                        ai_research_notes: { type: "ARRAY", items: { type: "STRING" } },
                        creator_experience_notes: { type: "STRING" },
                        estimated_time_seconds: { type: "NUMBER" },
                    },
                    // MODIFICATION: Made 'location' required.
                    required: ["shot_id", "scene_id", "scene_narrative_purpose", "location", "shot_type", "shot_description", "estimated_time_seconds"]
                }
            }
        },
        required: ["shots"]
    };

    let response;
    try {
        response = await window.aiUtils.callGeminiAPI(prompt, settings, { taskTier: 'heavy' }, { responseSchema });

        if (!response || !Array.isArray(response.shots)) {
            console.error("AI response is malformed:", response);
            throw new Error("AI returned an invalid blueprint structure. Please try again.");
        }

        // --- MODIFICATION: Simplified the post-processing logic ---
        // The AI is now primarily responsible for structure. This is a fallback/validation step.
        response.shots.forEach(shot => {
            // Ensure shot_id exists or generate one
            shot.shot_id = shot.shot_id || simpleUUID();
            shot.scene_id = shot.scene_id || 'unassigned'; // Assign a default if missing

            // Ensure required text fields are not undefined, to prevent crashes.
            shot.location = shot.location || "Location Not Assigned";
            shot.scene_narrative_purpose = shot.scene_narrative_purpose || "Narrative Not Assigned";
            shot.shot_type = shot.shot_type || "Shot Type Not Assigned";
            shot.shot_description = shot.shot_description || "Description Not Assigned";

            // Ensure estimated_time_seconds is a number and positive
            if (typeof shot.estimated_time_seconds !== 'number' || shot.estimated_time_seconds <= 0) {
                shot.estimated_time_seconds = 5;
            }
        });

    } catch (err) {
        console.error("Error creating initial blueprint with AI:", err);
        throw new Error(`Failed to generate initial blueprint: ${err.message || "An unknown AI error occurred."}`);
    }

    return response;
};
