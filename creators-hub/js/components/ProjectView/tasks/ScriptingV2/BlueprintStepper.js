// creators-hub/js/components/ProjectViez/tasks/ScriptingV2/BlueprintStepper.js

const { useMediaQuery } = window;

const DesktopStepper = ({ steps, currentStep, onStepClick }) => {
    // This is the new, redesigned DesktopStepper.
    return React.createElement('div', { className: 'flex justify-center items-center gap-x-2 sm:gap-x-4 mb-6 pb-4 border-b border-gray-700' },
        steps.map((step, index) => {
            const isCurrent = currentStep === step.id;
            const isCompleted = step.isCompleted;
            const isClickable = !isCurrent;

            return React.createElement(React.Fragment, { key: step.id },
                React.createElement('button', {
                    onClick: () => isClickable && onStepClick(step.id),
                    // MODIFICATION: Unified styling and added a border for the current step.
                    className: `flex items-center space-x-2 text-xs sm:text-sm p-2 rounded-lg transition-all duration-200 border-2
                                ${isCurrent
                                    ? 'border-primary-accent bg-blue-900/50 text-white font-semibold scale-105'
                                    : isCompleted
                                        ? 'border-transparent bg-green-700/50 text-white/90 hover:bg-green-700/80'
                                        : 'border-transparent bg-gray-800 text-gray-400 hover:bg-gray-700'
                                } ${isClickable ? 'cursor-pointer' : 'cursor-default'}`
                },
                    React.createElement('span', { className: `flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center font-bold text-base ${
                        isCurrent
                            ? 'bg-primary-accent text-white'
                            : isCompleted
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-700'
                    }` },
                        // Show a checkmark for completed steps
                        isCompleted && !isCurrent ? '✓' : step.id
                    ),
                    React.createElement('span', { className: 'hidden sm:inline' },
                        step.name
                    )
                ),
                // MODIFICATION: This is the new visual connector line.
                (index < steps.length - 1) && React.createElement('div', {
                    className: `h-1 flex-grow rounded-full transition-colors duration-500 mx-2 hidden sm:block
                                ${isCompleted ? 'bg-green-700' : 'bg-gray-700'}`
                })
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

    // The mobile stepper remains a dropdown, which is a good UX pattern for small screens.
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
                        isCompleted ? '✓' : step.id
                    ),
                    React.createElement('span', null,
                        step.name
                    )
                );
            })
        )
    );
};

window.BlueprintStepper = ({ steps, currentStep, onStepClick }) => {
    // MODIFICATION: Changed breakpoint to 767px to better align with typical mobile/tablet layouts.
    const isMobile = useMediaQuery('(max-width: 767px)');
    return isMobile
        ? React.createElement(MobileStepper, { steps, currentStep, onStepClick })
        : React.createElement(DesktopStepper, { steps, currentStep, onStepClick });
};
