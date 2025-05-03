"use client";
import { useState } from "react";

export interface OwedToMeShare {
  id: number;
  payment_id: number;
  user_id: number;
  amount: number;
  accepted: boolean;
  fulfilled: boolean;
}

interface PaymentDetails {
  id: number;
  title: string;
  description: string;
  total_amount: number;
  payer_id: number;
  created_at: string;
  due_date?: string;
  expired: boolean;
  shares: {
    user_id: number;
    amount: number;
    accepted: boolean;
    fulfilled: boolean;
  }[];
}

interface Props {
  shares: OwedToMeShare[];
  getUsername: (userId: number) => string;
  onFulfill: (share: OwedToMeShare) => void;
  fulfillingId: number | null;
}

export default function OwedToMeCarousel({
  shares,
  getUsername,
  onFulfill,
  fulfillingId,
}: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCardClick = async (index: number) => {
    if (activeIndex === index) {
      setActiveIndex(null);
      setPayment(null);
      return;
    }
    setLoading(true);
    setActiveIndex(index);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payments/${shares[index].payment_id}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch payment details");
      const data = await res.json();
      setPayment(data);
    } catch {
      setPayment(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overflow-x-auto whitespace-nowrap py-4">
      <div className="inline-flex space-x-4 px-2">
        {shares.map((share, idx) => (
          <div key={share.id} className="inline-block text-center w-64">
            <button
              onClick={() => handleCardClick(idx)}
              className={`w-full h-32 p-4 border rounded shadow text-center transition-all duration-200
                ${activeIndex === idx ? "bg-gray-200" : "bg-white"}
                hover:shadow-md`}
            >
              <div className="font-bold text-lg">{getUsername(share.user_id)}</div>
              <span className="text-sm text-gray-500 block">owes you</span>
              <div className="text-green-500 font-semibold text-xl mt-1">{share.amount}€</div>
            </button>
            {activeIndex === idx && (
              <div className="mt-2 bg-gray-50 border rounded p-4 shadow w-full text-left">
                {loading && <div>Loading...</div>}
                {payment && (
                  <>
                    <h3 className="text-lg font-semibold">{payment.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{payment.description}</p>
                    <div className="text-xs text-gray-500 mb-2">
                      Due date:{" "}
                      {payment.due_date
                        ? new Date(payment.due_date).toLocaleDateString()
                        : "N/A"}
                    </div>
                  </>
                )}
                <div className="flex justify-end space-x-2 mt-2">
                  <button
                    onClick={() => onFulfill(share)}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    disabled={share.fulfilled || fulfillingId === share.id}
                  >
                    {fulfillingId === share.id ? "Fulfilling..." : "Fulfill"}
                  </button>
                  <button
                    onClick={() => {
                      setActiveIndex(null);
                      setPayment(null);
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
                <div className="mt-2 text-xs">
                  Accepted: {share.accepted ? "Yes" : "No"}
                  <br />
                  Status: {share.fulfilled ? "Fulfilled" : "Pending"}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}