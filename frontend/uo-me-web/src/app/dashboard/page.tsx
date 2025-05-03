"use client";
import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/hooks/useAuth";
import Carousel from "@/components/layout/Carousel";
import DebtDetailBox from "@/components/layout/DebtCarousel";

type Share = {
  id: number;
  payment_id: number;
  user_id: number;
  amount: number;
  accepted: boolean;
  fulfilled: boolean;
};

type Payment = {
  id: number;
  title: string;
  description: string;
  total_amount: number;
  payer_id: number;
  created_at: string;
  expired: boolean;
};

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [sharesOwedToMe, setSharesOwedToMe] = useState<Share[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payerNames, setPayerNames] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  // Fetch shares owed to me
  useEffect(() => {
    if (!user) return;
    fetch(process.env.NEXT_PUBLIC_API_URL + "/api/shares/owed-to-me", {
      credentials: "include",
    })
      .then(res => res.ok ? res.json() : [])
      .then((shares: Share[]) => setSharesOwedToMe(shares))
      .catch(() => setError("Failed to load shares owed to you"));
  }, [user]);

  // Fetch payments where user is payer
  useEffect(() => {
    if (!user) return;
    fetch(process.env.NEXT_PUBLIC_API_URL + "/api/payments", {
      credentials: "include",
    })
      .then(res => res.ok ? res.json() : [])
      .then((payments: Payment[]) => setPayments(payments))
      .catch(() => setError("Failed to load your payments"));
  }, [user]);

  // Fetch usernames for shares owed to me
  useEffect(() => {
    const userIds = Array.from(new Set(sharesOwedToMe.map(s => s.user_id)));
    const missingIds = userIds.filter(id => !(id in payerNames));
    if (missingIds.length === 0) return;
    Promise.all(
      missingIds.map(id =>
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${id}`, {
          credentials: "include",
        })
          .then(res => res.ok ? res.json() : null)
          .then(data => ({ id, username: data?.username || "" }))
      )
    ).then(results => {
      const newNames = { ...payerNames };
      results.forEach(({ id, username }) => {
        if (username) newNames[id] = username;
      });
      setPayerNames(newNames);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharesOwedToMe]);

  const debtsForCarousel = sharesOwedToMe.map(share => ({
    name: payerNames[share.user_id] || "Unknown",
    amount: share.amount,
    payment_id: share.payment_id,
  }));
  

  if (loading || !user) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 p-4 flex flex-col gap-8 md:ml-56">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <section>
          <h2 className="text-lg font-semibold mb-2">Shares Owed To You</h2>
          <Carousel data={debtsForCarousel} />
          <ul className="flex flex-col gap-2">
            {sharesOwedToMe.length === 0 && (
              <li className="text-gray-500">No shares owed to you.</li>
            )}
            {sharesOwedToMe.map(share => (
              <li key={share.id} className="bg-white rounded shadow p-3 flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <span className="font-bold">
                    Owed by: {payerNames[share.user_id] || ""}
                  </span>
                  <span className="block text-sm text-gray-600">
                    Amount: ${share.amount}
                  </span>
                  <span className="block text-sm text-gray-600">
                    Status: {share.fulfilled ? "Fulfilled" : "Pending"}
                  </span>
                  <span className="block text-sm text-gray-600">
                    Accepted: {share.accepted ? "Yes" : "No"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2">Your Payments</h2>
          <ul className="flex flex-col gap-2">
            {payments.length === 0 && (
              <li className="text-gray-500">No payments created by you.</li>
            )}
            {payments.map(payment => (
              <li key={payment.id} className="bg-white rounded shadow p-3 flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <span className="font-bold">
                    {payment.title || `Payment #${payment.id}`}
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