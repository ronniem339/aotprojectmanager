// creators-hub/js/components/ProjectView/tasks/ScriptingV2/ShotCard.js
window.ShotCard = ({ shot, onEnrichShot, isResearchableShot, isEnriching, isCompleted, onToggleComplete }) => {
    const { useState, useEffect } = React;

    const [isAiResearchNotesCollapsed, setIsAiResearchNotesCollapsed] = useState(true);

    useEffect(() => {
        if (shot.ai_research_notes && shot.ai_research_notes.length > 0) {
            setIsAiResearchNotesCollapsed(false);
        }
    }, [shot.ai_research_notes]);

    // Helper to render a collapsible detail section (now only used for AI notes)
    const renderCollapsibleDetail = (label, value) => {
        if (!value || (Array.isArray(value) && value.length === 0)) {
            return null;
        }
        return React.createElement('div', { className: 'mt-3 pt-3 border-t border-gray-700/60' },
            React.createElement('div', { className: 'flex justify-between items-center mb-1' },
                React.createElement('p', { className: 'text-xs font-bold text-amber-300 uppercase tracking-wider' }, label),
                React.createElement('button', {
                    onClick: () => setIsAiResearchNotesCollapsed(prev => !prev),
                    className: 'text-gray-400 hover:text-white focus:outline-none text-sm'
                }, isAiResearchNotesCollapsed ? 'Show' : 'Hide')
            ),
            !isAiResearchNotesCollapsed && React.createElement('div', { className: 'text-gray-300 text-sm pl-2 border-l-2 border-gray-700' },
                Array.isArray(value) ?
                    React.createElement('ul', { className: 'list-disc list-inside space-y-1' }, value.map((item, i) => React.createElement('li', { key: i }, item)))
                    : value
            )
        );
    };

    // Helper to render a non-collapsible detail
    const renderStaticDetail = (label, value, isScript = false) => {
        if (!value || (Array.isArray(value) && value.length === 0)) {
            return null;
        }
        return React.createElement('div', { className: 'mt-3 pt-3 border-t border-gray-700/60' },
            React.createElement('p', { className: 'text-xs font-bold text-amber-300 uppercase tracking-wider mb-1' }, label),
            React.createElement('div', { className: `text-gray-200 text-sm pl-2 border-l-2 border-amber-500/30 ${isScript ? 'whitespace-pre-wrap' : ''}` },
                value
            )
        );
    };

    const researchDone = shot.ai_research_notes && shot.ai_research_notes.length > 0;

    // MODIFICATION: The main container now applies styles based on the isCompleted prop.
    return React.createElement('div', { 
        className: `bg-gray-800/70 p-3 rounded-lg border border-gray-700 transition-all duration-300 ${isCompleted ? 'opacity-60' : 'opacity-100'}` 
    },
        // Card Header
        React.createElement('div', { className: 'flex justify-between items-start mb-2' },
            React.createElement('div', { className: 'flex items-center gap-3' },
                // MODIFICATION: Replaced Hide button with a checkbox.
                React.createElement('input', {
                    type: 'checkbox',
                    checked: isCompleted,
                    onChange: onToggleComplete,
                    title: 'Mark shot as complete',
                    className: `h-5 w-5 rounded bg-gray-700 border-gray-600 text-green-500 focus:ring-green-600 cursor-pointer flex-shrink-0 ${isCompleted ? 'ring-2 ring-green-500' : ''}`
                }),
                React.createElement('div', null, 
                    React.createElement('h4', { className: 'font-bold text-md text-white' }, shot.shot_type || 'Untitled Shot'),
                    shot.location && React.createElement('p', { className: 'text-xs text-gray-400 font-mono flex items-center' }, 
                        React.createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', className: 'h-3 w-3 mr-1', fill:'none', viewBox: '0 0 24 24', stroke:'currentColor'}, 
                            React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' }),
                            React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M15 11a3 3 0 11-6 0 3 3 0 016 0z' })
                        ),
                        shot.location
                    )
                )
            ),
             React.createElement('span', { className: 'text-xs text-gray-400 font-mono' }, `~${shot.shot_duration_seconds || 0}s`)
        ),

        // Shot Description
        React.createElement('p', { className: 'text-sm text-gray-300 mb-2 pl-8' }, shot.shot_description),
        
        // MODIFICATION: On-Camera Dialogue and Voiceover Script are now always visible if they exist.
        renderStaticDetail('On-Camera Dialogue', shot.on_camera_dialogue, true),
        renderStaticDetail('Voiceover Script', shot.voiceover_script, true),

        // AI Research Notes remain collapsible
        renderCollapsibleDetail('AI Research Notes', shot.ai_research_notes),

        // Conditional Research Button / Status
        isResearchableShot && !researchDone && React.createElement('div', { className: 'text-center mt-3 pt-3 border-t border-gray-700/60' },
            React.createElement('button', {
                onClick: () => onEnrichShot(shot),
                disabled: isEnriching,
                className: 'button-secondary-small disabled:opacity-50'
            }, isEnriching ? 'Researching...' : '✨ Find Interesting Facts')
        )
    );
};
