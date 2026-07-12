"use client";

import { useState } from "react";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export default function OrderStatusSelect({ orderId, status }: { orderId: string; status: string }) {
  const [current, setCurrent] = useState(status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    const previous = current;
    setError(null);
    setCurrent(next);
    setSaving(true);
    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setSaving(false);
    if (!res.ok) {
      // Revert the optimistic update — the dropdown must keep reflecting
      // what's actually stored, not what was clicked.
      setCurrent(previous);
      setError("Could not update status.");
    }
  };

  return (
    <div className="admin-status-select-wrap">
      <select
        className={`admin-status-select admin-status-select--${current}`}
        value={current}
        onChange={onChange}
        disabled={saving}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <div className="admin-status-select__error">{error}</div>}
    </div>
  );
}
