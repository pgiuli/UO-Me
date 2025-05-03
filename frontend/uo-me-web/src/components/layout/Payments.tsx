"use client";

import { useState } from "react";

type PaymentItem = {
    id: number;
    title?: string;
    description: string;
    total_amount: number;
    created_at: string;
    expired: boolean;
    all_fulfilled: boolean;
  };

export default function PaymentsList({
  payments,
  onDelete,
}: {
  payments: PaymentItem[];
  onDelete: (id: number) => void;
}) {
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this payment?")) return;
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
  };

  if (payments.length === 0) {
    return <div className="text-gray-500">No payments created by you.</div>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {payments.map((payment) => (
        <li
          key={payment.id}
          className="bg-white rounded shadow p-3 flex items-center justify-between gap-4"
        >
          {/* Estado */}
          <div
            className={`w-4 h-4 rounded-full border-2 ${
              payment.all_fulfilled
                ? "bg-green-400 border-green-600"
                : "bg-yellow-300 border-yellow-500"
            }`}
          ></div>

          {/* Contenido */}
          <div className="flex-1 min-w-0">
            <span className="font-bold block truncate">
              {payment.title || `Payment #${payment.id}`}
            </span>
            <span className="block text-sm text-gray-600 truncate">
              {payment.description}
            </span>
            <span className="block text-sm text-gray-600">
              Total: €{payment.total_amount.toFixed(2)}
            </span>
            <span className="block text-sm text-gray-600">
              Created: {new Date(payment.created_at).toLocaleDateString()}
            </span>
          </div>

          {/* Etiqueta SO€ o lo que necesites */}
          <div className="text-sm font-semibold text-gray-700">SO€</div>

          {/* Botón eliminar si todo cumplido */}
          {payment.all_fulfilled && (
            <button
              onClick={() => handleDelete(payment.id)}
              className="text-red-500 text-sm border border-red-300 px-2 py-1 rounded hover:bg-red-50"
              disabled={deletingId === payment.id}
            >
              🗑️
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
