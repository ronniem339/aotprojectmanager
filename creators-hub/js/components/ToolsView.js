// js/components/ToolsView.js

window.ToolsView = ({ onBack, onSelectTool }) => {
    const { useEffect, useRef } = React;
    const modalRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onBack();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onBack]);

    const tools = [
        {
            id: 'contentLibrary',
            title: 'Content Library',
            description: 'View, edit, and manage all your videos from all projects in one place.',
            icon: '📚',
            enabled: true,
        },
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
        // Adjusted opacity from 80 to 70 for a more transparent overlay
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
            <div ref={modalRef} className="glass-card rounded-lg p-8 w-full max-w-4xl relative">
                <button onClick={onBack} className="absolute top-4 right-6 text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                <h2 className="text-3xl font-bold mb-2 text-center">🛠️ Content Creation Tools</h2>
                <p className="text-gray-400 mb-8 text-center">Select a tool to start creating.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
        </div>
    );
};
