const { useState } = React;

window.DeleteConfirmationModal = ({ project, onConfirm, onCancel }) => {
    const [confirmText, setConfirmText] = useState('');
    const isConfirmationMatching = confirmText === 'YES';

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[60] p-4"
            onMouseDown={e => e.stopPropagation()}
        >
            <div className="glass-card rounded-lg p-8 w-full max-w-md text-center">
                <h3 className="text-2xl font-bold text-red-400 mb-4">Delete {project.playlistTitle === 'this draft' ? 'Draft' : 'Project'}</h3>
                <p className="text-gray-300 mb-2">This action is irreversible and will permanently delete the {project.playlistTitle === 'this draft' ? 'draft' : 'project'}:</p>
                <p className="font-bold text-lg text-white mb-6">"{project.playlistTitle === 'this draft' ? 'this draft' : project.playlistTitle}"</p>
                <p className="text-gray-400 mb-4">To confirm, please type <strong className="text-red-300">YES</strong> in the box below.</p>

                <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="w-full form-input text-center font-bold tracking-widest"
                    placeholder="Type YES to confirm"
                />

                <div className="flex justify-center gap-4 mt-6">
                    <button onClick={onCancel} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold">Cancel</button>
                    <button
                        onClick={() => onConfirm(project.id)}
                        disabled={!isConfirmationMatching}
                        className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold disabled:bg-red-900/50 disabled:cursor-not-allowed disabled:text-gray-400"
                    >
                        Confirm Delete
                    </button>
                </div>
            </div>
        </div>
    );
};
