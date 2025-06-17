// js/components/ToolsView.js

window.ToolsView = ({ onBack, onSelectTool }) => {
    const tools = [
        {
            id: 'blog',
            title: 'Blog Content Tool',
            description: 'Generate blog post ideas, write full articles, and post directly to your WordPress blog.',
            icon: '📝',
            enabled: true,
        },
        {
            id: 'shorts',
            title: 'Shorts & Reels Factory',
            description: 'Create engaging short-form video ideas, scripts, and captions for YouTube Shorts, TikTok, and Instagram Reels.',
            icon: '📱',
            enabled: true,
        },
        {
            id: 'research',
            title: 'Pre-Trip Research (Coming Soon)',
            description: "Plan your next content trip, discover locations, and build an itinerary.",
            icon: '🗺️',
            enabled: false,
        }
    ];

    return (
        <div className="p-8">
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-bold text-white">Content Creation Tools</h1>
                <button onClick={onBack} className="flex items-center gap-2 glass-card px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Dashboard
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tools.map(tool => (
                    <button
                        key={tool.id}
                        onClick={() => tool.enabled && onSelectTool(tool.id)}
                        disabled={!tool.enabled}
                        className={`p-6 rounded-lg text-left transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex flex-col justify-between items-start ${tool.enabled ? 'bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700' : 'bg-gray-800/40 border-gray-700'}`}
                    >
                        <div>
                            <span className="text-5xl">{tool.icon}</span>
                            <h3 className="text-2xl font-bold mt-4">{tool.title}</h3>
                            <p className="text-sm text-gray-400 mt-2">{tool.description}</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};
