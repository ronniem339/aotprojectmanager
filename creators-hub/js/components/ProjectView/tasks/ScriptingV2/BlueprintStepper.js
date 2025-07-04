// creators-hub/js/components/ProjectView/tasks/ScriptingV2/BlueprintStepper.js

// This component displays the navigation steps for the Scripting V2 workflow.
// It's a presentational component that receives the steps, the current step,
// and a function to handle clicks.

const { useMediaQuery } = window; // Assuming useMediaQuery is globally available

const DesktopStepper = ({ steps, currentStep, onStepClick }) => {
    return React.createElement('div', { className: 'flex justify-center items-center space-x-2 sm:space-x-4 mb-6 pb-4 border-b border-gray-700 overflow-x-auto' },
        steps.map((step, index) => {
            const isCurrent = currentStep === step.id;
            // In V2, we allow clicking back to any step.
            const isClickable = !isCurrent;

            return React.createElement(React.Fragment, { key: step.id },
                React.createElement('button', {
                    onClick: () => isClickable && onStepClick(step.id),
                    className: `flex items-center space-x-2 text-xs sm:text-sm p-2 rounded-lg transition-colors ${
                        isCurrent
                            ? 'bg-primary-accent text-white font-semibold'
                            : 'bg-gray-800 text-gray-400'
                    } ${isClickable ? 'hover:bg-primary-accent-darker cursor-pointer' : 'cursor-default'}`
                },
                    React.createElement('span', { className: `flex-shrink-0 h-6 w-6 sm:h-8 sm:w-8 rounded-full flex items-center justify-center font-bold ${isCurrent ? 'bg-white text-primary-accent' : 'bg-gray-700'}` },
                        step.id
                    ),
                    React.createElement('span', { className: 'hidden sm:inline' }, step.name)
                ),
                index < steps.length - 1 && React.createElement('div', { className: 'h-1 w-4 sm:w-8 bg-gray-700 rounded-full' })
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
                return React.createElement('button', {
                    key: step.id,
                    onClick: () => handleSelect(step.id),
                    disabled: isCurrent,
                    className: 'w-full text-left px-4 py-3 flex items-center space-x-3 hover:bg-gray-700 disabled:opacity-50'
                },
                    React.createElement('span', { className: `flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center font-bold ${isCurrent ? 'bg-primary-accent text-white' : 'bg-gray-600'}` },
                        step.id
                    ),
                    React.createElement('span', { className: 'text-gray-200' }, step.name)
                );
            })
        )
    );
};


window.BlueprintStepper = ({ steps, currentStep, onStepClick }) => {
    const isMobile = useMediaQuery('(max-width: 767px)');
    return isMobile
        ? React.createElement(MobileStepper, { steps, currentStep, onStepClick })
        : React.createElement(DesktopStepper, { steps, currentStep, onStepClick });
};
