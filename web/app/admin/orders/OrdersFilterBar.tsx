"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OrdersFilterBar({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const [fromInput, setFromInput] = useState(from);
  const [toInput, setToInput] = useState(to);

  const apply = () => {
    const params = new URLSearchParams();
    if (fromInput) params.set("from", fromInput);
    if (toInput) params.set("to", toInput);
    router.push(`/admin/orders?${params.toString()}`);
  };

  return (
    <div className="admin-card admin-filter-bar">
      <label className="admin-filter-bar__field">
        <span>From</span>
        <input
          type="date"
          value={fromInput}
          max={toInput}
          onChange={(e) => setFromInput(e.target.value)}
          className="admin-filter-bar__input"
        />
      </label>
      <label className="admin-filter-bar__field">
        <span>To</span>
        <input
          type="date"
          value={toInput}
          min={fromInput}
          onChange={(e) => setToInput(e.target.value)}
          className="admin-filter-bar__input"
        />
      </label>
      <button type="button" className="admin-filter-bar__apply" onClick={apply}>
        Apply
      </button>
    </div>
  );
}
