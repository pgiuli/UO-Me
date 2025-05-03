"use client";
import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";

type Friend = { id: number; username: string };

export default function PaymentCreatePage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [dueDate, setDueDate] = useState<string>("");
  const [friends, setFriends] = useState<{ id: number; username: string; share: number | "" }[]>([]);
  const [availableFriends, setAvailableFriends] = useState<Friend[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch friends from API
  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_API_URL + "/api/friendships", {
      credentials: "include",
    })
      .then(res => res.json())
      .then(data => setAvailableFriends(Array.isArray(data) ? data : []))
      .catch(() => setError("Failed to load friends"));
  }, []);

  // Add friend to split
  const addFriend = (friend: Friend) => {
    if (!friends.find(f => f.id === friend.id)) {
      setFriends([...friends, { ...friend, share: "" }]);
    }
  };

  // Remove friend from split
  const removeFriend = (id: number) => {
    setFriends(friends.filter(f => f.id !== id));
  };

  // Update share for a friend
  const updateShare = (id: number, share: number | "") => {
    setFriends(friends.map(f => (f.id === id ? { ...f, share } : f)));
  };

  // Calculate payer's share
  const calculatePayerShare = () => {
    const totalShares = friends.reduce(
      (sum, f) => sum + (typeof f.share === "number" ? f.share : 0),
      0
    );
    return typeof amount === "number" ? Math.max(amount - totalShares, 0) : 0;
  };

  const payerShareValue = calculatePayerShare();

  // Placeholder for image upload
  const handleImageUpload = () => {
    // TODO: Implement image upload
    alert("Image upload coming soon!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (typeof amount !== "number" || amount <= 0) {
      setError("Total amount must be a positive number.");
      setLoading(false);
      return;
    }
    if (!title.trim()) {
      setError("Title is required.");
      setLoading(false);
      return;
    }
    if (!dueDate) {
      setError("Due date is required.");
      setLoading(false);
      return;
    }
    const due = new Date(dueDate);
    const now = new Date();
    if (due.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
      setError("Due date must be at least 24 hours in the future.");
      setLoading(false);
      return;
    }
    if (friends.some(f => f.share === "" || typeof f.share !== "number" || f.share < 0)) {
      setError("All friend shares must be valid numbers.");
      setLoading(false);
      return;
    }

    // Get current user info for payer id
    let userId: number | null = null;
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/api/users/profile", {
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      const user = await res.json();
      userId = user.id;
    } catch {
      setError("Failed to fetch user profile.");
      setLoading(false);
      return;
    }

    // Prepare shares: all friends + payer
    const shares = [
      ...friends.map(f => ({ user_id: f.id, amount: typeof f.share === "number" ? f.share : 0 })),
      { user_id: userId, amount: payerShareValue },
    ];

    // Validate shares sum
    const sumShares = shares.reduce((sum, s) => sum + s.amount, 0);
    if (Math.abs(sumShares - amount) > 0.01) {
      setError("Sum of shares does not equal total amount.");
      setLoading(false);
      return;
    }

    // Send payment creation request
    try {
        const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/api/payments/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title,
            description,
            total_amount: amount,
            shares,
            due_date: new Date(dueDate).toISOString(),
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.detail || data.message || "Failed to create payment.");
        } else {
          setSuccess("Payment created successfully!");
          setTitle("");
          setDescription("");
          setAmount("");
          setDueDate("");
          setFriends([]);
        }
      } catch {
        setError("Failed to create payment.");
      }
      setLoading(false);
    };

  // Set min due date to 24h in the future
  const minDueDate = (() => {
    const d = new Date();
    d.setHours(d.getHours() + 24);
    return d.toISOString().slice(0, 16);
  })();

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 p-4 md:ml-56">
        <h1 className="text-2xl font-bold mb-4">Create Payment</h1>
        <form
          className="bg-white rounded shadow p-6 flex flex-col gap-4 max-w-xl"
          onSubmit={handleSubmit}
        >
          {error && <div className="text-red-600">{error}</div>}
          {success && <div className="text-green-600">{success}</div>}
          <label className="font-semibold">
            Title
            <input
              className="block w-full border rounded p-2 mt-1"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </label>
          <label className="font-semibold">
            Description
            <textarea
              className="block w-full border rounded p-2 mt-1"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </label>
          <label className="font-semibold">
            Total Amount
            <input
              type="number"
              min="0"
              step="0.01"
              className="block w-full border rounded p-2 mt-1"
              value={amount}
              onChange={e => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
              required
            />
          </label>
          <label className="font-semibold">
            Due Date
            <input
              type="datetime-local"
              className="block w-full border rounded p-2 mt-1"
              value={dueDate}
              min={minDueDate}
              onChange={e => setDueDate(e.target.value)}
              required
            />
          </label>
          <div>
            <span className="font-semibold">Friends & Shares</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {availableFriends.map(friend => (
                <button
                  type="button"
                  key={friend.id}
                  className="px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                  onClick={() => addFriend(friend)}
                  disabled={!!friends.find(f => f.id === friend.id)}
                >
                  {friend.username}
                </button>
              ))}
            </div>
            <ul className="mt-2 flex flex-col gap-2">
              {friends.map(friend => (
                <li key={friend.id} className="flex items-center gap-2">
                  <span>{friend.username}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-24 border rounded p-1"
                    placeholder="Share"
                    value={friend.share}
                    onChange={e =>
                      updateShare(
                        friend.id,
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    required
                  />
                  <button
                    type="button"
                    className="text-red-600 hover:underline"
                    onClick={() => removeFriend(friend.id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-2 text-gray-700">
              <span className="font-semibold">Your share (payer): </span>
              <span>
                {payerShareValue.toFixed(2)}
              </span>
            </div>
          </div>
          <div>
            <span className="font-semibold">Image (optional): </span>
            <button
              type="button"
              className="ml-2 px-2 py-1 rounded bg-gray-200"
              onClick={handleImageUpload}
            >
              Upload Image (placeholder)
            </button>
          </div>
          <button
            type="submit"
            className="mt-4 px-4 py-2 rounded bg-green-600 text-white font-semibold"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Payment"}
          </button>
        </form>
      </main>
    </>
  );
}