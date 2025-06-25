const { useEffect } = React;

window.CanvaModal = ({ canvaUrl, onClose }) => {
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, []);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-[100] flex flex-col p-4">
            <div className="flex justify-end mb-4">
                <button onClick={onClose} className="text-white text-3xl font-bold leading-none">&times;</button>
            </div>
            <div className="flex-grow bg-white rounded-lg">
                <iframe
                    src={canvaUrl}
                    className="w-full h-full border-0 rounded-lg"
                    title="Canva Editor"
                ></iframe>
            </div>
        </div>
    );
};
