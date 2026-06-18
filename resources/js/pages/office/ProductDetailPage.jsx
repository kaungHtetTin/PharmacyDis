import Icon from '../../components/shared/Icon';
import PageHeader from '../../components/shared/PageHeader';
import Panel from '../../components/shared/Panel';
import ProductUnitGrid from '../../components/shared/ProductUnitGrid';
import StatusBadge from '../../components/shared/StatusBadge';
import useApiResource from '../../hooks/useApiResource';
import { mapProducts } from '../../services/screenAdapters';

function ProductSnapshot({ product }) {
    const facts = [
        ['Product', product.name],
        ['SKU', product.sku],
        ['Barcode', product.barcode],
        ['Company', product.company],
        ['Category', product.category],
        ['Brand', product.brand],
        ['Base unit', product.baseUnit],
        ['Discount', product.discountRate],
        ['Commission', product.commissionRate],
        ['Low stock threshold', product.baseStock],
        ['FOC status', product.focStatus],
        ['Status', product.status],
    ];

    return (
        <div className="fact-grid invoice-detail-facts">
            {facts.map(([label, value]) => (
                <div key={label}>
                    <span>{label}</span>
                    <strong>{value || '-'}</strong>
                </div>
            ))}
        </div>
    );
}

function FocRuleCards({ rules = [] }) {
    if (!rules.length) {
        return <p className="helper-copy">No active FOC rules are configured for this product.</p>;
    }

    return (
        <div className="rule-card-grid">
            {rules.map((rule) => (
                <article key={rule.id || rule.title}>
                    <div>
                        <strong>{rule.title}</strong>
                        <StatusBadge value={rule.status || rule.type} />
                    </div>
                    <span>{rule.condition}</span>
                    <small>{rule.reward}</small>
                    {rule.validity && <small>{rule.validity}</small>}
                </article>
            ))}
        </div>
    );
}

function ProductImage({ product }) {
    return (
        <div className="product-detail-hero">
            {product.imageUrl ? (
                <img alt={product.name || 'Product image'} src={product.imageUrl} />
            ) : (
                <span className="product-detail-image-placeholder">
                    <Icon name="image" size={26} />
                </span>
            )}
        </div>
    );
}

export default function ProductDetailPage({ onNavigate }) {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('product_id') || params.get('record_id') || '';
    const productResource = useApiResource(productId ? `/office/products/${productId}` : '');
    const [product] = productResource.data ? mapProducts({ data: [productResource.data] }) : [];

    if (!productId) {
        return (
            <div className="page-stack">
                <PageHeader
                    action={<button className="btn secondary" onClick={() => onNavigate?.('products')} type="button">Back to products</button>}
                    description="Open a product from the product list to review catalog, pricing, and rule detail."
                    eyebrow="Product Detail"
                    title="Select product"
                />
                <Panel eyebrow="Product Detail" title="No product selected">
                    <p className="helper-copy">Choose a product row to open the full product detail page.</p>
                </Panel>
            </div>
        );
    }

    return (
        <div className="page-stack invoice-detail-page">
            <PageHeader
                action={(
                    <div className="page-heading-actions">
                        {product && (
                            <button
                                className="btn secondary"
                                onClick={() => onNavigate?.('inventory-detail', {
                                    company_id: product.company_id || '',
                                    product_id: product.id,
                                    product_name: product.name,
                                })}
                                type="button"
                            >
                                View inventory
                            </button>
                        )}
                        <button className="btn secondary" onClick={() => onNavigate?.('products')} type="button">Back to products</button>
                    </div>
                )}
                description="Review product catalog data, unit pricing, default sales unit, stock threshold, and active FOC rules."
                eyebrow="Product Detail"
                title={product?.name || (productResource.loading ? 'Loading product' : 'Product detail')}
            />

            {productResource.error && <span className="error-text">{productResource.error}</span>}
            {productResource.loading && (
                <Panel eyebrow="Product Detail" title="Loading product">
                    <p className="helper-copy">Loading product detail, unit pricing, and active FOC rules...</p>
                </Panel>
            )}
            {!productResource.loading && !product && !productResource.error && (
                <Panel eyebrow="Product Detail" title="Product not found">
                    <p className="helper-copy">The selected product could not be found.</p>
                </Panel>
            )}

            {product && (
                <>
                    <section className="invoice-detail-hero glass">
                        <ProductImage product={product} />
                        <div>
                            <div className="rep-title-row">
                                <h2>{product.name}</h2>
                                <StatusBadge value={product.status} />
                            </div>
                            <p>{product.company} / {product.category}</p>
                            <p>{product.sku || '-'} / {product.barcode || '-'}</p>
                        </div>
                        <div className="invoice-detail-total">
                            <span>Default discount</span>
                            <strong>{product.discountRate}</strong>
                            <small>Commission {product.commissionRate}</small>
                        </div>
                    </section>

                    <Panel eyebrow="Catalog Snapshot" title="Company, category, brand, and stock threshold">
                        <ProductSnapshot product={product} />
                    </Panel>

                    <Panel eyebrow="Unit Pricing" title="Product units and selling prices">
                        {product.productUnits?.length ? (
                            <ProductUnitGrid rows={product.productUnits} />
                        ) : (
                            <p className="helper-copy">No product units are configured for this product.</p>
                        )}
                    </Panel>

                    <Panel eyebrow="FOC Rules" title="Active free-of-charge rules">
                        <FocRuleCards rules={product.focRules} />
                    </Panel>

                    {product.description && (
                        <Panel eyebrow="Description" title="Product notes">
                            <p className="helper-copy">{product.description}</p>
                        </Panel>
                    )}
                </>
            )}
        </div>
    );
}
