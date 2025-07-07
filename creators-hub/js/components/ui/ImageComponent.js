// creators-hub/js/components/ui/ImageComponent.js

const { useState, useEffect } = React;

window.ImageComponent = ({ src, photoReference, alt, className, style }) => {
    const [imgSrc, setImgSrc] = useState(null);
    const placeholder = `https://placehold.co/600x400/1f2937/00bfff?text=${encodeURIComponent(alt)}`;

    useEffect(() => {
        // If a photoReference is provided, construct the URL to our Netlify function.
        if (photoReference) {
            setImgSrc(`/.netlify/functions/fetch-place-photo?photoName=${photoReference}`);
        } else {
            // Otherwise, use the direct 'src' prop.
            setImgSrc(src);
        }
    }, [src, photoReference]);

    return React.createElement('img', {
        src: imgSrc || placeholder,
        alt: alt,
        className: className,
        style: style,
        onError: () => {
            // Fallback to the placeholder only if an error occurs.
            if (imgSrc !== placeholder) {
                setImgSrc(placeholder);
            }
        }
    });
};
