// creators-hub/js/components/ProjectView/tasks/ScriptingV2/ShotCard.js

// This component is responsible for rendering the details of a single shot
// from the Creative Blueprint. It's designed to be a clear, readable summary
// of all the information related to one specific shot in the video.

window.ShotCard = ({ shot, onEnrichShot, settings, isResearchableShot }) => {
    const { useState } = React;

    // Local state for collapsing sections
    // AI Research Notes starts expanded in this step as it's the focus
    const [isAiResearchNotesCollapsed, setIsAiResearchNotesCollapsed] = useState(false);
    // Others start collapsed as they are less relevant to this step
    const [isCreatorExperienceNotesCollapsed, setIsCreatorExperienceNotesCollapsed] = useState(true);
    const [isOnCameraDialogueCollapsed, setIsOnCameraDialogueCollapsed] = useState(true);
    const [isVoiceoverScriptCollapsed, setIsVoiceoverScriptCollapsed] = useState(true);

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

    const handleResearchClick = async () => {
        if (onEnrichShot) {
            // Assume onEnrichShot handles loading state and errors at its level (in Step2_ResearchCuration)
            await onEnrichShot(shot);
            // After research, automatically expand the AI Research Notes section
            setIsAiResearchNotesCollapsed(false);
        }
    };

    const researchDone = shot.ai_research_notes && shot.ai_research_notes.length > 0;

    return React.createElement('div', { className: 'bg-gray-800/70 p-4 rounded-xl border border-gray-700 mb-4' },
        // Card Header
        React.createElement('div', { className: 'flex justify-between items-center mb-3 pb-2 border-b border-gray-700' },
            React.createElement('h4', { className: 'font-bold text-lg text-white' }, shot.shot_type || 'Untitled Shot'),
            React.createElement('span', { className: 'text-xs text-gray-400 font-mono' }, `~${shot.estimated_time_seconds || 0}s`)
        ),

        // Static Card Body details - always visible
        renderStaticDetail('Location', shot.location_name),
        renderStaticDetail('Shot Description', shot.shot_description),
        renderStaticDetail('Narrative Purpose', shot.scene_narrative_purpose),

        // AI Research Notes section (collapsible, defaults expanded for this step)
        renderCollapsibleDetail('AI Research Notes', shot.ai_research_notes, isAiResearchNotesCollapsed, setIsAiResearchNotesCollapsed),

        // Conditional Research Button / Status
        isResearchableShot && !researchDone && React.createElement('div', { className: 'text-center mt-4' },
            React.createElement('button', {
                onClick: handleResearchClick,
                className: 'button-secondary text-sm px-4 py-2' // Smaller button for in-card action
            }, 'Generate Research')
        ),
        researchDone && isResearchableShot && React.createElement('div', { className: 'text-center mt-4' },
            React.createElement('span', { className: 'text-green-400 text-sm font-semibold' }, 'Research Complete')
        ),
        
        // Collapsible Sections for other steps' notes (default collapsed)
        renderCollapsibleDetail('Creator Experience Notes', shot.creator_experience_notes, isCreatorExperienceNotesCollapsed, setIsCreatorExperienceNotesCollapsed),
        renderCollapsibleDetail('On-Camera Dialogue', shot.on_camera_dialogue, isOnCameraDialogueCollapsed, setIsOnCameraDialogueCollapsed),

        // Voiceover Section (collapsible footer)
        React.createElement('div', { className: 'mt-4 pt-3 border-t border-gray-700/50' },
            React.createElement('div', { className: 'flex justify-between items-center mb-1' },
                React.createElement('p', { className: 'text-xs font-bold text-cyan-300 uppercase tracking-wider' }, 'Voiceover Script'),
                React.createElement('button', {
                    onClick: () => setIsVoiceoverScriptCollapsed(!isVoiceoverScriptCollapsed),
                    className: 'text-gray-400 hover:text-white focus:outline-none text-sm'
                }, isVoiceoverScriptCollapsed ? 'Show' : 'Hide')
            ),
            !isVoiceoverScriptCollapsed && React.createElement('p', { className: 'text-gray-200 text-sm font-light italic' },
                shot.voiceover_script || 'Voiceover will be generated in the final step.'
            )
        )
    );
};
