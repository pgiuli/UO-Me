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
  status: string;
  accepted: boolean;
};

type Payment = {
  id: number;
  title?: string;
  description: string;
  total_amount: number;
  created_at: string;
  expired: boolean;
};

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [owedToMe, setOwedToMe] = useState<OwedToMeShare[]>([]);
  const [sharesToPay, setSharesToPay] = useState<Share[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [usernames, setUsernames] = useState<Record<number, string>>({});
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

  function PaymentTitleFetcher({ paymentId }: { paymentId: number }) {
    const [title, setTitle] = useState<string>("Loading...");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      let isMounted = true;
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payments/${paymentId}`, {
        credentials: "include",
      })
        .then((res) => res.ok ? res.json() : Promise.reject())
        .then((data) => {
          if (isMounted) setTitle(data.title || "Untitled Payment");
        })
        .catch(() => {
          if (isMounted) setError("Failed to fetch title");
        });
      return () => {
        isMounted = false;
      };
    }, [paymentId]);

    if (error) return <span className="text-red-600">{error}</span>;
    return <>{title}</>;
  }

  // Fetch shares the user has to pay (not fulfilled, not to themselves)
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/shares`, {
      credentials: "include",
    })
      .then((res) => res.ok ? res.json() : [])
      .then((data: Share[]) => {
        setSharesToPay(
          data.filter(
            (s) =>
              s.status !== "fulfilled" &&
              user &&
              s.user_id === user.id &&
              s.accepted &&
              s.payment_id // filter out shares to self if needed
          )
        );
      })
      .catch(() => setError("Failed to load your shares"));
  }, [user]);

  // Fetch payments where user is payer
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payments`, {
      credentials: "include",
    })
      .then((res) => res.ok ? res.json() : [])
      .then((data: Payment[]) => setPayments(data))
      .catch(() => setError("Failed to load your payments"));
  }, []);

  // Fetch usernames for all relevant user_ids
  useEffect(() => {
    const ids = [
      ...owedToMe.map((s) => s.user_id),
      ...sharesToPay.map((s) => s.user_id),
    ];
    const uniqueIds = Array.from(new Set(ids)).filter((id) => !(id in usernames));
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
  }, [owedToMe, sharesToPay]);

  // Fulfill logic
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
      <main className="min-h-screen bg-gray-50 p-4 flex flex-col gap-8 md:ml-56">
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
          <h2 className="text-lg font-semibold mb-2">Shares You Owe</h2>
          <ul className="flex flex-col gap-2">
            {sharesToPay.length === 0 && (
              <li className="text-gray-500">You do not owe any shares.</li>
            )}
            {sharesToPay.map((share) => (
              <li
                key={share.id}
                className="bg-white rounded shadow p-3 flex flex-col md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <span className="font-bold">
                    Payment #{share.payment_id}
                  </span>
                  <span className="block text-sm text-gray-600">
                    Amount: {share.amount}
                  </span>
                  <span className="block text-sm text-gray-600">
                    Status: {share.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2">Payments You Created</h2>
          <ul className="flex flex-col gap-2">
            {payments.length === 0 && (
              <li className="text-gray-500">No payments created by you.</li>
            )}
            {payments.map((payment) => (
              <li
                key={payment.id}
                className="bg-white rounded shadow p-3 flex flex-col md:flex-row md:items-center md:justify-between"
              >
                <div>
                    <span className="font-bold">
                    {payment.title ? payment.title : (
                      <PaymentTitleFetcher paymentId={payment.id} />
                    )}
                    </span>
                  <span className="block text-sm text-gray-600">
                    {payment.description}
                  </span>
                  <span className="block text-sm text-gray-600">
                    Total Amount: ${payment.total_amount}
                  </span>
                  <span className="block text-sm text-gray-600">
                    Created: {new Date(payment.created_at).toLocaleString()}
                  </span>
                  <span className="block text-sm text-gray-600">
                    Expired: {payment.expired ? "Yes" : "No"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}