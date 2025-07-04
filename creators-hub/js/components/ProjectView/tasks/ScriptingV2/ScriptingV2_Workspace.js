// creators-hub/js/components/ProjectView/tasks/ScriptingV2/ScriptingV2_Workspace.js

const { useState, useEffect } = React;
const { useBlueprint, BlueprintStepper, Step1_InitialBlueprint } = window;

window.ScriptingV2_Workspace = ({ video, project, settings, onUpdateTask, onClose, userId, db }) => {
    const { blueprint, setBlueprint, isLoading, error } = useBlueprint(video, project, userId, db);
    const [currentStep, setCurrentStep] = useState(1);

    const steps = [
        { id: 1, name: 'Initial Blueprint' },
        { id: 2, name: 'Research & Curation' },
        { id: 3, name: 'My Experience' },
        { id: 4, name: 'On-Camera Dialogue' },
        { id: 5, name: 'Final Assembly' },
    ];

    const handleStepClick = (stepId) => {
        setCurrentStep(stepId);
    };

    const renderCurrentStepContent = () => {
        const props = { blueprint, setBlueprint, video, project, settings };

        switch (currentStep) {
            case 1:
                return React.createElement(Step1_InitialBlueprint, props);
            case 2:
                return React.createElement('div', null, 'Content for Step 2: Research & Curation');
            case 3:
                return React.createElement('div', null, 'Content for Step 3: My Experience');
            case 4:
                return React.createElement('div', null, 'Content for Step 4: On-Camera Dialogue');
            case 5:
                return React.createElement('div', null, 'Content for Step 5: Final Assembly');
            default:
                return React.createElement('div', null, 'Unknown step');
        }
    };

    const renderBlueprintDisplay = () => {
        if (isLoading) {
            return React.createElement('p', null, 'Loading Blueprint...');
        }
        if (error) {
            return React.createElement('p', { className: 'text-red-400' }, error);
        }
        // We will create the BlueprintDisplay component next.
        // For now, we'll continue showing the raw data.
        if (blueprint) {
            return React.createElement('pre', { className: 'text-xs whitespace-pre-wrap' },
                JSON.stringify(blueprint, null, 2)
            );
        }
        return React.createElement('p', { className: 'text-gray-500' }, 'The Creative Blueprint will appear here once it\'s generated.');
    };

    return React.createElement('div', { className: 'fixed inset-0 bg-gray-900 bg-opacity-95 z-50 overflow-y-auto text-white' },
        React.createElement('div', { className: 'flex flex-col h-full' },
            // Header
            React.createElement('div', { className: 'flex-shrink-0 flex justify-between items-center p-4 border-b border-gray-700' },
                React.createElement('h2', { className: 'text-2xl font-bold' },
                    'Scripting Workspace: ',
                    React.createElement('span', { className: 'text-primary-accent' }, video.title)
                ),
                React.createElement('button', { onClick: onClose, className: 'text-gray-400 hover:text-white text-3xl leading-none' }, '×')
            ),

            // Main Content Area
            React.createElement('div', { className: 'flex-grow flex flex-col md:flex-row min-h-0' },
                // Left Column
                React.createElement('div', { className: 'w-full md:w-1/2 p-6 border-r border-gray-800 flex flex-col' },
                    React.createElement(BlueprintStepper, { steps, currentStep, onStepClick: handleStepClick }),
                    React.createElement('div', { className: 'flex-grow' }, renderCurrentStepContent())
                ),

                // Right Column
                React.createElement('div', { className: 'w-full md:w-1/2 p-6 flex flex-col overflow-y-auto' },
                    React.createElement('h3', { className: 'text-xl font-semibold mb-4 text-amber-400 flex-shrink-0' }, 'Creative Blueprint'),
                    React.createElement('div', { className: 'bg-gray-800 p-4 rounded-lg flex-grow' },
                        renderBlueprintDisplay()
                    )
                )
            )
        )
    );
};
