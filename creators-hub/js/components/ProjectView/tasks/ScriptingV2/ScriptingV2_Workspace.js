// creators-hub/js/components/ProjectView/tasks/ScriptingV2/ScriptingV2_Workspace.js

const { useState, useEffect } = React;
const { useBlueprint, BlueprintStepper, Step1_InitialBlueprint, Step2_ResearchCuration, Step3_MyExperience, Step4_OnCamera, Step5_FinalAssembly, BlueprintDisplay } = window;

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
        const props = { blueprint, setBlueprint, video, project, settings, onUpdateTask, onClose };

        switch (currentStep) {
            case 1:
                return React.createElement(Step1_InitialBlueprint, props);
            case 2:
                return React.createElement(Step2_ResearchCuration, props);
            case 3:
                return React.createElement(Step3_MyExperience, props);
            case 4:
                return React.createElement(Step4_OnCamera, props);
            case 5:
                return React.createElement(Step5_FinalAssembly, props);
            default:
                return React.createElement('div', null, 'Unknown step');
        }
    };

    const renderBlueprintDisplay = () => {
        if (isLoading) {
            return React.createElement('div', {className: 'flex items-center justify-center h-full'}, React.createElement('p', null, 'Loading Blueprint...'));
        }
        if (error) {
            return React.createElement('div', {className: 'flex items-center justify-center h-full'}, React.createElement('p', { className: 'text-red-400' }, error));
        }
        return React.createElement(BlueprintDisplay, { blueprint: blueprint });
    };

    // Main render
    return React.createElement('div', { className: 'fixed inset-0 bg-gray-900 z-50 overflow-y-auto text-white' }, // CHANGE: Removed bg-opacity-95
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
            React.createElement('div', { className: 'flex-grow flex flex-col lg:flex-row min-h-0' }, // CHANGE: md:flex-row to lg:flex-row
                // Left Column
                React.createElement('div', { className: 'w-full lg:w-1/2 p-6 border-r border-gray-800 flex flex-col' },
                    React.createElement(BlueprintStepper, { steps, currentStep, onStepClick: handleStepClick }),
                    React.createElement('div', { className: 'flex-grow overflow-y-auto pr-2' }, renderCurrentStepContent()) // CHANGE: Added overflow-y-auto pr-2
                ),

                // Right Column
                React.createElement('div', { className: 'w-full lg:w-1/2 p-6 flex flex-col' },
                    React.createElement('h3', { className: 'text-xl font-semibold mb-4 text-amber-400 flex-shrink-0' }, 'Creative Blueprint'),
                    React.createElement('div', { className: 'bg-gray-800/50 p-1 rounded-lg flex-grow overflow-y-auto border border-gray-700' }, // CHANGE: Added border
                        React.createElement('div', {className: 'p-3'}, renderBlueprintDisplay())
                    )
                )
            )
        )
    );
};
