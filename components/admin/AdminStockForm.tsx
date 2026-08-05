"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  addStockItem,
  defaultVcpuForRam,
  getPlanPromos,
  getRamPlans,
  updateStockItem,
  type PromoEntry,
  type PromoType,
  type RamPlan,
  type StockItem,
  type StockType,
  stockProviderLabels,
  stockProviders,
  type StockProvider,
} from "@/lib/stock";
import {
  resolveOsSelect,
  resolveOsValue,
  resolveRegionSelect,
  resolveRegionValue,
  proxyPortPresets,
  stockOsOptions,
  stockRegions,
} from "@/lib/stock-options";

type PromoRow = {
  id: string;
  code: string;
  type: PromoType;
  value: number;
};

type RamPlanRow = {
  id: string;
  label: string;
  enabled: boolean;
  ram: number;
  vcpu: number;
  price: number;
  promos: PromoRow[];
  isCustom?: boolean;
};

let promoUid = 0;
const nextPromoId = () => `promo-${Date.now().toString(36)}-${++promoUid}`;
const emptyPromoRow = (): PromoRow => ({
  id: nextPromoId(),
  code: "",
  type: "percent",
  value: 0,
});

const defaultRamPlanRows = (): RamPlanRow[] => [
  { id: "ram-4", label: "4 GB", enabled: false, ram: 4, vcpu: 2, price: 0, promos: [] },
  { id: "ram-8", label: "8 GB", enabled: false, ram: 8, vcpu: 4, price: 0, promos: [] },
  { id: "ram-16", label: "16 GB", enabled: false, ram: 16, vcpu: 8, price: 0, promos: [] },
  {
    id: "ram-custom",
    label: "Custom",
    enabled: false,
    ram: 32,
    vcpu: 8,
    price: 0,
    promos: [],
    isCustom: true,
  },
];

const defaultForm = {
  type: "vps" as StockType,
  series: "",
  port: "",
  portPreset: "8080",
  customPort: "",
  storage: 100,
  quantity: 1,
  proxyPrice: 499,
  regionSelect: "Mumbai",
  customRegion: "",
  osSelect: "All OS Available",
  customOs: "",
};

function promosToRows(entries: PromoEntry[]): PromoRow[] {
  return entries.map((e) => ({
    id: nextPromoId(),
    code: e.code,
    type: e.type,
    value: e.value,
  }));
}

function rowsFromRamPlans(plans: RamPlan[]): RamPlanRow[] {
  const rows = defaultRamPlanRows();
  const presetRams = new Set([4, 8, 16]);
  const planToRow = (row: RamPlanRow, src: RamPlan) => {
    row.enabled = true;
    row.vcpu = src.vcpu;
    row.price = src.price;
    row.promos = promosToRows(getPlanPromos(src));
  };
  for (const row of rows) {
    if (row.isCustom) {
      const custom = plans.find((p) => !presetRams.has(p.ram));
      if (custom) {
        row.ram = custom.ram;
        planToRow(row, custom);
      }
      continue;
    }
    const match = plans.find((p) => p.ram === row.ram);
    if (match) planToRow(row, match);
  }
  return rows;
}

function ramPlansFromRows(rows: RamPlanRow[]): RamPlan[] {
  return rows
    .filter((row) => row.enabled && row.ram > 0 && row.vcpu > 0 && row.price > 0)
    .map((row) => {
      const plan: RamPlan = { ram: row.ram, vcpu: row.vcpu, price: row.price };
      const seen = new Set<string>();
      const promos: PromoEntry[] = [];
      for (const p of row.promos) {
        const code = p.code.trim().toUpperCase();
        if (!code || seen.has(code)) continue;
        const value = Math.round(p.value);
        if (!value || value <= 0) continue;
        if (p.type === "percent" && value > 100) continue;
        if (p.type === "flat" && value >= row.price) continue;
        seen.add(code);
        promos.push({ code, type: p.type, value });
      }
      if (promos.length > 0) plan.promos = promos;
      return plan;
    });
}

type Props = {
  editingItem?: StockItem | null;
  onSaved?: (item: StockItem | null) => void;
  onCancel?: () => void;
};

