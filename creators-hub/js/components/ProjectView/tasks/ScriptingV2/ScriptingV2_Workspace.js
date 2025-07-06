// creators-hub/js/components/ProjectView/tasks/ScriptingV2/ScriptingV2_Workspace.js

const { useState, useEffect, useRef } = React;
const { useBlueprint, BlueprintStepper, Step1_InitialBlueprint, Step2_ResearchCuration, Step3_OnCameraScripting, Step5_FinalAssembly, BlueprintDisplay } = window;
const { useDebounce } = window;

window.ScriptingV2_Workspace = ({ video, project, settings, onUpdateTask, onClose, userId, db }) => {
    const { blueprint, setBlueprint, isLoading, error } = useBlueprint(video, project, userId, db);

    const initialCurrentStep = video.tasks?.scriptingV2_current_step || 1;
    const [currentStep, setCurrentStep] = useState(initialCurrentStep);

    const debouncedCurrentStep = useDebounce(currentStep, 500);

    useEffect(() => {
        if (debouncedCurrentStep && debouncedCurrentStep !== initialCurrentStep) {
             db.collection(`artifacts/${window.CREATOR_HUB_CONFIG.APP_ID}/users/${userId}/projects/${project.id}/videos`).doc(video.id).update({
                'tasks.scriptingV2_current_step': debouncedCurrentStep
            }).catch(err => {
                console.error("Error auto-saving current step:", err);
            });
        }
    }, [debouncedCurrentStep, video.id, project.id, userId, db, initialCurrentStep]);

    const steps = [
        { id: 1, name: 'Step 1: Initial Blueprint', isCompleted: project.tasks?.scriptingV2_initial_blueprint?.status === 'completed' },
        { id: 2, name: 'Step 2: Research & Curation', isCompleted: project.tasks?.scriptingV2_research_curation?.status === 'completed' },
        { id: 3, name: 'Step 3: On-Camera Scripting', isCompleted: project.tasks?.scriptingV2_on_camera_scripting?.status === 'completed' },
        { id: 4, name: 'Step 4: Final Assembly', isCompleted: project.tasks?.scriptingV2_final_assembly?.status === 'completed' },
    ];

    const handleStepClick = (stepId) => {
        setCurrentStep(stepId);
    };

    const renderCurrentStepContent = () => {
        const props = { blueprint, setBlueprint, video, project, settings, onUpdateTask, onClose };

        switch (currentStep) {
            case 1: return React.createElement(Step1_InitialBlueprint, props);
            case 2: return React.createElement(Step2_ResearchCuration, props);
            case 3: return React.createElement(Step3_OnCameraScripting, props);
            case 4: return React.createElement(Step5_FinalAssembly, props);
            default: return React.createElement('div', null, 'Unknown step');
        }
    };

    const renderBlueprintDisplay = () => {
        if (isLoading) {
            return React.createElement('div', {className: 'flex items-center justify-center h-full'}, React.createElement('p', null, 'Loading Blueprint...'));
        }
        if (error) {
            return React.createElement('div', {className: 'flex items-center justify-center h-full'}, React.createElement('p', { className: 'text-red-400' }, error));
        }
        // MODIFIED LINE: Pass the 'settings' prop down to the BlueprintDisplay component
        return React.createElement(BlueprintDisplay, { blueprint: blueprint, project: project, video: video, settings: settings });
    };

    // Main render
    return React.createElement('div', { className: 'fixed inset-0 bg-gray-900 z-50 overflow-y-auto text-white' },
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
            React.createElement('div', { className: 'flex-grow flex flex-col lg:flex-row min-h-0' },
                // Left Column
                React.createElement('div', { className: 'w-full lg:w-1/2 p-6 border-r border-gray-800 flex flex-col' },
                    React.createElement(BlueprintStepper, { steps, currentStep, onStepClick: handleStepClick }),
                    React.createElement('div', { className: 'flex-grow overflow-y-auto pr-2' }, renderCurrentStepContent())
                ),

                // Right Column
                React.createElement('div', { className: 'w-full lg:w-1/2 p-6 flex flex-col' },
                    React.createElement('h3', { className: 'text-xl font-semibold mb-4 text-amber-400 flex-shrink-0' }, 'Creative Blueprint'),
                    React.createElement('div', { className: 'bg-gray-800/50 p-1 rounded-lg flex-grow overflow-y-auto border border-gray-700' },
                        React.createElement('div', {className: 'p-3'}, renderBlueprintDisplay())
                    )
                )
            )
        )
    );
};
