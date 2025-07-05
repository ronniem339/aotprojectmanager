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

    // NEW: A ref to track if the initial blueprint data has been loaded from Firestore.
    // This replaces the old isInitialMount logic for more robust auto-saving.
    const hasLoadedInitialBlueprint = useRef(false);

    // Get a debounced version of the blueprint state.
    // We'll only write to the database when the user has stopped making changes for 1.5 seconds.
    const debouncedBlueprint = useDebounce(blueprint, 1500);

    // The document reference in Firestore where the blueprint data is stored.
    const blueprintDocRef = useRef(db.collection(`artifacts/${window.CREATOR_HUB_CONFIG.APP_ID}/users/${userId}/projects/${project.id}/videos`).doc(video.id));

    // Effect for initial data fetching and real-time listening.
    useEffect(() => {
        setIsLoading(true);

        // onSnapshot listens for real-time updates to the document.
        const unsubscribe = blueprintDocRef.current.onSnapshot(doc => {
            if (doc.exists) {
                // Extract the blueprint data from the tasks map in the video document.
                const data = doc.data().tasks?.scriptingV2_blueprint;
                // If data exists, set it; otherwise, initialize with an empty shots array.
                setBlueprint(data || { shots: [] });
            } else {
                setError("Document does not exist.");
                setBlueprint({ shots: [] }); // Initialize empty if doc doesn't exist
            }
            setIsLoading(false);
            // Mark that the initial blueprint has been loaded (or initialized as empty).
            // This ensures auto-saving starts only after the initial state is stable.
            hasLoadedInitialBlueprint.current = true;
        }, err => {
            console.error("Error fetching blueprint:", err);
            setError("Failed to load script blueprint.");
            setIsLoading(false);
            // Mark as loaded even on error to allow subsequent saves if user makes changes.
            hasLoadedInitialBlueprint.current = true;
        });

        // Cleanup function to unsubscribe from the listener when the component unmounts.
        return () => unsubscribe();
    }, [project.id, video.id, userId]); // Rerun if any of these IDs change.

    // Effect for auto-saving the debounced blueprint data.
    useEffect(() => {
        // Only save if the initial blueprint has been loaded (hasLoadedInitialBlueprint.current is true)
        // AND the debouncedBlueprint is not null (meaning there's data to save).
        // This prevents overwriting with default/empty values on initial component mount before data is fetched.
        if (hasLoadedInitialBlueprint.current && debouncedBlueprint !== null) {
            blueprintDocRef.current.update({
                'tasks.scriptingV2_blueprint': debouncedBlueprint
            }).catch(err => {
                console.error("Error auto-saving blueprint:", err);
                setError("Failed to save changes.");
            });
        }
    }, [debouncedBlueprint]); // This effect runs only when the debouncedBlueprint value changes.

    // Return the state and the setter function, so the UI components can interact with the blueprint.
    return { blueprint, setBlueprint, isLoading, error };
};
