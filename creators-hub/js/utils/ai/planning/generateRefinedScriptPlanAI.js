window.aiUtils.generateRefinedScriptPlanAI = async ({ scriptPlan, onCameraDescriptions, videoTitle, settings, footageNotes }) => {
    console.log("AI: Generating refined script plan with on-camera details.", { scriptPlan, onCameraDescriptions, videoTitle });

    const styleGuidePrompt = window.aiUtils.getStyleGuidePrompt(settings);

    const onCameraNotes = Object.entries(onCameraDescriptions)
        .map(([location, description]) => `
---
Location: ${location}
On-Camera Action/Dialogue:
${description}
---
`).join('\n');

    const prompt = `
You are an expert video producer. Your task is to create a detailed, integrated script plan from a high-level outline, on-camera notes, and a footage inventory.

**Video Title:** "${videoTitle}"
${styleGuidePrompt}

**High-Level Script Plan:**
This is the approved narrative structure. You MUST include every part of this plan in your final output.
\`\`\`
${scriptPlan}
\`\`\`

**Footage Inventory:**
This is a list of all available locations and the type of footage for each (On-Camera, B-Roll, Drone).
\`\`\`
${footageNotes}
\`\`\`

**On-Camera Segments:**
These are notes for segments where a host is on camera.
\`\`\`
${onCameraNotes}
\`\`\`

**Your Task:**
Create a "Refined Script Plan". This plan must be a comprehensive, scene-by-scene guide for the entire video.

**Refined Script Plan Requirements:**
1.  **Comprehensive:** Every scene and location from the "High-Level Script Plan" MUST be present in your output.
2.  **Integrate On-Camera:** Seamlessly weave the "On-Camera Segments" into the plan.
3.  **Create Voiceover for Other Footage:** For locations that are NOT on-camera (e.g., those with only B-Roll or Drone footage), you must write a [VOICEOVER] section. Use the "High-Level Script Plan" and "Footage Inventory" to guide what the voiceover should be about.
4.  **Maintain Flow:** Ensure a logical and engaging narrative.
5.  **Explicit Cues:** Clearly label all parts as [VOICEOVER] or [ON-CAMERA: Location Name].

**Output:**
Provide only the "Refined Script Plan" as a structured, easy-to-follow markdown document. This plan will be the definitive blueprint for the final scriptwriter.

**Example Output Structure:**
[INTRO MUSIC]

**Scene 1: Introduction**
[VOICEOVER]
- Hook the viewer with a compelling question about [Topic].
- Briefly introduce the video's premise.

[ON-CAMERA: Location A]
- The host welcomes the audience and explains the goal for the day.
- Mentions the first stop.

**Scene 2: Exploring Location B**
[VOICEOVER]
- As drone footage of Location B plays, explain its significance.
- Build anticipation for what the host will do there.

...and so on.
`;

    try {
        const response = await window.aiUtils.callGeminiAPI(prompt, settings, { responseMimeType: "text/plain" }, true);
        return { refinedScriptPlan: response };
    } catch (error) {
        console.error("Error in generateRefinedScriptPlanAI:", error);
        console.log("Full raw error object:", error);
        throw new Error(`Failed to generate refined script plan. ${error.message}`);
    }
};
