"use client";
import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import OwedToMeCarousel, { OwedToMeShare } from "@/components/layout/OwedToMeCarousel";
import { useAuth } from "@/hooks/useAuth";

type Share = {
  id: number;
  payment_id: number;
  user_id: number;
  amount: number;
  fulfilled: boolean;
  accepted: boolean;
};

type Payment = {
  id: number;
  title?: string;
  payer_id: number;
  description: string;
  total_amount: number;
  created_at: string;
  due_date?: string;
  all_fulfilled: boolean;
  expired: boolean;
  shares: Share[];
};

function WhatYouOweSection({
  shares,
  paymentTitles,
  usernames,
  paymentPayers,
}: {
  shares: Share[];
  paymentTitles: Record<number, string>;
  usernames: Record<number, string>;
  paymentPayers: Record<number, number>;
}) {
  if (shares.length === 0) {
    return <div className="text-gray-500">You do not owe anything.</div>;
  }
  return (
    <div className="flex overflow-x-auto gap-4 py-2">
      {shares.map((share) => (
        <div
          key={share.id}
          className="min-w-[220px] bg-white rounded shadow p-4 flex flex-col gap-2 items-start"
        >
          <span className="font-bold">
            {paymentTitles[share.payment_id] || `Payment #${share.payment_id}`}
          </span>
          <span className="text-gray-600 text-sm">
            Owed to: {usernames[paymentPayers[share.payment_id]] || paymentPayers[share.payment_id] || "Unknown"}
          </span>
          <span className="text-lg font-semibold text-red-600">
            {share.amount}€
          </span>
          <span className="text-xs">
            {share.fulfilled ? (
              <span className="text-green-600">fulfilled</span>
            ) : (
              <span className="text-yellow-600">pending</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

function PaymentsCreatedSection({
  payments,
  usernames,
  onDelete,
}: {
  payments: Payment[];
  usernames: Record<number, string>;
  onDelete: (paymentId: number) => void;
}) {
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <section>
      <h2 className="text-lg font-semibold mb-2">Payments You Created</h2>
      <ul className="flex flex-col gap-2">
        {payments.length === 0 && (
          <li className="text-gray-500">No payments created by you.</li>
        )}
        {payments.map((payment) => {
          const allFulfilled =
            payment.shares.length > 0 && payment.shares.every((s) => s.fulfilled);
          return (
            <li
              key={payment.id}
              className="bg-white rounded shadow p-3 flex flex-col"
            >
              <button
                className="flex items-center justify-between w-full text-left focus:outline-none"
                onClick={() => setOpenId(openId === payment.id ? null : payment.id)}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-block w-4 h-4 rounded-full ${
                      allFulfilled ? "bg-green-500" : "bg-yellow-400"
                    }`}
                    title={allFulfilled ? "Completed" : "Pending"}
                  />
                  <span className="font-bold">
                    {payment.title || `Payment #${payment.id}`}
                  </span>
                  <span className="text-gray-500 ml-2">{payment.description}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold">{payment.total_amount}€</span>
                </div>
              </button>
              {openId === payment.id && (
                <div className="mt-3 border-t pt-3">
                  <div className="text-sm text-gray-600 mb-2">
                    Due date: {payment.due_date ? new Date(payment.due_date).toLocaleDateString() : "N/A"}
                  </div>
                  <div className="mb-2">
                    <span className="font-semibold">Participants:</span>
                    <ul className="ml-4 mt-1">
                      {payment.shares.map((share) => (
                        <li key={share.id} className="flex gap-2 items-center">
                          <span className="font-medium">{usernames[share.user_id] || share.user_id}</span>
                          <span className="text-gray-500">— {share.amount}€</span>
                          <span className={`ml-2 text-xs ${share.fulfilled ? "text-green-600" : "text-yellow-600"}`}>
                            {share.fulfilled ? "fulfilled" : "pending"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    className={`mt-2 px-4 py-1 rounded font-semibold ${
                      allFulfilled
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                    disabled={!allFulfilled}
                    onClick={() => allFulfilled && onDelete(payment.id)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [owedToMe, setOwedToMe] = useState<OwedToMeShare[]>([]);
  const [whatYouOwe, setWhatYouOwe] = useState<Share[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [usernames, setUsernames] = useState<Record<number, string>>({});
  const [paymentTitles, setPaymentTitles] = useState<Record<number, string>>({});
  const [paymentPayers, setPaymentPayers] = useState<Record<number, number>>({});
  const [error, setError] = useState<string | null>(null);

  // Fulfill modal state
  const [fulfillingId, setFulfillingId] = useState<number | null>(null);
  const [fulfillError, setFulfillError] = useState<string | null>(null);

  // Fetch owed-to-me shares
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/shares/owed-to-me`, {
      credentials: "include",
    })
      .then((res) => res.ok ? res.json() : [])
      .then((data: OwedToMeShare[]) => setOwedToMe(data))
      .catch(() => setError("Failed to load shares owed to you"));
  }, []);

  // Fetch what you owe shares
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/shares/owed-by-me`, {
      credentials: "include",
    })
      .then((res) => res.ok ? res.json() : [])
      .then((data: Share[]) => setWhatYouOwe(data))
      .catch(() => setError("Failed to load what you owe"));
  }, []);

  // Fetch payment titles and payer IDs for whatYouOwe shares
  useEffect(() => {
    const ids = Array.from(new Set(whatYouOwe.map(s => s.payment_id)));
    const missing = ids.filter(id => !(id in paymentTitles) || !(id in paymentPayers));
    if (missing.length === 0) return;
    Promise.all(
      missing.map(id =>
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payments/${id}`, {
          credentials: "include",
        })
          .then(res => res.ok ? res.json() : null)
          .then(data => ({
            id,
            title: data?.title || `Payment #${id}`,
            payer_id: data?.payer_id,
          }))
      )
    ).then(results => {
      const newTitles = { ...paymentTitles };
      const newPayers = { ...paymentPayers };
      results.forEach(({ id, title, payer_id }) => {
        newTitles[id] = title;
        if (payer_id) newPayers[id] = payer_id;
      });
      setPaymentTitles(newTitles);
      setPaymentPayers(newPayers);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whatYouOwe]);

  // Fetch payments you created (with shares included)
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payments`, {
      credentials: "include",
    })
      .then((res) => res.ok ? res.json() : [])
      .then(async (data: { id: number; title?: string }[]) => {
        // For each payment, fetch full info (with shares) from /api/payments/{id}
        const paymentsWithShares: Payment[] = await Promise.all(
          data.map(async (p) => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payments/${p.id}`, {
              credentials: "include",
            });
            if (!res.ok) return null;
            const payment = await res.json();
            return payment;
          })
        );
        setPayments(paymentsWithShares.filter(Boolean) as Payment[]);
        // Set payment titles for quick lookup (for payments created by you)
        const titles: Record<number, string> = { ...paymentTitles };
        paymentsWithShares.forEach((p) => {
          if (p && p.id) titles[p.id] = p.title || `Payment #${p.id}`;
        });
        setPaymentTitles(titles);
      })
      .catch(() => setError("Failed to load your payments"));
  }, []);

  // Fetch usernames for all relevant user_ids (including payers)
  useEffect(() => {
    const ids = new Set<number>();
    payments.forEach((p) => {
      ids.add(p.payer_id);
      p.shares.forEach((s) => ids.add(s.user_id));
    });
    owedToMe.forEach((s) => ids.add(s.user_id));
    whatYouOwe.forEach((s) => ids.add(s.user_id));
    Object.values(paymentPayers).forEach((id) => ids.add(id));
    const uniqueIds = Array.from(ids).filter((id) => !(id in usernames));
    if (uniqueIds.length === 0) return;
    Promise.all(
      uniqueIds.map((id) =>
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${id}`, {
          credentials: "include",
        })
          .then((res) => res.ok ? res.json() : null)
          .then((data) => ({ id, username: data?.username || "Unknown" }))
      )
    ).then((results) => {
      const newNames = { ...usernames };
      results.forEach(({ id, username }) => {
        newNames[id] = username;
      });
      setUsernames(newNames);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payments, owedToMe, whatYouOwe, paymentPayers]);

  const handleDelete = async (paymentId: number) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payments/${paymentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Delete failed");
      setPayments((prev) => prev.filter((p) => p.id !== paymentId));
    } catch (err) {
      alert("Error deleting payment.");
    }
  };

  const handleFulfill = async (share: OwedToMeShare) => {
    setFulfillingId(share.id);
    setFulfillError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/shares/fulfill`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ share_id: share.id }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to fulfill share");
      }
      setOwedToMe((prev) =>
        prev.map((s) =>
          s.id === share.id ? { ...s, fulfilled: true } : s
        )
      );
    } catch (e: any) {
      setFulfillError(e.message || "Failed to fulfill share");
    } finally {
      setFulfillingId(null);
    }
  };

  if (loading || !user) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <>
      <Navbar />
      <main className="min-h-screen p-6 md:ml-56">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <section>
          <h2 className="text-lg font-semibold mb-2">Owed To You</h2>
          {owedToMe.length === 0 ? (
            <div className="text-gray-500">No shares owed to you.</div>
          ) : (
            <OwedToMeCarousel
              shares={owedToMe}
              getUsername={(id) => usernames[id] || "Unknown"}
              onFulfill={handleFulfill}
              fulfillingId={fulfillingId}
            />
          )}
          {fulfillError && (
            <div className="text-red-600 mt-2">{fulfillError}</div>
          )}
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2">What You Owe</h2>
          <WhatYouOweSection
            shares={whatYouOwe}
            paymentTitles={paymentTitles}
            usernames={usernames}
            paymentPayers={paymentPayers}
          />
        </section>
        <PaymentsCreatedSection
          payments={payments}
          usernames={usernames}
          onDelete={handleDelete}
        />
      </main>
    </>
  );
}