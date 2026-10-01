
import { useEffect, useState } from "react";
import { Boxes, Building2, Package, RefreshCw } from "lucide-react";

type Customer = {
  CustomerAccount?: string;
  OrganizationName?: string;
  Email?: string;
};

type Product = {
  ItemNumber?: string;
  ProductName?: string;
  Unit?: string;
  UnitPrice?: number | string;
};

type InventoryItem = {
  ItemNumber?: string;
  Site?: string;
  Warehouse?: string;
  AvailableQuantity?: number | string;
};

type ODataResponse<T> = {
  value?: T[];
};

export function ErpDataPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState("");

  const [loading, setLoading] = useState(true);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [error, setError] = useState("");
  const [inventoryError, setInventoryError] = useState("");

  async function loadCustomersAndProducts() {
    setLoading(true);
    setError("");

    try {
      const [customersResponse, productsResponse] = await Promise.all([
        fetch("/api/erp/customers"),
        fetch("/api/erp/products"),
      ]);

      if (!customersResponse.ok || !productsResponse.ok) {
        throw new Error("Unable to load ERP customers or products.");
      }

      const customersData =
        (await customersResponse.json()) as ODataResponse<Customer>;

      const productsData =
        (await productsResponse.json()) as ODataResponse<Product>;

      const customerList = customersData.value ?? [];
      const productList = productsData.value ?? [];

      setCustomers(customerList);
      setProducts(productList);

      setSelectedItem((current) => {
        if (current && productList.some((p) => p.ItemNumber === current)) {
          return current;
        }
        return productList[0]?.ItemNumber ?? "";
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadInventory(itemNumber: string) {
    if (!itemNumber) {
      setInventory([]);
      return;
    }

    setInventoryLoading(true);
    setInventoryError("");

    try {
      const response = await fetch(
        `/api/erp/inventory/${encodeURIComponent(itemNumber)}`
      );

      if (!response.ok) {
        throw new Error("Unable to load inventory for this product.");
      }

      const data =
        (await response.json()) as ODataResponse<InventoryItem>;

      setInventory(data.value ?? []);
    } catch (err) {
      setInventory([]);
      setInventoryError(
        err instanceof Error ? err.message : "Unable to load inventory."
      );
    } finally {
      setInventoryLoading(false);
    }
  }

  useEffect(() => {
    void loadCustomersAndProducts();
  }, []);

  useEffect(() => {
    void loadInventory(selectedItem);
  }, [selectedItem]);

  const cardClass =
    "rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5";

  const headingClass =
    "mb-4 flex items-center gap-2 text-base font-semibold text-[hsl(var(--foreground))]";

  const tableClass =
    "w-full text-left text-sm text-[hsl(var(--foreground))]";

  const thClass =
    "border-b border-[hsl(var(--border))] px-3 py-3 text-xs font-semibold text-[hsl(var(--muted-foreground))]";

  const tdClass =
    "border-b border-[hsl(var(--border))] px-3 py-3";

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
            ERP Data
          </h1>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            Customers, products and live inventory from your ERP integration.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadCustomersAndProducts()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] px-4 py-2 text-sm font-medium hover:bg-[hsl(var(--muted))] disabled:opacity-50"
        >
          <RefreshCw size={16} />
          Refresh data
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
          <button
            type="button"
            onClick={() => void loadCustomersAndProducts()}
            className="ml-3 font-semibold underline"
          >
            Try again
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={cardClass}>
          <div className="flex items-center gap-3">
            <Building2 size={22} />
            <div>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Customers
              </p>
              <p className="text-2xl font-bold">
                {loading ? "…" : customers.length}
              </p>
            </div>
          </div>
        </div>

        <div className={cardClass}>
          <div className="flex items-center gap-3">
            <Package size={22} />
            <div>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Products
              </p>
              <p className="text-2xl font-bold">
                {loading ? "…" : products.length}
              </p>
            </div>
          </div>
        </div>

        <div className={cardClass}>
          <div className="flex items-center gap-3">
            <Boxes size={22} />
            <div>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Inventory locations
              </p>
              <p className="text-2xl font-bold">
                {inventoryLoading ? "…" : inventory.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <section className={cardClass}>
        <h2 className={headingClass}>
          <Building2 size={19} />
          ERP Customers
        </h2>

        {loading ? (
          <p className="py-6 text-sm">Loading customers…</p>
        ) : customers.length === 0 ? (
          <p className="py-6 text-sm text-[hsl(var(--muted-foreground))]">
            No customers returned by the ERP API.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Account</th>
                  <th className={thClass}>Organization</th>
                  <th className={thClass}>Email</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer, index) => (
                  <tr key={customer.CustomerAccount ?? index}>
                    <td className={tdClass}>
                      {customer.CustomerAccount ?? "—"}
                    </td>
                    <td className={tdClass}>
                      {customer.OrganizationName ?? "—"}
                    </td>
                    <td className={tdClass}>
                      {customer.Email ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={cardClass}>
        <h2 className={headingClass}>
          <Package size={19} />
          ERP Products
        </h2>

        {loading ? (
          <p className="py-6 text-sm">Loading products…</p>
        ) : products.length === 0 ? (
          <p className="py-6 text-sm text-[hsl(var(--muted-foreground))]">
            No products returned by the ERP API.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Item number</th>
                  <th className={thClass}>Product name</th>
                  <th className={thClass}>Unit</th>
                  <th className={thClass}>Unit price</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product, index) => (
                  <tr key={product.ItemNumber ?? index}>
                    <td className={tdClass}>{product.ItemNumber ?? "—"}</td>
                    <td className={tdClass}>{product.ProductName ?? "—"}</td>
                    <td className={tdClass}>{product.Unit ?? "—"}</td>
                    <td className={tdClass}>
                      {product.UnitPrice ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={cardClass}>
        <h2 className={headingClass}>
          <Boxes size={19} />
          Product Inventory
        </h2>

        <label
          htmlFor="erp-product"
          className="mb-2 block text-sm font-medium"
        >
          Select a product
        </label>

        <select
          id="erp-product"
          value={selectedItem}
          onChange={(event) => setSelectedItem(event.target.value)}
          disabled={loading || products.length === 0}
          className="mb-4 w-full max-w-md rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
        >
          {products.length === 0 && <option value="">No products available</option>}
          {products.map((product, index) => (
            <option
              key={product.ItemNumber ?? index}
              value={product.ItemNumber ?? ""}
            >
              {product.ItemNumber} — {product.ProductName}
            </option>
          ))}
        </select>

        {inventoryError && (
          <p role="alert" className="mb-3 text-sm text-red-600">
            {inventoryError}
            <button
              type="button"
              onClick={() => void loadInventory(selectedItem)}
              className="ml-2 font-semibold underline"
            >
              Retry
            </button>
          </p>
        )}

        {inventoryLoading ? (
          <p className="py-4 text-sm">Loading inventory…</p>
        ) : inventory.length === 0 ? (
          <p className="py-4 text-sm text-[hsl(var(--muted-foreground))]">
            No inventory records found for this product.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Item number</th>
                  <th className={thClass}>Site</th>
                  <th className={thClass}>Warehouse</th>
                  <th className={thClass}>Available quantity</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item, index) => (
                  <tr
                    key={`${item.ItemNumber}-${item.Site}-${item.Warehouse}-${index}`}
                  >
                    <td className={tdClass}>{item.ItemNumber ?? "—"}</td>
                    <td className={tdClass}>{item.Site ?? "—"}</td>
                    <td className={tdClass}>{item.Warehouse ?? "—"}</td>
                    <td className={tdClass}>
                      <span className="font-semibold">
                        {item.AvailableQuantity ?? "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
