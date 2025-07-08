// creators-hub/js/components/ProjectView/tasks/ScriptingV2/ShotCard.js
window.ShotCard = ({ shot, onEnrichShot, isResearchableShot, isEnriching, isCompleted, onToggleComplete }) => {
    const { useState, useEffect } = React;

    // **NEW**: State to manage the card's overall collapsed state.
    // Drones are collapsed by default.
    const [isCardCollapsed, setIsCardCollapsed] = useState(() =>
        shot.shot_type?.toLowerCase().includes('drone')
    );

    // State for the AI research notes section.
    const [isAiResearchNotesCollapsed, setIsAiResearchNotesCollapsed] = useState(true);

    // **NEW**: State for the voiceover section. Collapsed if no script exists.
    const [isVoiceoverCollapsed, setIsVoiceoverCollapsed] = useState(() => !shot.voiceover_script);

    useEffect(() => {
        // Auto-expand the research notes if they are added after the component mounts.
        if (shot.ai_research_notes && shot.ai_research_notes.length > 0) {
            setIsAiResearchNotesCollapsed(false);
        }
        // Auto-expand the voiceover if it's added.
        if (shot.voiceover_script) {
            setIsVoiceoverCollapsed(false);
        }
    }, [shot.ai_research_notes, shot.voiceover_script]);


    // **NEW**: Dynamic styling based on shot type.
    const getShotTypeStyles = (shotType) => {
        const type = shotType?.toLowerCase() || '';
        if (type.includes('on-camera')) {
            return 'border-l-4 border-blue-500'; // Blue for On-Camera
        }
        if (type.includes('b-roll')) {
            return 'border-l-4 border-green-500'; // Green for B-Roll
        }
        if (type.includes('drone')) {
            return 'border-l-4 border-purple-500'; // Purple for Drone
        }
        return 'border-l-4 border-gray-600'; // Default
    };

    const cardBorderStyle = getShotTypeStyles(shot.shot_type);

    const renderDetailSection = (label, value, isCollapsed, setCollapsed, isScript = false) => {
        if (!value || (Array.isArray(value) && value.length === 0)) {
            return null;
        }
        return React.createElement('div', { className: 'mt-3 pt-3 border-t border-gray-700/60' },
            React.createElement('div', { className: 'flex justify-between items-center mb-1' },
                React.createElement('p', { className: 'text-xs font-bold text-amber-300 uppercase tracking-wider' }, label),
                React.createElement('button', {
                    onClick: () => setCollapsed(prev => !prev),
                    className: 'text-gray-400 hover:text-white focus:outline-none text-sm'
                }, isCollapsed ? 'Show' : 'Hide')
            ),
            !isCollapsed && React.createElement('div', { className: `text-gray-200 text-sm pl-2 border-l-2 border-amber-500/30 ${isScript ? 'whitespace-pre-wrap' : ''}` },
                Array.isArray(value) ?
                    React.createElement('ul', { className: 'list-disc list-inside space-y-1' }, value.map((item, i) => React.createElement('li', { key: i }, item)))
                    : value
            )
        );
    };

    const renderStaticDetail = (label, value, isScript = false) => {
        if (!value) return null;
        return React.createElement('div', { className: 'mt-3 pt-3 border-t border-gray-700/60' },
            React.createElement('p', { className: 'text-xs font-bold text-amber-300 uppercase tracking-wider mb-1' }, label),
            React.createElement('div', { className: `text-gray-200 text-sm pl-2 border-l-2 border-amber-500/30 ${isScript ? 'whitespace-pre-wrap' : ''}` }, value)
        );
    };

    const researchDone = shot.ai_research_notes && shot.ai_research_notes.length > 0;

    return React.createElement('div', {
        className: `bg-gray-800/70 p-3 rounded-lg border border-gray-700 transition-all duration-300 ${cardBorderStyle} ${isCompleted ? 'opacity-60' : 'opacity-100'}`
    },
        React.createElement('div', { className: 'flex justify-between items-start mb-2' },
            React.createElement('div', { className: 'flex items-center gap-3' },
                React.createElement('input', {
                    type: 'checkbox',
                    checked: isCompleted,
                    onChange: onToggleComplete,
                    title: 'Mark shot as complete',
                    className: `h-5 w-5 rounded bg-gray-700 border-gray-600 text-green-500 focus:ring-green-600 cursor-pointer flex-shrink-0 ${isCompleted ? 'ring-2 ring-green-500' : ''}`
                }),
                React.createElement('div', { className: 'flex-grow' },
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
             // **NEW**: Master toggle for the entire card content
            React.createElement('div', {className: 'flex items-center gap-2'},
                 React.createElement('span', { className: 'text-xs text-gray-400 font-mono' }, `~${shot.shot_duration_seconds || 0}s`),
                 React.createElement('button', {
                    onClick: () => setIsCardCollapsed(prev => !prev),
                    className: 'text-gray-400 hover:text-white focus:outline-none text-sm'
                }, isCardCollapsed ? 'Show Details' : 'Hide Details')
            )
        ),

        // **MODIFICATION**: The entire body of the card is now collapsible
        !isCardCollapsed && React.createElement('div', { className: 'pl-8' },
            React.createElement('p', { className: 'text-sm text-gray-300 mb-2' }, shot.shot_description),
            renderStaticDetail('On-Camera Dialogue', shot.on_camera_dialogue, true),
            renderDetailSection('Voiceover Script', shot.voiceover_script, isVoiceoverCollapsed, setIsVoiceoverCollapsed, true),
            renderDetailSection('AI Research Notes', shot.ai_research_notes, isAiResearchNotesCollapsed, setIsAiResearchNotesCollapsed),
            isResearchableShot && !researchDone && React.createElement('div', { className: 'text-center mt-3 pt-3 border-t border-gray-700/60' },
                React.createElement('button', {
                    onClick: () => onEnrichShot(shot),
                    disabled: isEnriching,
                    className: 'button-secondary-small disabled:opacity-50'
                }, isEnriching ? 'Researching...' : '✨ Find Interesting Facts')
            )
        )
    );
};
