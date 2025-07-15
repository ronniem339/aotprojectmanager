const { useMediaQuery } = window;

const DesktopStepper = ({ steps, currentStepId, onStepClick, highestStepIndex }) => {
    return (
        <div className="flex items-center gap-x-1 sm:gap-x-2 mb-6 pb-4 border-b border-gray-700">
            {steps.map((step, index) => {
                const isCurrent = currentStepId === step.id;
                const isCompleted = step.isCompleted;
                const isClickable = index <= highestStepIndex && !isCurrent;

                return (
                    <React.Fragment key={step.id}>
                        <button
                            onClick={() => isClickable && onStepClick(step.id)}
                            className={`flex items-center px-2 py-1 rounded-lg transition-all duration-200 border-2
                                ${isCurrent
                                    ? 'border-primary-accent bg-blue-900/50 text-white font-semibold scale-105'
                                    : isCompleted
                                        ? 'border-transparent bg-green-700/50 text-white/90 hover:bg-green-700/80'
                                        : 'border-transparent bg-gray-800 text-gray-400'
                                } ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
                        >
                            <span className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center font-bold text-base ${
                                isCurrent ? 'bg-primary-accent text-white' : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-700'
                            }`}>
                                {isCompleted && !isCurrent ? '✓' : index + 1}
                            </span>
                            <span className="hidden sm:inline">{step.name}</span>
                        </button>
                        {(index < steps.length - 1) && (
                            <div className={`h-1 flex-grow rounded-full transition-colors duration-500 mx-1 hidden sm:block
                                ${isCompleted ? 'bg-green-700' : 'bg-gray-700'}`}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

const MobileStepper = ({ steps, currentStepId, onStepClick }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const currentStepName = steps.find(s => s.id === currentStepId)?.name || 'Menu';

    const handleSelect = (stepId) => {
        onStepClick(stepId);
        setIsOpen(false);
    };

    return (
        <div className="relative mb-4 pb-4 border-b border-gray-700">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full bg-gray-800 text-white font-semibold py-3 px-4 rounded-lg flex justify-between items-center">
                <span>{currentStepName}</span>
                <svg className={`w-5 h-5 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 right-0 bg-gray-800 border border-gray-700 rounded-b-lg z-10">
                    {steps.map((step, index) => {
                        const isCurrent = currentStepId === step.id;
                        const isCompleted = step.isCompleted;
                        const isClickable = index <= highestStepIndex && !isCurrent;

                        return (
                            <button
                                key={step.id}
                                onClick={() => isClickable && handleSelect(step.id)}
                                disabled={!isClickable}
                                className={`w-full text-left px-4 py-3 flex items-center space-x-3 hover:bg-gray-700 disabled:opacity-50
                                    ${isCompleted ? 'text-green-300' : 'text-gray-200'}`}
                            >
                                <span className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center font-bold ${
                                    isCurrent ? 'bg-primary-accent text-white' : isCompleted ? 'bg-green-600 text-white' : 'bg-gray-600'
                                }`}>
                                    {isCompleted && !isCurrent ? '✓' : index + 1}
                                </span>
                                <span>{step.name}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

window.BlueprintStepper = ({ steps, currentStepIndex, video, handlers, highestStepIndex }) => {
    const handleStepClick = (stepId) => {
        const clickedStepIndex = steps.findIndex(s => s.id === stepId);
        if (clickedStepIndex < currentStepIndex) {
            const blueprint = video?.tasks?.scriptingV2_blueprint || {};
            const newBlueprint = { ...blueprint, workflowStatus: stepId };
            handlers.updateVideo(video.id, { tasks: { ...video.tasks, scriptingV2_blueprint: newBlueprint } });
        }
    };
    
    const stepsWithStatus = steps.map((step, index) => ({
        ...step,
        isCompleted: index <= highestStepIndex
    }));
    
    const currentStepId = steps[currentStepIndex]?.id;
    const isMobile = useMediaQuery('(max-width: 767px)');
    
    return isMobile
        ? <MobileStepper steps={stepsWithStatus} currentStepId={currentStepId} onStepClick={handleStepClick} highestStepIndex={highestStepIndex} />
        : <DesktopStepper steps={stepsWithStatus} currentStepId={currentStepId} onStepClick={handleStepClick} highestStepIndex={highestStepIndex} />;
};
