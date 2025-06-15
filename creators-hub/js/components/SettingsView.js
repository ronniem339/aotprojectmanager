// js/components/SettingsMenu.js

const { useState, useEffect } = React;

window.SettingsMenu = ({ onBack, onShowTechnicalSettings, onShowStyleAndTone, onShowKnowledgeBases }) => {
    const settingsOptions = [
        {
            type: 'technical',
            title: 'Technical Settings',
            description: 'Manage API keys and other technical configurations.',
            icon: '🔧',
            onClick: onShowTechnicalSettings,
            enabled: true,
        },
        {
            type: 'style-tone',
            title: 'Style & Tone',
            description: 'Train the AI on your unique creative style.',
            icon: '🎨',
            onClick: onShowStyleAndTone,
            enabled: true,
        },
        {
            type: 'knowledge-bases',
            title: 'Knowledge Bases',
            description: 'Manage the AI\'s informational knowledge.',
            icon: '📚',
            onClick: onShowKnowledgeBases,
            enabled: true,
        }
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
            <div className="glass-card rounded-lg p-8 w-full max-w-4xl relative">
                <button onClick={onBack} className="absolute top-4 right-6 text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                <h2 className="text-3xl font-bold mb-2 text-center">⚙️ Settings</h2>
                <p className="text-gray-400 mb-8 text-center">Choose a settings category to manage.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {settingsOptions.map(option => (
                        <button
                            key={option.type}
                            onClick={option.onClick}
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
