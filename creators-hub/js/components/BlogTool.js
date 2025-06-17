// js/components/BlogTool.js

window.BlogTool = ({ settings, onBack, onNavigateToSettings }) => {
    const { useState, useEffect } = React;
    
    const isConnected = settings?.wordpress?.url && settings?.wordpress?.username && settings?.wordpress?.applicationPassword;

    return (
        <div className="p-8">
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-bold text-white">📝 Blog Content Tool</h1>
                <button onClick={onBack} className="flex items-center gap-2 glass-card px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Tools
                </button>
            </header>

            {isConnected ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Column: Idea Generation */}
                    <div className="md:col-span-1">
                        <div className="glass-card p-6 rounded-lg h-full">
                            <h2 className="text-2xl font-semibold mb-4">Generate Ideas</h2>
                            <p className="text-sm text-gray-400 mb-6">Reference your existing projects to generate blog post ideas.</p>
                             {/* Placeholder for project selection and idea generation UI */}
                             <div className="text-center text-gray-500 py-10">
                                <p>Idea generation from projects coming soon.</p>
                             </div>
                        </div>
                    </div>

                    {/* Right Column: Content Generation Area */}
                    <div className="md:col-span-2">
                         <div className="glass-card p-6 rounded-lg h-full flex flex-col items-center justify-center">
                            <span className="text-5xl mb-4">✍️</span>
                            <h2 className="text-2xl font-semibold text-center">Blog Post Editor</h2>
                            <p className="text-gray-400 text-center mt-2">Your AI-powered writing assistant will be available here.</p>
                         </div>
                    </div>
                </div>
            ) : (
                <div className="glass-card p-12 rounded-lg text-center flex flex-col items-center">
                    <span className="text-5xl mb-4">🔌</span>
                    <h2 className="text-2xl font-bold text-amber-400">WordPress Not Connected</h2>
                    <p className="text-gray-300 mt-2 max-w-md">To use the Blog Tool, you first need to connect your WordPress site in the settings.</p>
                    <button 
                        onClick={onNavigateToSettings}
                        className="mt-6 px-6 py-3 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold transition-colors"
                    >
                        Go to Technical Settings
                    </button>
                </div>
            )}
        </div>
    );
};
