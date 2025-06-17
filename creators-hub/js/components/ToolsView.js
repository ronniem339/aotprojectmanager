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
        }
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
            <div ref={modalRef} className="glass-card rounded-lg w-full max-w-4xl relative flex flex-col max-h-[90vh]">
                <button onClick={onBack} className="absolute top-4 right-6 text-gray-400 hover:text-white text-2xl leading-none z-10">&times;</button>
                
                <div className="overflow-y-auto p-8">
                    <h2 className="text-3xl font-bold mb-2 text-center">🛠️ Content Creation Tools</h2>
                    <p className="text-gray-400 mb-8 text-center">Select a tool to start creating.</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <div className="flex-shrink-0 p-8 pt-0">
                    <div className="mt-8 pt-6 border-t border-gray-700/50 flex justify-end">
                        <button onClick={onBack} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold">Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
