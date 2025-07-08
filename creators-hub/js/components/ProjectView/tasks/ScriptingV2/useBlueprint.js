// creators-hub/js/components/ProjectView/tasks/ScriptingV2/useBlueprint.js

// This custom hook is the heart of the Scripting V2 component.
// It manages the state of the "Creative Blueprint" and handles all
// interactions with Firestore, including initial data fetching and
// debounced auto-saving.

const { useState, useEffect, useCallback, useRef } = React;
const { useDebounce } = window; // Assuming useDebounce is globally available

window.useBlueprint = (video, project, userId, db) => {
    // State for the blueprint data itself.
    const [blueprint, setBlueprint] = useState(null);
    // State to track loading status for the UI.
    const [isLoading, setIsLoading] = useState(true);
    // State to hold any potential errors.
    const [error, setError] = useState(null);
    // **NEW STATE**: To track the current save status for the UI notification.
    const [saveStatus, setSaveStatus] = useState('idle'); // can be 'idle', 'saving', 'saved'

    // A ref to track if the initial blueprint data has been loaded from Firestore.
    // This replaces the old isInitialMount logic for more robust auto-saving.
    const hasLoadedInitialBlueprint = useRef(false);

    // Get a debounced version of the blueprint state.
    // We'll only write to the database when the user has stopped making changes for 1.5 seconds.
    const debouncedBlueprint = useDebounce(blueprint, 1500);

    // The document reference in Firestore where the blueprint data is stored.
    const blueprintDocRef = useRef(db.collection(`artifacts/${window.CREATOR_HUB_CONFIG.APP_ID}/users/${userId}/projects/${project.id}/videos`).doc(video.id));

    // Ref to store the stringified version of the last successfully saved blueprint
    // to prevent unnecessary Firestore writes if the content hasn't changed.
    const lastSavedBlueprintString = useRef(null);

    // Effect for initial data fetching and real-time listening.
    useEffect(() => {
        setIsLoading(true);
        const unsubscribe = blueprintDocRef.current.onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data().tasks?.scriptingV2_blueprint;
                const incomingDataString = JSON.stringify(data || { shots: [] });
                // Only update state if the incoming data is different from what we already have in our local state.
                // This prevents the user's cursor from jumping if they are typing when a remote save happens.
                if (JSON.stringify(blueprint) !== incomingDataString) {
                    setBlueprint(data || { shots: [] });
                }
                lastSavedBlueprintString.current = incomingDataString;
            } else {
                setError("Document does not exist.");
                setBlueprint({ shots: [] });
                lastSavedBlueprintString.current = JSON.stringify({ shots: [] });
            }
            setIsLoading(false);
            hasLoadedInitialBlueprint.current = true;
        }, err => {
            console.error("Error fetching blueprint:", err);
            setError("Failed to load script blueprint.");
            setIsLoading(false);
            hasLoadedInitialBlueprint.current = true;
        });

        return () => unsubscribe();
    }, [project.id, video.id, userId]); // Keep 'db' out if it's stable, or add if it can change.

    // Effect for auto-saving the debounced blueprint data.
    useEffect(() => {
        if (hasLoadedInitialBlueprint.current && debouncedBlueprint !== null) {
            const currentDebouncedBlueprintString = JSON.stringify(debouncedBlueprint);
            
            if (currentDebouncedBlueprintString !== lastSavedBlueprintString.current) {
                // **STATUS UPDATE**: Set status to 'saving' when the process starts.
                setSaveStatus('saving');
                console.log("Auto-saving debounced blueprint...");
                
                blueprintDocRef.current.update({
                    'tasks.scriptingV2_blueprint': debouncedBlueprint
                }).then(() => {
                    lastSavedBlueprintString.current = currentDebouncedBlueprintString;
                    // **STATUS UPDATE**: Set status to 'saved' on success.
                    setSaveStatus('saved');
                    console.log("Blueprint saved successfully.");
                    // **STATUS RESET**: Reset the status back to 'idle' after 2 seconds.
                    setTimeout(() => setSaveStatus('idle'), 2000);
                }).catch(err => {
                    console.error("Error auto-saving blueprint:", err);
                    setError("Failed to save changes.");
                    // **STATUS RESET**: Reset status on error too.
                    setSaveStatus('idle');
                });
            } else {
                // This console log is now in the component itself for clarity.
                // console.log("Debounced blueprint unchanged, skipping save.");
            }
        }
    }, [debouncedBlueprint]);

    // **UPDATED RETURN**: Return the new `saveStatus` state.
    return { blueprint, setBlueprint, isLoading, error, saveStatus };
};
