const { useState, useEffect } = React;

// A common Accordion component for collapsible sections
window.Accordion = ({ title, children, isOpen, onToggle, status = 'pending', isLocked = false, onRevisit, onRestart }) => {
    const statusColors = {
        'complete': 'border-green-500 bg-green-900/20',
        'pending': 'border-blue-500 bg-blue-900/20',
        'locked': 'border-gray-700 bg-gray-800/50 opacity-60',
        'revisited': 'border-amber-500 bg-amber-900/20',
        'in-progress': 'border-amber-500 bg-amber-900/20',
    };
    const statusTextColors = {
        'complete': 'text-green-400',
        'pending': 'text-blue-400',
        'locked': 'text-gray-400',
        'revisited': 'text-amber-400',
        'in-progress': 'text-amber-400',
    };

    return (
        <div className={`glass-card rounded-lg border ${statusColors[status] || 'border-gray-700 bg-gray-800/50'} overflow-hidden`}>
            <div
                onClick={isLocked ? null : onToggle}
                className={`w-full flex justify-between items-center p-4 text-left font-semibold text-white transition-colors duration-200 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                role="button"
                tabIndex={isLocked ? -1 : 0}
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-3">
                    <span className="text-xl">{isLocked ? '🔒' : (isOpen ? '▼' : '►')}</span>
                    <h3 className="text-xl">{title}</h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${statusTextColors[status] || 'text-gray-400'}`}>
                        {status === 'complete' && 'Complete'}
                        {status === 'pending' && 'Pending'}
                        {status === 'locked' && 'Locked'}
                        {status === 'revisited' && 'Revisiting'}
                        {status === 'in-progress' && 'In Progress'}
                        {!status && 'Not Started'}
                    </span>
                    {onRevisit && (status === 'complete') && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onRevisit(); }}
                            className="text-xs text-secondary-accent hover:text-secondary-accent-light px-2 py-1 rounded border border-gray-600 hover:border-gray-500"
                        >
                            Revisit
                        </button>
                    )}
                    {onRestart && (status === 'in-progress') && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onRestart(); }}
                            className="text-xs text-amber-400 hover:text-amber-300 px-2 py-1 rounded border border-amber-600 hover:border-amber-500"
                        >
                            Restart Task
                        </button>
                    )}
                </div>
            </div>
            <div className={`transition-max-height duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-screen' : 'max-h-0'}`}>
                <div className="p-4 pt-0">
                    {children}
                </div>
            </div>
        </div>
    );
};
