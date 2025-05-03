"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/hooks/useAuth";

type PaymentDetails = {
  id: number;
  title?: string;
  description: string;
  total_amount: number;
  created_at: string;
  shares: { user_id: number; amount: number }[];
  all_fulfilled?: boolean;
  expired?: boolean;
};

type Share = {
  id: number;
  payment_id: number;
  user_id: number;
  amount: number;
  accepted: boolean;
  status?: string;
};

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const [pendingShares, setPendingShares] = useState<Share[]>([]);
  const [payments, setPayments] = useState<Record<number, PaymentDetails>>({});
  const [payerNames, setPayerNames] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    fetch(process.env.NEXT_PUBLIC_API_URL + "/api/shares", {
      credentials: "include",
    })
      .then(res => res.json())
      .then(async (shares: Share[]) => {
        // Only shares owed by the current user, not accepted, and status is 'pending'
        const filtered = shares.filter(
          s =>
            String(s.user_id) === String(user.id) &&
            s.accepted === false &&
            s.status === "pending"
        );

        // Fetch payment details for all unique payment_ids
        const uniquePaymentIds = Array.from(new Set(filtered.map(s => s.payment_id)));
        let paymentMap: Record<number, PaymentDetails> = {};
        let payerIdSet = new Set<number>();

        if (uniquePaymentIds.length > 0) {
          const paymentResults = await Promise.all(
            uniquePaymentIds.map(pid =>
              fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payments/${pid}`, {
                credentials: "include",
              })
                .then(res => res.ok ? res.json() : null)
                .catch(() => null)
            )
          );
          paymentResults.forEach(payment => {
            if (payment && payment.id) {
              paymentMap[payment.id] = payment;
              // If you want payer names, you can add payerIdSet.add(payment.payer_id);
            }
          });
        }

        setPendingShares(filtered);
        setPayments(paymentMap);

        // Optionally fetch payer usernames if you want to show them
        // (not shown here for brevity)
      })
      .catch(() => setError("Failed to load pending shares"));
  }, [user, accepting]);

  const handleAccept = async (shareId: number) => {
    setAccepting(shareId);
    try {
      await fetch(process.env.NEXT_PUBLIC_API_URL + "/api/shares/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ share_id: shareId }),
      });
      setAccepting(null);
    } catch {
      setError("Failed to accept share");
      setAccepting(null);
    }
  };

  if (loading || !user) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 p-4 flex flex-col gap-6 md:ml-56">
        <h1 className="text-2xl font-bold mb-4">Notifications</h1>
        <section>
          <h2 className="text-lg font-semibold mb-2">Pending Shares to Accept</h2>
          <ul className="flex flex-col gap-2">
            {pendingShares.length === 0 && (
              <li className="text-gray-500">No pending shares to accept.</li>
            )}
            {pendingShares.map((share) => {
              const payment = payments[share.payment_id];
              return (
                <li key={share.id} className="bg-white rounded shadow p-3 flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <span className="font-bold">
                      {payment && payment.title
                        ? payment.title
                        : `Payment #${share.payment_id}`}
                    </span>
                    <span className="block text-sm text-gray-600">
                      {payment ? payment.description : ""}
                    </span>
                    <span className="block text-sm text-gray-600">
                      Amount: ${share.amount}
                    </span>
                  </div>
                  <div className="mt-2 md:mt-0 flex gap-2 items-center">
                    <button
                      className="px-4 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                      disabled={accepting === share.id}
                      onClick={() => handleAccept(share.id)}
                    >
                      {accepting === share.id ? "Accepting..." : "Accept"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </>
  );
}