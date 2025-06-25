window.LoadingSpinner = ({ text = "", isButton = false }) => {
    const spinner = (
        <div className="flex items-center justify-center space-x-2">
            <div className="h-3 w-3 bg-primary-accent rounded-full animate-pulse" style={{ animationDuration: '1.2s' }}></div>
            <div className="h-3 w-3 bg-primary-accent rounded-full animate-pulse" style={{ animationDelay: '0.2s', animationDuration: '1.2s' }}></div>
            <div className="h-3 w-3 bg-primary-accent rounded-full animate-pulse" style={{ animationDelay: '0.4s', animationDuration: '1.2s' }}></div>
        </div>
    );

    if (isButton) {
        return spinner;
    }

    return (
        <div className="flex flex-col justify-center items-center py-4">
            {spinner}
            {text && <p className="mt-4 text-sm text-gray-400">{text}</p>}
        </div>
    );
};
