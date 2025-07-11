// creators-hub/js/hooks/useBlueprint.js

const { useState, useEffect, useRef } = React;
const { useDebounce } = window;

window.useBlueprint = (video, project, userId, db, isAiTaskActive) => {
    const [blueprint, setBlueprint] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saveStatus, setSaveStatus] = useState('idle');

    const hasLoadedInitialBlueprint = useRef(false);
    const debouncedBlueprint = useDebounce(blueprint, 1500);
    const blueprintDocRef = useRef(db.collection(`artifacts/${window.CREATOR_HUB_CONFIG.APP_ID}/users/${userId}/projects/${project.id}/videos`).doc(video.id));
    const lastSavedBlueprintString = useRef(null);

    useEffect(() => {
        setIsLoading(true);
        const unsubscribe = blueprintDocRef.current.onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data().tasks?.scriptingV2_blueprint;
                const incomingDataString = JSON.stringify(data || { shots: [] });
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
    }, [project.id, video.id, userId]);

    // Effect for auto-saving the debounced blueprint data.
    useEffect(() => {
        if (
            !isAiTaskActive &&
            hasLoadedInitialBlueprint.current &&
            debouncedBlueprint !== null
        ) {
            const currentDebouncedBlueprintString = JSON.stringify(debouncedBlueprint);

            if (currentDebouncedBlueprintString !== lastSavedBlueprintString.current) {
                setSaveStatus('saving');
                console.log("Auto-saving debounced blueprint...");

                // **THE FIX IS HERE**
                // Clean the blueprint object to remove any `undefined` values before saving.
                const cleanedBlueprint = window.cleanObject(debouncedBlueprint);

                blueprintDocRef.current.update({
                    'tasks.scriptingV2_blueprint': cleanedBlueprint // Use the cleaned object
                }).then(() => {
                    // Update the last saved string with the *original* debounced string
                    // to prevent unnecessary re-saves if cleaning didn't change anything.
                    lastSavedBlueprintString.current = currentDebouncedBlueprintString;
                    setSaveStatus('saved');
                    console.log("Blueprint saved successfully.");
                    setTimeout(() => setSaveStatus('idle'), 2000);
                }).catch(err => {
                    console.error("Error auto-saving blueprint:", err);
                    setError("Failed to save changes. Please check the console for details.");
                    setSaveStatus('idle');
                });
            }
        } else if (isAiTaskActive) {
            console.log("AI task is active. Auto-save is paused.");
        }
    }, [debouncedBlueprint, isAiTaskActive]);

    return { blueprint, setBlueprint, isLoading, error, saveStatus };
};
