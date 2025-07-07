// creators-hub/js/components/ProjectVew/tasks/ScriptingV2/ScriptingV2_Workspace.js

const { useState, useEffect, useRef } = React;
// REMOVED: MemoryJogger from window destructuring
const { useBlueprint, BlueprintStepper, Step1_InitialBlueprint, Step2_ResearchCuration, Step3_OnCameraScripting, Step5_FinalAssembly, BlueprintDisplay, learnFromTranscriptAI } = window;
const { useDebounce } = window;

// REMOVED: fetchPlaceDetails and updateFootageInventoryItem from props
window.ScriptingV2_Workspace = ({ video, project, settings, onUpdateTask, onClose, userId, db, triggerAiTask }) => {
    const { blueprint, setBlueprint, isLoading, error } = useBlueprint(video, project, userId, db);
    const initialCurrentStep = video.tasks?.scriptingV2_current_step || 1;
    const [currentStep, setCurrentStep] = useState(initialCurrentStep);
    const debouncedCurrentStep = useDebounce(currentStep, 500);
    const [isBlueprintFullScreen, setIsBlueprintFullScreen] = useState(false);
    const processedTranscriptRef = useRef(null);

    useEffect(() => {
        if (debouncedCurrentStep && debouncedCurrentStep !== initialCurrentStep) {
            db.collection(`artifacts/${window.CREATOR_HUB_CONFIG.APP_ID}/users/${userId}/projects/${project.id}/videos`).doc(video.id).update({
                'tasks.scriptingV2_current_step': debouncedCurrentStep
            }).catch(err => {
                console.error("Error auto-saving current step:", err);
            });
        }
    }, [debouncedCurrentStep, video.id, project.id, userId, db, initialCurrentStep]);

    useEffect(() => {
        if (blueprint?.transcript && blueprint.transcript !== processedTranscriptRef.current) {
            console.log("New transcript detected. Learning from it...");
            learnFromTranscriptAI(blueprint.transcript, project.id);
            processedTranscriptRef.current = blueprint.transcript;
        }
    }, [blueprint?.transcript, project.id]);

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
        // REMOVED: fetchPlaceDetails and updateFootageInventoryItem from props passed to steps
        const props = { blueprint, setBlueprint, video, project, settings, onUpdateTask, onClose, triggerAiTask };
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

        return React.createElement(BlueprintDisplay, {
            blueprint: blueprint,
            project: project,
            video: video,
            settings: settings,
            // REMOVED: fetchPlaceDetails and updateFootageInventoryItem props
            isFullScreen: isBlueprintFullScreen
        });
    };

    return React.createElement('div', { className: 'fixed inset-0 bg-gray-900 z-50 overflow-y-auto text-white' },
        React.createElement('div', { className: 'flex flex-col h-full' },
            React.createElement('div', { className: 'flex-shrink-0 flex justify-between items-center p-4 border-b border-gray-700' },
                React.createElement('h2', { className: 'text-2xl font-bold' },
                    'Scripting Workspace: ',
                    React.createElement('span', { className: 'text-primary-accent' }, video.title)
                ),
                React.createElement('button', { onClick: onClose, className: 'text-gray-400 hover:text-white text-3xl leading-none' }, '×')
            ),
            React.createElement('div', { className: 'flex-grow flex flex-col lg:flex-row min-h-0' },
                React.createElement('div', {
                    className: `
                        ${isBlueprintFullScreen ? 'hidden' : 'w-full lg:w-1/2 p-4 sm:p-6 border-r border-gray-800 flex flex-col'}
                    `
                },
                    React.createElement(BlueprintStepper, { steps, currentStep, onStepClick: handleStepClick }),
                    React.createElement('div', { className: 'flex-grow' }, renderCurrentStepContent())
                ),
                React.createElement('div', {
                    className: `
                        ${isBlueprintFullScreen ? 'w-full' : 'w-full lg:w-1/2'}
                        p-4 sm:p-6 flex flex-col transition-all duration-300
                    `
                },
                    React.createElement('div', { className: 'flex-shrink-0 flex justify-between items-center mb-4' },
                        React.createElement('h3', { className: 'text-xl font-semibold text-amber-400' }, 'Creative Blueprint'),
                        React.createElement('button', {
                            onClick: () => setIsBlueprintFullScreen(prev => !prev),
                            className: 'p-2 rounded-md hover:bg-gray-700 transition-colors',
                            title: isBlueprintFullScreen ? 'Collapse View' : 'Expand View'
                        },
                            isBlueprintFullScreen
                                ? React.createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', className: 'h-5 w-5', viewBox: '0 0 20 20', fill: 'currentColor' },
                                    React.createElement('path', { fillRule: 'evenodd', d: 'M15.707 15.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L12.414 10l3.293 3.293a1 1 0 010 1.414zM4.293 4.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L7.586 10 4.293 6.707a1 1 0 010-1.414z', clipRule: 'evenodd' })
                                )
                                : React.createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', className: 'h-5 w-5', viewBox: '0 0 20 20', fill: 'currentColor' },
                                    React.createElement('path', { fillRule: 'evenodd', d: 'M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z', clipRule: 'evenodd' })
                                )
                        )
                    ),
                    React.createElement('div', { className: 'bg-gray-800/50 p-1 rounded-lg flex-grow overflow-y-auto border border-gray-700 custom-scrollbar' },
                        React.createElement('div', {className: 'p-3'}, renderBlueprintDisplay())
                    )
                )
            )
        )
    );
};
