// creators-hub/js/components/ProjectView/tasks/ScriptingV2/ShotCard.js

// This component is responsible for rendering the details of a single shot
// from the Creative Blueprint. It's designed to be a clear, readable summary
// of all the information related to one specific shot in the video.

window.ShotCard = ({ shot }) => {

    const renderDetail = (label, value) => {
        if (!value || (Array.isArray(value) && value.length === 0)) {
            return null; // Don't render empty details
        }
        return React.createElement('div', { className: 'mb-3' },
            React.createElement('p', { className: 'text-xs font-bold text-amber-300 uppercase tracking-wider' }, label),
            React.createElement('p', { className: 'text-gray-300 text-sm' },
                Array.isArray(value) ?
                    React.createElement('ul', { className: 'list-disc list-inside' }, value.map((item, i) => React.createElement('li', { key: i }, item)))
                    : value
            )
        );
    };

    return React.createElement('div', { className: 'bg-gray-800/70 p-4 rounded-xl border border-gray-700 mb-4' },
        // Card Header
        React.createElement('div', { className: 'flex justify-between items-center mb-3 pb-2 border-b border-gray-700' },
            React.createElement('h4', { className: 'font-bold text-lg text-white' }, shot.shot_type || 'Untitled Shot'),
            React.createElement('span', { className: 'text-xs text-gray-400 font-mono' }, `~${shot.estimated_time_seconds || 0}s`)
        ),

        // Card Body
        renderDetail('Location', shot.location_name),
        renderDetail('Shot Description', shot.shot_description),
        renderDetail('Narrative Purpose', shot.scene_narrative_purpose),
        renderDetail('Creator Experience Notes', shot.creator_experience_notes),
        renderDetail('AI Research Notes', shot.ai_research_notes),
        renderDetail('On-Camera Dialogue', shot.on_camera_dialogue),

        // Voiceover Section (will become editable later)
        React.createElement('div', { className: 'mt-4 pt-3 border-t border-gray-700/50' },
            React.createElement('p', { className: 'text-xs font-bold text-cyan-300 uppercase tracking-wider mb-1' }, 'Voiceover Script'),
            React.createElement('p', { className: 'text-gray-200 text-sm font-light italic' },
                shot.voiceover_script || 'Voiceover will be generated in the final step.'
            )
        )
    );
};
