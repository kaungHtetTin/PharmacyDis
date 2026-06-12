export const productCategories = {
    eyebrow: 'Catalog',
    title: 'Product Categories',
    description: 'Create and maintain product categories used by catalog filtering, product setup, inventory review, and reports.',
    primaryAction: 'Add category',
    showFilterToolbar: false,
    columns: [
        { key: 'name', label: 'Category' },
        { key: 'code', label: 'Code' },
        { key: 'parent', label: 'Parent' },
        { key: 'products', label: 'Products' },
        { key: 'status', label: 'Status', type: 'status' },
    ],
    rows: [
        {
            id: 'cat-001',
            name: 'Pain Relief',
            code: 'PAIN',
            parent: '-',
            products: '2 products',
            status: 'Active',
        },
        {
            id: 'cat-002',
            name: 'Vitamins',
            code: 'VIT',
            parent: '-',
            products: '1 product',
            status: 'Active',
        },
    ],
    formFields: [
        { label: 'Category name' },
        { label: 'Category code' },
        { label: 'Parent category', type: 'select', options: [] },
        { label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
    ],
    factFields: [
        { key: 'code', label: 'Code' },
        { key: 'parent', label: 'Parent category' },
        { key: 'products', label: 'Products' },
        { key: 'status', label: 'Status' },
    ],
};
