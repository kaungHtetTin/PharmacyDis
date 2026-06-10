export default function ProductImageGallery({ images = [] }) {
    return (
        <div className="product-gallery">
            {images.map((image) => (
                <article className="gallery-tile" key={image.id}>
                    <div className="gallery-thumb">
                        <span>{image.initials}</span>
                    </div>
                    <div>
                        <strong>{image.label}</strong>
                        <small>{image.meta}</small>
                    </div>
                </article>
            ))}
        </div>
    );
}
