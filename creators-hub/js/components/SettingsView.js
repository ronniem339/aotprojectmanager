// js/components/SettingsMenu.js

const { useState, useEffect } = React;

window.SettingsMenu = ({ onBack, onShowStyleAndTone, onShowKnowledgeBases }) => {
    return (
        <div className="p-8">
            <button onClick={onBack} className="flex items-center gap-2 text-secondary-accent hover:text-secondary-accent-light mb-6">
                ⬅️ Back to Dashboard
            </button>
            <h1 className="text-4xl font-bold mb-4">⚙️ Settings</h1>
            <p className="text-gray-400 mb-8">Choose a settings category to manage.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                <button
                    onClick={onShowStyleAndTone}
                    className="glass-card p-6 rounded-lg text-left transition-all transform hover:-translate-y-1 bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700"
                >
                    <span className="text-4xl">🎨</span>
                    <h3 className="text-xl font-bold mt-4">Style & Tone</h3>
                    <p className="text-sm text-gray-400 mt-2">Train the AI on your unique creative style.</p>
                </button>
                <button
                    onClick={onShowKnowledgeBases}
                    className="glass-card p-6 rounded-lg text-left transition-all transform hover:-translate-y-1 bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700"
                >
                    <span className="text-4xl">📚</span>
                    <h3 className="text-xl font-bold mt-4">Knowledge Bases</h3>
                    <p className="text-sm text-gray-400 mt-2">Manage the AI's informational knowledge.</p>
                </button>
                {/* Add more settings categories here later */}
                 <button
                    onClick={() => onShowKnowledgeBases('technical')} // Example: Placeholder for Technical Settings
                    className="glass-card p-6 rounded-lg text-left transition-all transform hover:-translate-y-1 bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700"
                >
                    <span className="text-4xl">🔧</span>
                    <h3 className="text-xl font-bold mt-4">Technical Settings</h3>
                    <p className="text-sm text-gray-400 mt-2">Manage API keys and other technical configurations.</p>
                </button>
            </div>
        </div>
    );
};
