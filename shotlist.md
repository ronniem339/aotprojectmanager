# Shot List Feature Documentation

This document outlines the current state of the Shot List feature in the Creator's Hub application, detailing its intended functionality, identified issues, and current debugging position.

## 1. Feature Goals

The primary goal of the Shot List feature is to provide a chronological timeline of a video, integrating both voiceover (VO) and on-camera (OC) dialogue sections, and mapping them to their corresponding locations. This serves as a "paper edit" of the video, aiding creators in visualizing their content flow and managing footage.

Key aspects include:
*   **Timeline Visualization:** A clear sequence of events in the video.
*   **Dialogue Integration:** Displaying both VO and OC dialogue segments.
*   **Location Mapping:** Associating dialogue and shots with specific locations.
*   **Footage Availability:** Indicating what type of footage (B-roll, on-camera, drone) is available for each segment.
*   **Regeneration:** Ability to regenerate the shot list based on updated script or data.

## 2. Current Issues

The main issue is that the generated shot list is incomplete and does not accurately reflect the full timeline, particularly regarding the integration of on-camera dialogue and its associated locations. The `onCameraDescriptions` data, which is crucial for this, is consistently reported as `undefined` when passed to the AI generation function.

## 3. Identified Problems & Debugging Trail

### 3.1. `ReferenceError: onCameraDescriptions is not defined`

*   **Initial Cause:** The `generateShotListFromScriptAI.js` function was expecting a parameter named `onCameraLocations` (an array of strings) but was attempting to use a variable named `onCameraDescriptions` (an object).
*   **Action Taken:** The parameter name in `generateShotListFromScriptAI.js` was corrected from `onCameraLocations` to `onCameraDescriptions`.
*   **Current Status:** This specific `ReferenceError` within `generateShotListFromScriptAI.js` should now be resolved, as the parameter name matches the variable being used internally.

### 3.2. `onCameraDescriptions` is `undefined` when passed to AI

*   **Problem:** Despite correcting the parameter name in the AI function, the `console.log` output from within `generateShotListFromScriptAI.js` still shows `onCameraDescriptions: undefined`. This indicates that the data is not being correctly passed from `ShotListViewer.js` to the AI utility.
*   **Debugging Steps & Findings:**
    *   **`ShotListViewer.js` (`generateShotListFromExistingScript`):**
        *   Initially, `ShotListViewer.js` was passing `onCameraLocations` (derived from `video.locations_featured`) to the AI function.
        *   **Action Taken:** Modified `ShotListViewer.js` to directly pass `video.tasks.onCameraDescriptions` to `generateShotListFromScriptAI`, and removed the intermediate `onCameraLocations` variable.
        *   **Expected Outcome:** This change should ensure the correct data (`video.tasks.onCameraDescriptions`) is sent to the AI function.
    *   **`ProjectView.js` (Source of `video` prop):**
        *   Debugging confirmed that the `activeVideo` prop (which becomes the `video` prop in `VideoWorkspace.js` and subsequently in `ShotListViewer.js`) *does* contain the `script` and `onCameraDescriptions` data.
        *   **Example Console Output (from `ProjectView: activeVideo prop:`):**
            ```json
            {"id":"Lp6e4kjiAc43TiubXUEA", ..., "script":"This is Nicosia...", "onCameraDescriptions":{"D'Avila Moat":["On the ground, you've got these little markers..."], ...}, ...}
            ```
            This confirms the data exists in the `video` object.
    *   **Persistent Issue:** Despite the explicit change in `ShotListViewer.js` to pass `video.tasks.onCameraDescriptions`, the `console.log` within `generateShotListFromScriptAI.js` still reports `onCameraDescriptions: undefined`.

## 4. Current Position

The `onCameraDescriptions` data is present in the `video` object (as confirmed by `ProjectView` logs), and the `generateShotListFromScriptAI` function is now correctly expecting a parameter named `onCameraDescriptions`. However, the data is still not reaching the AI function.

This suggests a subtle issue in how `video.tasks.onCameraDescriptions` is being accessed or evaluated within `ShotListViewer.js` *before* it is passed to `generateShotListFromScriptAI`. It's possible that:
*   The `video.tasks` object itself is not fully populated or available at the exact moment `onCameraDescriptions` is accessed within `ShotListViewer.js`.
*   There might be a type mismatch or unexpected structure of `video.tasks.onCameraDescriptions` that causes it to evaluate to `undefined` during the function call, even if it appears in the `ProjectView` log.

## 5. Next Steps for Another Developer

To further debug this, the following steps are recommended:

1.  **Verify `video.tasks.onCameraDescriptions` immediately before the AI call in `ShotListViewer.js`:**
    *   Add a `console.log(video.tasks?.onCameraDescriptions)` directly before the `await window.aiUtils.generateShotListFromScriptAI(...)` line in `generateShotListFromExistingScript` within `creators-hub/js/components/ProjectView/ShotListViewer.js`. This will confirm the exact value of `onCameraDescriptions` at the point of being passed.
    *   Also, log the entire `video.tasks` object: `console.log(video.tasks)`.

2.  **Inspect Firestore Data:**
    *   Manually verify the structure and content of the `onCameraDescriptions` field for the problematic video directly in the Firestore database. Ensure it is indeed an object with string values, as expected by the AI prompt.

3.  **Review `generateShotListFromScriptAI.js` Prompt Construction:**
    *   Carefully re-examine the `onCameraNotes` construction within `generateShotListFromScriptAI.js` to ensure it correctly handles the `onCameraDescriptions` object, especially if the structure is not exactly as anticipated (e.g., if it contains nested arrays or unexpected types).

4.  **Consider Asynchronous Data Loading:**
    *   If `video.tasks` is loaded asynchronously, there might be a timing issue where `generateShotListFromExistingScript` is called before `video.tasks.onCameraDescriptions` is fully populated. While `useEffect` in `ProjectView` suggests data is available, a deeper look into the data flow within `ShotListViewer` might be necessary.
