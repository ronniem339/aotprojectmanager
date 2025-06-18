// js/components/ProjectSelection.js

const { useState, useEffect, useRef } = React;

// FIX: Add 'db' to the list of props being destructured.
window.ProjectSelection = ({ onSelectWorkflow, onClose, userId, onResumeDraft, onDeleteDraft, db }) => {
    const modalRef = useRef(null);
    const [drafts, setDrafts] = useState([]);
    const [loading, setLoading] = useState(true);
    const appId = window.CREATOR_HUB_CONFIG.APP_ID;

    useEffect(() => {
        // Fetch drafts from Firestore
        // FIX: Also check if the db object is available before using it.
        if (!userId || !db) {
            setLoading(false);
            return;
        };
        const draftsCollectionRef = db.collection(`artifacts/${appId}/users/${userId}/wizards`).orderBy("updatedAt", "desc");
        const unsubscribe = draftsCollectionRef.onSnapshot(querySnapshot => {
            const draftsData = [];
            querySnapshot.forEach((doc) => {
                draftsData.push({ id: doc.id, ...doc.data() });
            });
            setDrafts(draftsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching drafts:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    // FIX: Add 'db' to the dependency array for the useEffect hook.
    }, [userId, appId, db]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose(); // Close the modal if clicked outside
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    // ... (the rest of the component remains the same)

    const workflowOptions = [
        {
            type: 'post-trip',
            title: 'Create from Scratch',
            description: 'I have footage and want to plan my content.',
            icon: '✨',
            enabled: true,
        },
        {
            type: 'import',
            title: 'Import Existing Project',
            description: 'I already have scripts and want to use the AI tools.',
            icon: '📥',
            enabled: true,
        },
        {
            type: 'pre-trip',
            title: 'Pre-Trip Research (Coming Soon)',
            description: "I'm planning a trip and need an itinerary.",
            icon: '🗺️',
            enabled: false,
        }
    ];

    const getDraftDate = (draft) => {
        if (draft.updatedAt) {
            const date = draft.updatedAt.toDate ? draft.updatedAt.toDate() : draft.updatedAt;
            return new Date(date).toLocaleString();
        }
        return 'N/A';
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
            <div ref={modalRef} className="glass-card rounded-lg w-full max-w-4xl relative flex flex-col max-h-[90vh]">
                <button onClick={onClose} className="absolute top-4 right-6 text-gray-400 hover:text-white text-2xl leading-none z-10">&times;</button>
                <div className="overflow-y-auto p-8">
                    <h2 className="text-3xl font-bold mb-2 text-center">Start a New Project</h2>
                    <p className="text-gray-400 mb-8 text-center">How would you like to begin?</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {workflowOptions.map(option => (
                            <button
                                key={option.type}
                                onClick={() => onSelectWorkflow(option.type)}
                                disabled={!option.enabled}
                                className={`p-6 rounded-lg text-left transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex flex-col justify-between items-start ${option.enabled ? 'bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700' : 'bg-gray-800/40 border-gray-700'}`}
                            >
                                <div>
                                    <span className="text-4xl">{option.icon}</span>
                                    <h3 className="text-xl font-bold mt-4">{option.title}</h3>
                                    <p className="text-sm text-gray-400 mt-2">{option.description}</p>
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-700">
                        <h3 className="text-2xl font-bold mb-4 text-center">Or Resume a Draft</h3>
                        {loading ? <window.LoadingSpinner /> : (
                            drafts.length > 0 ? (
                                <div className="space-y-3 pr-2">
                                    {drafts.map(draft => (
                                        <div key={draft.id} className="glass-card p-4 rounded-lg flex justify-between items-center transition-all hover:bg-gray-700/50">
                                            <div>
                                                <p className="font-semibold text-primary-accent">{draft.inputs?.location || 'Untitled Draft'}</p>
                                                <p className="text-xs text-gray-400 mt-1">Last updated: {getDraftDate(draft)}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => onResumeDraft(draft.id)} className="px-4 py-2 text-sm bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold">Resume</button>
                                                <button onClick={() => onDeleteDraft(draft.id)} className="px-3 py-2 text-sm bg-red-800/80 hover:bg-red-700 text-white rounded-lg">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-400 text-center italic py-4">No saved drafts.</p>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
