// creators-hub/js/components/ProjectView/tasks/ScriptingV2/ShotCard.js
window.ShotCard = ({ shot, onEnrichShot, isResearchableShot, isEnriching }) => {
    const { useState, useEffect } = React;

    // State for collapsible sections
    const [isAiResearchNotesCollapsed, setIsAiResearchNotesCollapsed] = useState(false);
    const [isCreatorExperienceNotesCollapsed, setIsCreatorExperienceNotesCollapsed] = useState(true);
    const [isOnCameraDialogueCollapsed, setIsOnCameraDialogueCollapsed] = useState(true);
    const [isVoiceoverScriptCollapsed, setIsVoiceoverScriptCollapsed] = useState(true);

    // Effect to expand research notes when they are populated
    useEffect(() => {
        if (shot.ai_research_notes && shot.ai_research_notes.length > 0) {
            setIsAiResearchNotesCollapsed(false);
        }
    }, [shot.ai_research_notes]);

    // Helper to render a collapsible detail section
    const renderCollapsibleDetail = (label, value, isCollapsed, setCollapsed) => {
        if (!value || (Array.isArray(value) && value.length === 0)) {
            return null; // Don't render empty details
        }
        return React.createElement('div', { className: 'mb-3' },
            React.createElement('div', { className: 'flex justify-between items-center mb-1' },
                React.createElement('p', { className: 'text-xs font-bold text-amber-300 uppercase tracking-wider' }, label),
                React.createElement('button', {
                    onClick: () => setCollapsed(!isCollapsed),
                    className: 'text-gray-400 hover:text-white focus:outline-none text-sm'
                }, isCollapsed ? 'Show' : 'Hide')
            ),
            !isCollapsed && React.createElement('div', { className: 'text-gray-300 text-sm' },
                Array.isArray(value) ?
                    React.createElement('ul', { className: 'list-disc list-inside' }, value.map((item, i) => React.createElement('li', { key: i }, item)))
                    : value
            )
        );
    };

    // Helper to render a non-collapsible detail
    const renderStaticDetail = (label, value, textColor = 'text-amber-300') => {
        if (!value || (Array.isArray(value) && value.length === 0)) {
            return null;
        }
        return React.createElement('div', { className: 'mb-3' },
            React.createElement('p', { className: `text-xs font-bold ${textColor} uppercase tracking-wider` }, label),
            React.createElement('div', { className: 'text-gray-300 text-sm' },
                Array.isArray(value) ?
                    React.createElement('ul', { className: 'list-disc list-inside' }, value.map((item, i) => React.createElement('li', { key: i }, item)))
                    : value
            )
        );
    };

    const researchDone = shot.ai_research_notes && shot.ai_research_notes.length > 0;

    return React.createElement('div', { className: 'bg-gray-800/70 p-4 rounded-xl border border-gray-700 mb-4' },
        // Card Header
        React.createElement('div', { className: 'flex justify-between items-center mb-3 pb-2 border-b border-gray-700' },
            React.createElement('h4', { className: 'font-bold text-lg text-white' }, shot.shot_type || 'Untitled Shot'),
            React.createElement('span', { className: 'text-xs text-gray-400 font-mono' }, `~${shot.shot_duration_seconds || 0}s`)
        ),

        // Static Card Body details - always visible
        renderStaticDetail('Shot Description', shot.shot_description),

        // AI Research Notes section
        renderCollapsibleDetail('AI Research Notes', shot.ai_research_notes, isAiResearchNotesCollapsed, setIsAiResearchNotesCollapsed),

        // Conditional Research Button / Status
        isResearchableShot && !researchDone && React.createElement('div', { className: 'text-center mt-4' },
            React.createElement('button', {
                onClick: () => onEnrichShot(shot),
                disabled: isEnriching,
                className: 'btn btn-secondary btn-sm disabled:opacity-50' // Use standard button classes
            }, isEnriching ? 'Researching...' : '✨ Find Interesting Facts')
        ),
        researchDone && isResearchableShot && React.createElement('div', { className: 'text-center mt-4 text-sm text-green-400 font-semibold' },
            '✅ Research Complete'
        ),

        // Other collapsible sections
        renderCollapsibleDetail('Creator Experience Notes', shot.creator_experience_notes, isCreatorExperienceNotesCollapsed, setIsCreatorExperienceNotesCollapsed),
        renderCollapsibleDetail('On-Camera Dialogue', shot.on_camera_dialogue, isOnCameraDialogueCollapsed, setIsOnCameraDialogueCollapsed),

        // Voiceover Section (collapsible footer)
        React.createElement('div', { className: 'mt-4 pt-3 border-t border-gray-700/50' },
            renderCollapsibleDetail('Voiceover Script', shot.voiceover_script || 'Voiceover will be generated in a later step.', isVoiceoverScriptCollapsed, setIsVoiceoverScriptCollapsed)
        )
    );
};
