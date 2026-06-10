# Phase 0 Frontend Foundation

## Current Status

Phase 0 has started with a shared Laravel + React frontend foundation.

Confirmed decisions:

- Current screen names are approved.
- Route state should stay simple.
- Styling foundation will use Tailwind CSS.
- Semantic app classes will remain for dashboard-specific layout and UI kit consistency.

Implemented:

- React mounted inside the Laravel application.
- Vite asset entry through `resources/js/app.js`.
- Office application layout shell.
- Sales representative web application layout shell.
- Shared UI primitives.
- Mock navigation data.
- Mock dashboard data.
- Module pages for every office navigation item.
- Module pages for every sales representative navigation item.
- Shared data table component.
- Shared filter toolbar component.
- Shared form field component.
- Shared modal component.
- Shared drawer component.
- Real module pages for office screens.
- Real module pages for sales representative screens.
- Real modal, drawer, tabs, and print preview components.
- Base dashboard styling based on the admin UI kit direction.
- Tailwind CSS configuration.
- Laravel-provided initial route state through `window.appConfig`.

## Frontend Structure

```text
resources/js/
  app.js
  bootstrap.js
  Root.jsx
  components/
    shared/
      Icon.jsx
      Logo.jsx
      MetricCard.jsx
      DataTable.jsx
      Drawer.jsx
      FilterToolbar.jsx
      FormField.jsx
      Modal.jsx
      Panel.jsx
      PrintPreview.jsx
      SummaryCard.jsx
      StatusBadge.jsx
      Tabs.jsx
  data/
    navigation.js
    officeModules.js
    salesModules.js
    mock/
      companies.js
      products.js
      units.js
      pharmacies.js
      representatives.js
      inventory.js
      receiving.js
      orders.js
      invoices.js
      payments.js
      finance.js
      foc.js
      commissions.js
      reports.js
      settings.js
      officeDashboard.js
      salesDashboard.js
      salesModules.js
  layouts/
    OfficeLayout.jsx
    SalesRepLayout.jsx
  pages/
    office/
      DashboardPage.jsx
      OfficeModulePage.jsx
    sales/
      SalesDashboardPage.jsx
      SalesModulePage.jsx
```

## Package Direction

Runtime dependencies:

- React.
- React DOM.
- Axios.

Development dependencies:

- Vite.
- Laravel Vite Plugin.
- Vite React Plugin.
- Tailwind CSS.
- PostCSS.
- Autoprefixer.

No frontend router has been added yet. Phase 0 uses local React state for screen switching so the dependency list stays small.

## Office Navigation

Current office shell navigation:

- Dashboard.
- Companies.
- Products.
- Units.
- Pharmacies.
- Sales Reps.
- Inventory.
- Receiving.
- Orders.
- Invoices.
- Payments.
- Receivables.
- Payables.
- FOC Rules.
- Commissions.
- Reports.
- Settings.

## Sales Representative Navigation

Current sales representative shell navigation:

- Dashboard.
- Products.
- Stock.
- Pharmacies.
- New Order.
- Order History.
- Performance.

## Route Endpoints

Laravel web routes now serve the React app at these endpoints:

```text
/office
/office/dashboard
/office/companies
/office/products
/office/units
/office/pharmacies
/office/representatives
/office/inventory
/office/receiving
/office/orders
/office/invoices
/office/payments
/office/receivables
/office/payables
/office/foc-rules
/office/commissions
/office/reports
/office/settings

/sales
/sales/dashboard
/sales/products
/sales/stock
/sales/pharmacies
/sales/new-order
/sales/orders
/sales/performance
```

With the current local XAMPP base URL, examples are:

```text
http://localhost/paramacy-dis/public/office/dashboard
http://localhost/paramacy-dis/public/sales/dashboard
```

Navigation links use these endpoints and update browser history without requiring a full page reload.

Route state is intentionally simple:

- Laravel provides `currentApp` and `currentPage` to React.
- React keeps only `{ appMode, page }` in local state.
- Nav clicks update browser history and local state.
- Browser back/forward reloads the Laravel route to keep behavior predictable.

## Tailwind Setup

Tailwind is enabled through:

```text
tailwind.config.js
postcss.config.js
resources/css/app.css
```

The project keeps semantic classes such as `.admin-app`, `.panel`, `.metric-card`, and `.sales-nav` because they map clearly to the UI kit and product screens. Tailwind utilities can be used inside future components as screens become more detailed.

## Next Phase 0 Tasks

- Confirm final screen names with the team.
- Add frontend mock data files for companies, products, pharmacies, inventory, and orders.
- Define real drawer and modal open/close behavior.
- Define frontend validation message patterns.
- Define API response shapes before backend development starts.

## Commands

After package changes, run:

```powershell
npm install
npm run build
```
