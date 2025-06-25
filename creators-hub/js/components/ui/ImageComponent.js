const { useState, useEffect } = React;

window.ImageComponent = ({ src, alt, className }) => {
    const [imgSrc, setImgSrc] = useState(src);
    const placeholder = `https://placehold.co/600x400/1f2937/00bfff?text=${encodeURIComponent(alt)}`;
    useEffect(() => { setImgSrc(src) }, [src]);
    return <img src={imgSrc || placeholder} alt={alt} className={className} onError={() => setImgSrc(placeholder)} />;
};
