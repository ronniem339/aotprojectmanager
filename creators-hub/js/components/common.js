// js/components/common.js

const { useState, useEffect, useRef, useCallback } = React;

const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
};

const loadGoogleMapsScript = (apiKey, callback) => {
    if (window.google?.maps?.places) {
        if (callback) callback();
        return;
    }
    const existingScript = document.getElementById('googleMaps');
    if (existingScript) {
        setTimeout(() => {
            if (window.google?.maps?.places && callback) callback();
        }, 500);
        return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.id = 'googleMaps';
    document.body.appendChild(script);
    script.onload = () => { if (callback) callback() };
    script.onerror = () => console.error("Google Maps script failed to load.");
};

const LoadingSpinner = ({ text = "" }) => (<div className="flex flex-col justify-center items-center p-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>{text && <p className="mt-3 text-sm text-gray-400">{text}</p>}</div>);

const ImageComponent = ({ src, alt, className }) => {
    const [imgSrc, setImgSrc] = useState(src);
    const placeholder = `https://placehold.co/600x400/1f2937/3b82f6?text=${encodeURIComponent(alt)}`;
    useEffect(() => { setImgSrc(src) }, [src]);
    return <img src={imgSrc || placeholder} alt={alt} className={className} onError={() => setImgSrc(placeholder)} />;
};

const LoginScreen = ({ onLogin }) => (<div className="min-h-screen flex flex-col justify-center items-center bg-gray-900 text-white"><h1 className="text-5xl font-bold mb-4">Creator's Hub</h1><p className="text-xl text-gray-400 mb-8">Your AI-Powered Content Co-Pilot</p><button onClick={onLogin} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-lg font-semibold transition-all duration-300 transform hover:scale-105">Start Creating</button></div>);
