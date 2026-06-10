import StatusBadge from './StatusBadge';

function InfoCards({ items = [] }) {
    if (!items.length) {
        return null;
    }

    return (
        <div className="sales-info-grid">
            {items.map((item) => (
                <article key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <small>{item.note}</small>
                </article>
            ))}
        </div>
    );
}

function ProductCards({ products = [] }) {
    if (!products.length) {
        return null;
    }

    return (
        <div className="sales-product-grid">
            {products.map((product) => (
                <article key={product.id}>
                    <div className="product-thumb">{product.imageCode}</div>
                    <div>
                        <div className="sales-card-head">
                            <strong>{product.name}</strong>
                            <StatusBadge value={product.status} />
                        </div>
                        <small>{product.company} / {product.category}</small>
                    </div>
                    <div className="sales-card-facts">
                        <span>{product.price}</span>
                        <span>{product.stock}</span>
                    </div>
                    <p>{product.foc}</p>
                    <small>{product.expiry}</small>
                </article>
            ))}
        </div>
    );
}

function OrderBuilder({ builder }) {
    if (!builder) {
        return null;
    }

    return (
        <div className="sales-order-builder">
            <section>
                <p className="eyebrow">Pharmacy selector</p>
                <div className="sales-selector-list">
                    {builder.pharmacies.map((pharmacy) => (
                        <article key={pharmacy.name}>
                            <div>
                                <strong>{pharmacy.name}</strong>
                                <small>{pharmacy.owner} / {pharmacy.phone}</small>
                            </div>
                            <StatusBadge value={pharmacy.status} />
                        </article>
                    ))}
                </div>
            </section>

            <section>
                <p className="eyebrow">Product selection</p>
                <div className="sales-cart-lines">
                    {builder.cart.map((item) => (
                        <article key={item.product}>
                            <div>
                                <strong>{item.product}</strong>
                                <small>{item.quantity} {item.unit} / {item.baseQuantity}</small>
                            </div>
                            <div>
                                <strong>{item.total}</strong>
                                <small>{item.stock}</small>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <InfoCards items={builder.previews} />

            <section className="sales-submit-preview">
                <p className="eyebrow">Submit confirmation</p>
                <strong>{builder.submitTitle}</strong>
                <small>{builder.submitNote}</small>
            </section>
        </div>
    );
}

function Timeline({ items = [] }) {
    if (!items.length) {
        return null;
    }

    return (
        <div className="sales-timeline">
            {items.map((item) => (
                <article key={item.label}>
                    <span />
                    <div>
                        <strong>{item.label}</strong>
                        <small>{item.note}</small>
                    </div>
                </article>
            ))}
        </div>
    );
}

export default function SalesWorkspacePreview({ record = {}, screen = {} }) {
    const products = record.productCards || screen.productCards || [];
    const infoCards = record.infoCards || screen.infoCards || [];
    const timeline = record.timeline || screen.timeline || [];

    return (
        <div className="sales-workspace-preview">
            <ProductCards products={products} />
            <OrderBuilder builder={screen.orderBuilder} />
            <InfoCards items={infoCards} />
            <Timeline items={timeline} />
        </div>
    );
}
