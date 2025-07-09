window.LoadingSpinner = ({ text = "", isButton = false }) => {
    // This spinner's JSX is a direct React translation of the pure CSS spinner
    // defined in style.css. This ensures visual consistency during the
    // transition from the initial HTML load to the React app rendering.
    const spinner = (
        <div 
            className="loading-spinner-react" 
            style={{
                border: '4px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '50%',
                borderTop: '4px solid #FBBF24', // This matches the amber color from the original CSS
                width: '50px',
                height: '50px',
                animation: 'spin 1s linear infinite'
            }}
        ></div>
    );

    // Keyframes for the spin animation are injected into the document's head.
    // This ensures the animation is available without needing to modify the main style.css.
    // It checks if the style already exists to avoid duplication.
    useEffect(() => {
        const styleId = 'spinner-keyframes';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
    }, []);


    if (isButton) {
        // A smaller version for buttons, matching the new style.
        return (
             <div 
                className="loading-spinner-react" 
                style={{
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '50%',
                    borderTop: '2px solid #FBBF24',
                    width: '20px',
                    height: '20px',
                    animation: 'spin 1s linear infinite'
                }}
            ></div>
        );
    }

    return (
        <div className="flex flex-col justify-center items-center py-4">
            {spinner}
            {text && <p className="mt-4 text-sm text-gray-400">{text}</p>}
        </div>
    );
};
