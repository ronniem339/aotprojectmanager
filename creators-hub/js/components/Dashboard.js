// js/components/Dashboard.js (partial content)

window.Dashboard = ({ userId, onSelectProject, onShowSettings, onShowMyStudio, onShowProjectSelection, onShowDeleteConfirm, onShowKnowledgeBases }) => { // Add onShowKnowledgeBases prop
    // ... existing state and useEffects ...

    // Handle user logout (existing)
    const handleLogout = async () => { /* ... existing ... */ };

    return (
        <div className="p-8">
            <header className="flex justify-between items-center mb-8">
                {/* Removed the "Creator's Hub" title */}
                <div className="flex gap-4">
                    <button onClick={onShowMyStudio} className="flex items-center gap-2 glass-card px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">🎨 My Studio</button>
                    <button onClick={onShowSettings} className="flex items-center gap-2 glass-card px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">⚙️ Settings</button>
                    {/* NEW: Knowledge Bases Button */}
                    <button onClick={onShowKnowledgeBases} className="flex items-center gap-2 glass-card px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">📚 Knowledge Bases</button>
                    {/* New Project button (existing, moved here) */}
                    <button onClick={onShowProjectSelection} className="flex items-center gap-2 glass-card px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">✨ New Project</button>
                    {/* Logout Button (existing) */}
                    <button onClick={handleLogout} className="flex items-center gap-2 glass-card px-4 py-2 rounded-lg hover:bg-red-800 transition-colors text-red-400 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                        </svg>
                        Logout
                    </button>
                </div>
            </header>
            {/* ... rest of the component ... */}
        </div>
    );
};