export function AdminStockForm({ editingItem, onSaved, onCancel }: Props) {
  const [type, setType] = useState<StockType>(defaultForm.type);
  const [series, setSeries] = useState(defaultForm.series);
  const [portPreset, setPortPreset] = useState(defaultForm.portPreset);
  const [customPort, setCustomPort] = useState(defaultForm.customPort);
  const [storage, setStorage] = useState(defaultForm.storage);
  const [quantity, setQuantity] = useState(defaultForm.quantity);
  const [proxyPrice, setProxyPrice] = useState(defaultForm.proxyPrice);
  const [ramPlanRows, setRamPlanRows] = useState<RamPlanRow[]>(defaultRamPlanRows);
  const [regionSelect, setRegionSelect] = useState(defaultForm.regionSelect);
  const [customRegion, setCustomRegion] = useState(defaultForm.customRegion);
  const [osSelect, setOsSelect] = useState(defaultForm.osSelect);
  const [customOs, setCustomOs] = useState(defaultForm.customOs);
  const [provider, setProvider] = useState<StockProvider>("manual");
  const [providerVmId, setProviderVmId] = useState("");
  const [providerProductId, setProviderProductId] = useState("");
  const [oceanProducts, setOceanProducts] = useState<
    { id: string; name: string; serverType?: string; available: boolean }[]
  >([]);
  const [oceanProductsError, setOceanProductsError] = useState("");
  const [oceanProductsLoading, setOceanProductsLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const editingId = editingItem?.id ?? null;

  useEffect(() => {
    if (!editingItem) return;
    const region = resolveRegionSelect(editingItem.region);
    const os = resolveOsSelect(editingItem.os);
    setType(editingItem.type);
    setSeries(editingItem.series);
    if (editingItem.type === "proxy" && editingItem.port) {
      const isPreset = proxyPortPresets.includes(
        editingItem.port as (typeof proxyPortPresets)[number]
      );
      if (isPreset && editingItem.port !== "Custom") {
        setPortPreset(editingItem.port);
        setCustomPort("");
      } else {
        setPortPreset("Custom");
        setCustomPort(editingItem.port);
      }
    } else {
      setPortPreset("8080");
      setCustomPort("");
    }
    setStorage(editingItem.storage);
    setQuantity(editingItem.quantity);
    setProxyPrice(editingItem.price);
    setRamPlanRows(rowsFromRamPlans(getRamPlans(editingItem)));
    setRegionSelect(region.select);
    setCustomRegion(region.custom);
    setOsSelect(os.select);
    setCustomOs(os.custom);
    setProvider(editingItem.provider ?? "manual");
    setProviderVmId(
      editingItem.providerVmId && editingItem.providerVmId > 0
        ? String(editingItem.providerVmId)
        : ""
    );
    setProviderProductId(editingItem.providerProductId?.trim() || "");
    setFormError("");
  }, [editingItem]);

  useEffect(() => {
    if (provider !== "oceanlinux") return;
    let cancelled = false;
    setOceanProductsLoading(true);
    setOceanProductsError("");
    void fetch("/api/admin/oceanlinux/products")
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          products?: { id: string; name: string; serverType?: string; available: boolean }[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setOceanProducts([]);
          setOceanProductsError(data.error || "Failed to load OceanLinux products.");
          return;
        }
        setOceanProducts(Array.isArray(data.products) ? data.products : []);
      })
      .catch(() => {
        if (!cancelled) {
          setOceanProducts([]);
          setOceanProductsError("Failed to load OceanLinux products.");
        }
      })
      .finally(() => {
        if (!cancelled) setOceanProductsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [provider]);

  const updateRamPlanRow = (id: string, patch: Partial<RamPlanRow>) => {
    setRamPlanRows((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  };

  const addPromoToRow = (rowId: string) => {
    setRamPlanRows((rows) =>
      rows.map((row) =>
        row.id === rowId ? { ...row, promos: [...row.promos, emptyPromoRow()] } : row
      )
    );
  };

  const updatePromoInRow = (
    rowId: string,
    promoId: string,
    patch: Partial<PromoRow>
  ) => {
    setRamPlanRows((rows) =>
      rows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              promos: row.promos.map((p) =>
                p.id === promoId ? { ...p, ...patch } : p
              ),
            }
          : row
      )
    );
  };

  const removePromoFromRow = (rowId: string, promoId: string) => {
    setRamPlanRows((rows) =>
      rows.map((row) =>
        row.id === rowId
          ? { ...row, promos: row.promos.filter((p) => p.id !== promoId) }
          : row
      )
    );
  };

  const providerFields = () => {
    const vmId =
      provider === "hostheaven" && providerVmId.trim()
        ? Number(providerVmId.trim())
        : undefined;
    return {
      provider,
      providerVmId: vmId && vmId > 0 ? Math.round(vmId) : undefined,
      providerProductId:
        provider === "oceanlinux" && providerProductId.trim()
          ? providerProductId.trim()
          : undefined,
    };
  };

  const validateAndGetValues = () => {
    if (!series.trim()) {
      setFormError("Series is required (e.g. 162.4.xx).");
      return null;
    }

    if (provider === "oceanlinux" && !providerProductId.trim()) {
      setFormError("Select an OceanLinux product for this stock.");
      return null;
    }

    const region = resolveRegionValue(regionSelect, customRegion);
    if (!region) {
      setFormError("Please enter a custom region name.");
      return null;
    }

    if (type === "proxy") {
      const port = portPreset === "Custom" ? customPort.trim() : portPreset;
      if (!port) {
        setFormError("Please enter a proxy port (e.g. 8080).");
        return null;
      }
      if (!proxyPrice || proxyPrice < 1) {
        setFormError("Enter a valid proxy price (₹) per unit.");
        return null;
      }
      return {
        type,
        series: series.trim(),
        port,
        vcpu: 0,
        ram: 0,
        storage: 0,
        quantity,
        price: proxyPrice,
        region,
        os: "N/A",
        ...providerFields(),
      };
    }

    const os = resolveOsValue(osSelect, customOs);
    if (!os) {
      setFormError("Please select or enter an operating system.");
      return null;
    }

    const plans = ramPlansFromRows(ramPlanRows);
    if (plans.length === 0) {
      setFormError(
        "Enable at least one RAM option (4/8/16 GB or Custom) with cores and price."
      );
      return null;
    }

    const primary = plans[0];
    return {
      type,
      series: series.trim(),
      port: "",
      vcpu: primary.vcpu,
      ram: primary.ram,
      storage,
      quantity,
      price: primary.price,
      ramPlans: plans,
      region,
      os,
      ...providerFields(),
    };
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    const values = validateAndGetValues();
    if (!values) return;

    setSaving(true);
    try {
      let result: StockItem | null = null;
      if (editingId) {
        result = await updateStockItem(editingId, values);
      } else {
        result = await addStockItem(values);
      }
      onSaved?.(result);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save stock.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="auth-form admin-stock-form" onSubmit={handleSubmit}>
      {formError && <div className="auth-form__error">{formError}</div>}

      <div className="admin-stock-form__grid">
        <div className="auth-form__field">
          <label htmlFor="stock-type">Type</label>
          <select
            id="stock-type"
            value={type}
            onChange={(e) => setType(e.target.value as StockType)}
          >
            <option value="vps">VPS</option>
            <option value="linux">Linux Server</option>
            <option value="proxy">Proxy</option>
          </select>
        </div>

        <div className="auth-form__field">
          <label htmlFor="stock-series">IP Series</label>
          <input
            id="stock-series"
            value={series}
            onChange={(e) => setSeries(e.target.value)}
            placeholder="e.g. 162.4.xx"
            required
          />
        </div>

        <div className="auth-form__field">
          <label htmlFor="stock-provider">Manage via</label>
          <select
            id="stock-provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as StockProvider)}
          >
            {stockProviders.map((p) => (
              <option key={p} value={p}>
                {stockProviderLabels[p]}
              </option>
            ))}
          </select>
          <small className="auth-form__hint">
            HostHeaven / OceanLinux: start/stop/reinstall/sync use that company API for
            servers from this stock only.
          </small>
        </div>

        {provider === "hostheaven" && (
          <div className="auth-form__field">
            <label htmlFor="stock-provider-vm-id">HostHeaven VM ID (optional)</label>
            <input
              id="stock-provider-vm-id"
              type="number"
              min={1}
              step={1}
              value={providerVmId}
              onChange={(e) => setProviderVmId(e.target.value)}
              placeholder="Leave blank — auto-detect by IP"
            />
            <small className="auth-form__hint">
              Only needed if multiple VMs share the same IP. Otherwise leave empty.
            </small>
          </div>
        )}

        {provider === "oceanlinux" && (
          <div className="auth-form__field">
            <label htmlFor="stock-ocean-product">OceanLinux product</label>
            <select
              id="stock-ocean-product"
              value={providerProductId}
              onChange={(e) => setProviderProductId(e.target.value)}
              required
            >
              <option value="">
                {oceanProductsLoading ? "Loading products…" : "Select product…"}
              </option>
              {providerProductId &&
              !oceanProducts.some((p) => p.id === providerProductId) ? (
                <option value={providerProductId}>Saved: {providerProductId}</option>
              ) : null}
              {oceanProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.serverType ? ` · ${p.serverType}` : ""}
                  {p.available ? "" : " (unavailable)"}
                </option>
              ))}
            </select>
            {oceanProductsError ? (
              <small className="auth-form__hint" style={{ color: "var(--danger, #c44)" }}>
                {oceanProductsError}
              </small>
            ) : (
              <small className="auth-form__hint">
                Only this IP series will be managed via OceanLinux API. On deliver, save the
                OceanLinux Order ID for start/stop/sync.
              </small>
            )}
          </div>
        )}

        {type === "proxy" ? (
          <>
            <div className="auth-form__field admin-proxy-port-section">
              <label htmlFor="stock-port">Port</label>
              <select
                id="stock-port"
                value={portPreset}
                onChange={(e) => setPortPreset(e.target.value)}
              >
                {proxyPortPresets.map((p) => (
                  <option key={p} value={p}>
                    {p === "Custom" ? "Custom (enter below)" : `Port ${p}`}
                  </option>
                ))}
              </select>
              {portPreset === "Custom" && (
                <input
                  className="admin-custom-input"
                  value={customPort}
                  onChange={(e) => setCustomPort(e.target.value)}
                  placeholder="e.g. 8888 or 8080,3128"
                  required
                />
              )}
            </div>
            <div className="auth-form__field">
              <label htmlFor="stock-qty">Quantity</label>
              <input
                id="stock-qty"
                type="number"
                min={0}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required
              />
            </div>
            <div className="auth-form__field">
              <label htmlFor="stock-price">Price per unit (₹)</label>
              <input
                id="stock-price"
                type="number"
                min={1}
                step={1}
                value={proxyPrice}
                onChange={(e) => setProxyPrice(Number(e.target.value))}
                placeholder="e.g. 499"
                required
              />
              <small className="auth-form__hint">
                Customer pays this rate via Cashfree checkout.
              </small>
            </div>
          </>
        ) : (
          <>
            <div className="auth-form__field">
              <label htmlFor="stock-storage">Storage (GB)</label>
              <input
                id="stock-storage"
                type="number"
                min={10}
                value={storage}
                onChange={(e) => setStorage(Number(e.target.value))}
                required
              />
              <small className="auth-form__hint">
                vCPU cores are set per RAM tier below (e.g. 8 GB = 4 cores, 16 GB = 8 cores).
              </small>
            </div>
            <div className="auth-form__field">
              <label htmlFor="stock-qty">Quantity</label>
              <input
                id="stock-qty"
                type="number"
                min={0}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required
              />
            </div>
          </>
        )}

        <div className="auth-form__field">
          <label htmlFor="stock-region">Region</label>
          <select
            id="stock-region"
            value={regionSelect}
            onChange={(e) => setRegionSelect(e.target.value)}
          >
            {stockRegions.map((r) => (
              <option key={r} value={r}>
                {r === "Custom" ? "Custom (enter below)" : r}
              </option>
            ))}
          </select>
          {regionSelect === "Custom" && (
            <input
              className="admin-custom-input"
              value={customRegion}
              onChange={(e) => setCustomRegion(e.target.value)}
              placeholder="Enter custom region (e.g. Bangalore)"
              required
            />
          )}
        </div>

        {type !== "proxy" && (
          <div className="auth-form__field">
            <label htmlFor="stock-os">Operating System</label>
            <select
              id="stock-os"
              value={osSelect}
              onChange={(e) => setOsSelect(e.target.value)}
            >
              {stockOsOptions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            {osSelect === "Custom OS" && (
              <input
                className="admin-custom-input"
                value={customOs}
                onChange={(e) => setCustomOs(e.target.value)}
                placeholder="Enter custom OS (e.g. Gentoo Linux)"
                required
              />
            )}
          </div>
        )}
      </div>

      {type !== "proxy" && (
        <div className="admin-ram-plans">
          <div className="admin-ram-plans__head">
            <label>RAM, cores, prices &amp; promo codes</label>
            <small className="auth-form__hint">
              Enable tiers and set cores + price. Add multiple promo codes per tier —
              each code is private (customer must type it). Pick <strong>%</strong> or
              <strong> ₹</strong> per code. Give different codes to different customers.
            </small>
          </div>
          <div className="admin-ram-plans__list">
            {ramPlanRows.map((row) => (
              <div
                key={row.id}
                className={`admin-ram-plans__row${row.enabled ? " admin-ram-plans__row--on" : ""}`}
              >
                <label className="admin-ram-plans__check">
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      updateRamPlanRow(row.id, {
                        enabled,
                        vcpu:
                          enabled && row.vcpu < 1
                            ? defaultVcpuForRam(row.ram)
                            : row.vcpu,
                      });
                    }}
                  />
                  <span>{row.label}</span>
                </label>
                {row.isCustom ? (
                  <input
                    type="number"
                    min={1}
                    className="admin-ram-plans__ram-input"
                    value={row.ram}
                    disabled={!row.enabled}
                    onChange={(e) => {
                      const ram = Number(e.target.value);
                      updateRamPlanRow(row.id, {
                        ram,
                        vcpu: row.vcpu > 0 ? row.vcpu : defaultVcpuForRam(ram),
                      });
                    }}
                    placeholder="GB"
                    aria-label="Custom RAM GB"
                  />
                ) : (
                  <span className="admin-ram-plans__fixed-ram">{row.ram} GB</span>
                )}
                <div className="admin-ram-plans__specs">
                  <div className="admin-ram-plans__cores">
                    <span className="admin-ram-plans__price-label">Cores</span>
                    <input
                      type="number"
                      min={1}
                      value={row.enabled && row.vcpu > 0 ? row.vcpu : ""}
                      disabled={!row.enabled}
                      onChange={(e) =>
                        updateRamPlanRow(row.id, { vcpu: Number(e.target.value) })
                      }
                      placeholder="e.g. 4"
                      aria-label={`${row.label} vCPU cores`}
                    />
                  </div>
                  <div className="admin-ram-plans__price">
                    <span className="admin-ram-plans__price-label">₹ /mo</span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={row.enabled && row.price > 0 ? row.price : ""}
                      disabled={!row.enabled}
                      onChange={(e) =>
                        updateRamPlanRow(row.id, { price: Number(e.target.value) })
                      }
                      placeholder="Price"
                      aria-label={`${row.label} monthly price in rupees`}
                    />
                  </div>
                </div>
                <div className="admin-ram-plans__promos-block">
                  <div className="admin-ram-plans__promos-head">
                    <span className="admin-ram-plans__price-label">
                      Promo codes ({row.promos.length})
                    </span>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm admin-ram-plans__promo-add"
                      onClick={() => addPromoToRow(row.id)}
                      disabled={!row.enabled}
                    >
                      + Add promo
                    </button>
                  </div>
                  {row.promos.length === 0 ? (
                    <p className="admin-ram-plans__promo-empty">
                      No promo codes. Click <em>Add promo</em> to create per-user codes
                      (e.g. <strong>ROCKY10</strong>, <strong>JOHN50</strong>).
                    </p>
                  ) : (
                    <ul className="admin-ram-plans__promos-list">
                      {row.promos.map((promo) => (
                        <li key={promo.id} className="admin-ram-plans__promo-item">
                          <input
                            type="text"
                            className="admin-ram-plans__promo-code-input"
                            value={promo.code}
                            disabled={!row.enabled}
                            maxLength={24}
                            onChange={(e) =>
                              updatePromoInRow(row.id, promo.id, {
                                code: e.target.value
                                  .toUpperCase()
                                  .replace(/[^A-Z0-9_-]/g, ""),
                              })
                            }
                            placeholder="Code (e.g. ROCKY10)"
                            aria-label={`${row.label} promo code`}
                          />
                          <select
                            className="admin-ram-plans__promo-type"
                            value={promo.type}
                            disabled={!row.enabled}
                            onChange={(e) =>
                              updatePromoInRow(row.id, promo.id, {
                                type: e.target.value === "flat" ? "flat" : "percent",
                              })
                            }
                            aria-label={`${row.label} promo type`}
                          >
                            <option value="percent">%</option>
                            <option value="flat">₹</option>
                          </select>
                          <input
                            type="number"
                            min={1}
                            max={promo.type === "percent" ? 100 : undefined}
                            step={1}
                            className="admin-ram-plans__promo-value-input"
                            value={promo.value > 0 ? promo.value : ""}
                            disabled={!row.enabled}
                            onChange={(e) =>
                              updatePromoInRow(row.id, promo.id, {
                                value: Number(e.target.value),
                              })
                            }
                            placeholder={promo.type === "percent" ? "1-100" : "₹ off"}
                            aria-label={`${row.label} promo discount value`}
                          />
                          <button
                            type="button"
                            className="admin-ram-plans__promo-remove"
                            onClick={() => removePromoFromRow(row.id, promo.id)}
                            disabled={!row.enabled}
                            aria-label="Remove promo"
                            title="Remove promo"
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="admin-stock-form__actions">
        {onCancel && (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="btn btn--primary"
          disabled={saving}
        >
          {saving
            ? "Saving…"
            : editingId
              ? "Save Changes"
              : "+ Add to Stock"}
        </button>
      </div>
    </form>
  );
}
