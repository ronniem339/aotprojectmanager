// creators-hub/js/components/ProjectView/tasks/ScriptingV2/BlueprintStepper.js

const { useMediaQuery } = window;

const DesktopStepper = ({ steps, currentStep, onStepClick }) => {
    // This is the current base code as provided by the user, with modifications.
    return React.createElement('div', { className: 'flex flex-wrap justify-center items-center gap-x-2 sm:gap-x-4 gap-y-3 mb-6 pb-4 border-b border-gray-700' },
        steps.map((step, index) => {
            const isCurrent = currentStep === step.id;
            const isCompleted = step.isCompleted;
            const isClickable = !isCurrent;

            return React.createElement(React.Fragment, { key: step.id },
                React.createElement('button', {
                    onClick: () => isClickable && onStepClick(step.id),
                    className: `flex items-center space-x-2 text-xs sm:text-sm p-2 rounded-lg transition-colors duration-200
                                ${isCurrent
                                    ? 'bg-primary-accent text-white font-semibold'
                                    : isCompleted
                                        ? 'bg-green-700 text-white font-semibold hover:bg-green-600'
                                        : 'bg-gray-800 text-gray-400'
                                } ${isClickable ? 'hover:bg-primary-accent-darker cursor-pointer' : 'cursor-default'}`
                },
                    React.createElement('span', { className: `flex-shrink-0 h-6 w-6 sm:h-8 sm:w-8 rounded-full flex items-center justify-center font-bold ${
                        isCurrent
                            ? 'bg-white text-primary-accent'
                            : isCompleted
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-700'
                    }` },
                        step.id
                    ),
                    React.createElement('span', { className: 'hidden sm:inline' },
                        step.name,
                        isCompleted && React.createElement('span', { className: 'ml-2' }, '✅')
                    )
                ),
                // UPDATED: Changed the connector from a div to a text span using an em-dash (—) for visual consistency with screenshot.
                // It correctly only renders between steps using `index < steps.length - 1`.
                (index < steps.length - 1) && React.createElement('span', {
                    className: `text-2xl font-bold mx-1 transition-colors duration-200 ${ // Added mx-1 for slight horizontal spacing
                        isCompleted ? 'text-green-700' : 'text-gray-700'
                    }`
                }, '—')
            );
        })
    );
};

const MobileStepper = ({ steps, currentStep, onStepClick }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const currentStepName = steps.find(s => s.id === currentStep)?.name || 'Menu';

    const handleSelect = (stepId) => {
        onStepClick(stepId);
        setIsOpen(false);
    };

    return React.createElement('div', { className: 'relative mb-4 pb-4 border-b border-gray-700' },
        React.createElement('button', { onClick: () => setIsOpen(!isOpen), className: 'w-full bg-gray-800 text-white font-semibold py-3 px-4 rounded-lg flex justify-between items-center' },
            React.createElement('span', null, currentStepName),
            React.createElement('svg', { className: `w-5 h-5 transition-transform ${isOpen ? 'transform rotate-180' : ''}`, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', xmlns: 'http://www.w3.org/2000/svg' },
                React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M19 9l-7 7-7-7' })
            )
        ),
        isOpen && React.createElement('div', { className: 'absolute top-full left-0 right-0 bg-gray-800 border border-gray-700 rounded-b-lg z-10' },
            steps.map(step => {
                const isCurrent = currentStep === step.id;
                const isCompleted = step.isCompleted;
                return React.createElement('button', {
                    key: step.id,
                    onClick: () => handleSelect(step.id),
                    disabled: isCurrent,
                    className: `w-full text-left px-4 py-3 flex items-center space-x-3 hover:bg-gray-700 disabled:opacity-50
                                ${isCompleted ? 'text-green-300' : 'text-gray-200'}`
                },
                    React.createElement('span', { className: `flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center font-bold ${
                        isCurrent
                            ? 'bg-primary-accent text-white'
                            : isCompleted
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-600'
                    }` },
                        step.id
                    ),
                    React.createElement('span', null,
                        step.name,
                        isCompleted && React.createElement('span', { className: 'ml-2' }, '✅')
                    )
                );
            })
        )
    );
};

window.BlueprintStepper = ({ steps, currentStep, onStepClick }) => {
    // Keep the mobile breakpoint for phone-sized screens, but the desktop version is now much more robust.
    const isMobile = useMediaQuery('(max-width: 640px)');
    return isMobile
        ? React.createElement(MobileStepper, { steps, currentStep, onStepClick })
        : React.createElement(DesktopStepper, { steps, currentStep, onStepClick });
};
