"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getUser } from "@/lib/auth";
import { startCashfreeCheckout } from "@/lib/cashfree-client";
import { createOrder, confirmWalletPayment } from "@/lib/orders";
import {
  fetchWallet,
  formatWalletAmount,
  getWalletBalance,
} from "@/lib/wallet";
import {
  applyPromoEntry,
  getProductSeriesName,
  getProductSubtitle,
  formatRamPlanLabel,
  getRamPlan,
  getRamPlans,
  getRamPlanVcpu,
  getStockPrice,
  formatStockSpecs,
  stockTypeLabels,
  validatePromoCode,
  type PromoType,
  type StockItem,
} from "@/lib/stock";

type Props = {
  item: StockItem;
  onClose: () => void;
  onSuccess: (orderId: string, paymentMethod: "wallet" | "cashfree") => void;
};

function sanitizeCustomerId(email: string): string {
  return email.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50) || "linuxpro_user";
}

export function BuyStockModal({ item, onClose, onSuccess }: Props) {
  const ramPlans = getRamPlans(item);
  const [selectedRamGb, setSelectedRamGb] = useState(ramPlans[0]?.ram ?? item.ram);
  const [qty, setQty] = useState(1);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    type: PromoType;
    value: number;
  } | null>(null);
  const [promoMsg, setPromoMsg] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cashfree" | "wallet">("cashfree");
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletSuccess, setWalletSuccess] = useState<{
    orderId: string;
    amount: number;
    delivered?: boolean;
    deliverIp?: string;
  } | null>(null);

  const selectedPlan = getRamPlan(item, selectedRamGb);
  const unitPrice = getStockPrice(item, selectedRamGb);
  const seriesName = getProductSeriesName(item.series);

  useEffect(() => {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoMsg("");
  }, [selectedRamGb]);

  const discountedUnit = useMemo(
    () => (appliedPromo ? applyPromoEntry(unitPrice, appliedPromo) : unitPrice),
    [unitPrice, appliedPromo]
  );
  const total = discountedUnit * qty;
  const savings = (unitPrice - discountedUnit) * qty;

  const formatDiscount = (type: PromoType, value: number) =>
    type === "flat"
      ? `₹${value.toLocaleString("en-IN")} off`
      : `${value}% off`;

  const handleApplyPromo = () => {
    setPromoMsg("");
    const result = validatePromoCode(selectedPlan, promoInput);
    if (!result.ok) {
      setAppliedPromo(null);
      setPromoMsg("Invalid promo code.");
      return;
    }
    setAppliedPromo({ code: result.code, type: result.type, value: result.value });
    setPromoMsg(`Promo applied — ${formatDiscount(result.type, result.value)}!`);
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoMsg("");
  };

  useEffect(() => {
    fetchWallet().then((data) => setWalletBalance(data.balance));
    const onWalletUpdate = () => setWalletBalance(getWalletBalance());
    window.addEventListener("wallet-updated", onWalletUpdate);
    return () => window.removeEventListener("wallet-updated", onWalletUpdate);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleConfirm = async () => {
    setError("");
    const user = getUser();
    if (!user) {
      setError("Please log in to place an order.");
      return;
    }

    const phoneDigits = phone.replace(/\D/g, "");
    if (paymentMethod === "cashfree" && phoneDigits.length < 10) {
      setError("Enter a valid 10-digit phone number for payment.");
      return;
    }

    if (paymentMethod === "wallet" && walletBalance < total) {
      setError(
        `Insufficient wallet balance. You have ${formatWalletAmount(walletBalance)} but need ${formatWalletAmount(total)}.`
      );
      return;
    }

    setLoading(true);

    const order = await createOrder({
      stockId: item.id,
      quantity: qty,
      userName: user.name,
      userEmail: user.email,
      customerPhone: phoneDigits,
      paymentGateway: paymentMethod,
      selectedRamGb: item.type !== "proxy" ? selectedRamGb : undefined,
      promoCode: appliedPromo?.code,
    });

    if (!order) {
      setLoading(false);
      setError("Not enough stock available. Please try a lower quantity.");
      return;
    }

    if (paymentMethod === "wallet") {
      try {
        const paid = await confirmWalletPayment(order.id);
        setLoading(false);
        if (!paid) {
          setError("Wallet payment failed. Please try again or use Cashfree.");
          return;
        }
        await fetchWallet();
        setWalletSuccess({
          orderId: order.id,
          amount: total,
          delivered: paid.fulfillmentStatus === "delivered",
          deliverIp: paid.deliverIp || undefined,
        });
      } catch (err) {
        setLoading(false);
        setError(err instanceof Error ? err.message : "Wallet payment failed.");
      }
      return;
    }

    try {
      const res = await fetch("/api/payments/cashfree/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order.id,
          order_amount: order.totalAmount,
          customer_id: sanitizeCustomerId(user.email),
          customer_name: user.name,
          customer_email: user.email,
          customer_phone: phoneDigits,
          order_note: `IP ${seriesName} · ${stockTypeLabels[item.type]} x${qty}`,
        }),
      });

      const data = await res.json();

      if (!data.success || !data.payment_session_id) {
        setError(data.message || "Could not start Cashfree payment.");
        setLoading(false);
        return;
      }

      onSuccess(order.id, "cashfree");
      await startCashfreeCheckout(data.payment_session_id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Payment gateway error. Try again."
      );
      setLoading(false);
    }
  };

  if (walletSuccess) {
    return (
      <div
        className="order-modal-overlay order-modal-overlay--solid"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-success-title"
      >
        <div className="order-modal order-modal--solid order-modal--success">
          <div className="payment-callback payment-callback--success order-modal__success">
            <div className="payment-callback__icon">✓</div>
            <h2 id="wallet-success-title">Order Placed Successfully</h2>
            <p>
              <strong>{formatWalletAmount(walletSuccess.amount)}</strong> paid from your wallet.
            </p>
            <p className="payment-callback__product">
              IP <strong>{seriesName}</strong> · {stockTypeLabels[item.type]}
            </p>
            <p className="payment-callback__order">
              Order: <strong>{walletSuccess.orderId}</strong>
            </p>
            <p className="payment-callback__hint">
              {walletSuccess.delivered
                ? `IP and password ready${walletSuccess.deliverIp ? ` (${walletSuccess.deliverIp})` : ""}. Open My Servers to view credentials.`
                : "Payment received. Your IP and password will appear under My Servers automatically when ready."}
            </p>
            <div className="payment-callback__actions">
              <Link href="/client/orders" className="btn btn--primary">
                Manage Orders
              </Link>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => {
                  onSuccess(walletSuccess.orderId, "wallet");
                  onClose();
                }}
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="order-modal-overlay order-modal-overlay--solid"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="buy-modal-title"
    >
      <div
        className="order-modal order-modal--solid"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="order-modal__close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        <div className="order-modal__product">
          <span className="order-modal__product-tag">{stockTypeLabels[item.type]}</span>
          <h2 id="buy-modal-title" className="order-modal__series">
            IP {seriesName}
          </h2>
          <p className="order-modal__subtitle">
            {getProductSubtitle(item.type, item.region)}
          </p>
        </div>

        {process.env.NEXT_PUBLIC_CASHFREE_MODE !== "production" && (
          <div className="order-modal__badge">
            <span className="order-modal__badge-dot" />
            TEST MODE — Cashfree Sandbox
          </div>
        )}

        {item.type !== "proxy" && ramPlans.length > 0 && (
          <div className="auth-form__field">
            <label>Choose RAM &amp; cores</label>
            <div className="order-plan-picker" role="radiogroup" aria-label="Select RAM plan">
              {ramPlans.map((plan) => (
                <button
                  key={plan.ram}
                  type="button"
                  role="radio"
                  aria-checked={selectedRamGb === plan.ram}
                  className={`order-plan-picker__option${
                    selectedRamGb === plan.ram ? " order-plan-picker__option--active" : ""
                  }`}
                  onClick={() => setSelectedRamGb(plan.ram)}
                >
                  <span className="order-plan-picker__ram">{plan.ram} GB</span>
                  <span className="order-plan-picker__cores">{plan.vcpu} cores</span>
                  <span className="order-plan-picker__price">
                    ₹{plan.price.toLocaleString("en-IN")}/mo
                  </span>
                </button>
              ))}
            </div>
            <small className="auth-form__hint">
              Selected: {selectedPlan ? formatRamPlanLabel(selectedPlan) : formatStockSpecs(item, selectedRamGb)}
            </small>
          </div>
        )}

        <div className="order-modal__summary">
          <div className="order-modal__row">
            <span>Configuration</span>
            <strong>
              {item.type === "proxy"
                ? "Proxy IP"
                : `${getRamPlanVcpu(item, selectedRamGb)}c · ${selectedRamGb}GB`}
            </strong>
          </div>
          <div className="order-modal__row">
            <span>Unit price</span>
            <strong>
              {appliedPromo ? (
                <>
                  <span className="order-modal__strike">
                    ₹{unitPrice.toLocaleString("en-IN")}
                  </span>{" "}
                  ₹{discountedUnit.toLocaleString("en-IN")}
                </>
              ) : (
                <>₹{unitPrice.toLocaleString("en-IN")}</>
              )}
            </strong>
          </div>
          <div className="order-modal__row">
            <span>Available</span>
            <strong>{item.quantity} pcs</strong>
          </div>
        </div>

        {item.type !== "proxy" && (
          <div className="auth-form__field order-modal__promo">
            <label htmlFor="order-promo">Have a promo code?</label>
            {appliedPromo ? (
              <div className="order-modal__promo-applied">
                <div>
                  <strong>{appliedPromo.code}</strong>
                  <span> applied — {formatDiscount(appliedPromo.type, appliedPromo.value)}</span>
                </div>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={handleRemovePromo}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="order-modal__promo-row">
                <input
                  id="order-promo"
                  type="text"
                  value={promoInput}
                  onChange={(e) =>
                    setPromoInput(
                      e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "")
                    )
                  }
                  placeholder="Enter promo code"
                  maxLength={24}
                />
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={handleApplyPromo}
                  disabled={!promoInput.trim()}
                >
                  Apply
                </button>
              </div>
            )}
            {promoMsg && (
              <small
                className={
                  appliedPromo
                    ? "order-modal__promo-msg order-modal__promo-msg--ok"
                    : "order-modal__promo-msg order-modal__promo-msg--err"
                }
              >
                {promoMsg}
              </small>
            )}
          </div>
        )}

        <div className="auth-form__field">
          <label htmlFor="order-qty">Quantity</label>
          <select
            id="order-qty"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
          >
            {Array.from({ length: Math.min(item.quantity, 10) }, (_, i) => i + 1).map(
              (n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "piece" : "pieces"}
                </option>
              )
            )}
          </select>
        </div>

        <div className="auth-form__field">
          <label>Payment method</label>
          <div className="order-payment-picker" role="radiogroup" aria-label="Payment method">
            <button
              type="button"
              role="radio"
              aria-checked={paymentMethod === "cashfree"}
              className={`order-payment-picker__option${
                paymentMethod === "cashfree" ? " order-payment-picker__option--active" : ""
              }`}
              onClick={() => setPaymentMethod("cashfree")}
            >
              <span className="order-payment-picker__title">Cashfree</span>
              <span className="order-payment-picker__sub">Card, UPI, Netbanking</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={paymentMethod === "wallet"}
              className={`order-payment-picker__option${
                paymentMethod === "wallet" ? " order-payment-picker__option--active" : ""
              }`}
              onClick={() => setPaymentMethod("wallet")}
            >
              <span className="order-payment-picker__title">Wallet</span>
              <span className="order-payment-picker__sub">
                Balance: {formatWalletAmount(walletBalance)}
              </span>
            </button>
          </div>
        </div>

        {paymentMethod === "cashfree" && (
          <div className="auth-form__field">
            <label htmlFor="order-phone">Phone (for Cashfree)</label>
            <input
              id="order-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit mobile number"
              maxLength={15}
            />
          </div>
        )}

        {paymentMethod === "wallet" && walletBalance < total && (
          <div className="order-modal__wallet-warn">
            Low balance —{" "}
            <a href="/client/wallet" className="order-modal__wallet-link">
              add money to wallet
            </a>
          </div>
        )}

        <div className="order-modal__total">
          <span>Total amount</span>
          <strong>₹{total.toLocaleString("en-IN")}</strong>
        </div>

        {savings > 0 && (
          <div className="order-modal__savings">
            You save ₹{savings.toLocaleString("en-IN")} with{" "}
            <strong>{appliedPromo?.code}</strong>
          </div>
        )}

        {error && <div className="auth-form__error">{error}</div>}

        <p className="order-modal__note">
          {paymentMethod === "wallet" ? (
            <>Amount will be deducted from your wallet instantly. No redirect needed.</>
          ) : process.env.NEXT_PUBLIC_CASHFREE_MODE === "production" ? (
            <>You will be redirected to Cashfree secure checkout. Payments are processed in INR.</>
          ) : (
            <>
              You will be redirected to Cashfree test checkout. Use test card{" "}
              <strong>4111 1111 1111 1111</strong>, any future expiry, CVV{" "}
              <strong>123</strong>, OTP <strong>123456</strong>.
            </>
          )}
        </p>

        <div className="order-modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleConfirm}
            disabled={loading || (paymentMethod === "wallet" && walletBalance < total)}
          >
            {loading
              ? paymentMethod === "wallet"
                ? "Processing..."
                : "Redirecting..."
              : paymentMethod === "wallet"
                ? `Pay ${formatWalletAmount(total)} from Wallet`
                : "Pay with Cashfree"}
          </button>
        </div>
      </div>
    </div>
  );
}
