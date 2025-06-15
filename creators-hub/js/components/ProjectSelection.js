// js/components/ProjectSelection.js

const { useState } = React; // Add React import for useState

window.ProjectSelection = ({ onSelectWorkflow, onClose }) => {
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

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
            <div className="glass-card rounded-lg p-8 w-full max-w-4xl relative">
                <button onClick={onClose} className="absolute top-4 right-6 text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
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
            </div>
        </div>
    );
};
