"use client";
import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/hooks/useAuth";

export default function SocialPage() {
  const { user, loading } = useAuth();
  const [friends, setFriends] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmUnfriend, setConfirmUnfriend] = useState<number | null>(null);
  const [processing, setProcessing] = useState<number | null>(null);

  // Fetch friends
  useEffect(() => {
    if (!user) return;
    fetch(process.env.NEXT_PUBLIC_API_URL + "/api/friendships", {
      credentials: "include",
    })
      .then(res => res.json())
      .then(data => setFriends(Array.isArray(data) ? data : []))
      .catch(() => setError("Failed to load friends"));
  }, [user, processing]);

  // Fetch incoming friend requests
  useEffect(() => {
    if (!user) return;
    fetch(process.env.NEXT_PUBLIC_API_URL + "/api/friendships/requests", {
      credentials: "include",
    })
      .then(res => res.json())
      .then(data => setIncomingRequests(Array.isArray(data) ? data : []))
      .catch(() => setError("Failed to load incoming requests"));
  }, [user, processing]);

  // Search users
  useEffect(() => {
    if (!search || search.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const timeout = setTimeout(() => {
      fetch(
        process.env.NEXT_PUBLIC_API_URL + "/api/users/search",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ query: search }),
        }
      )
        .then(res => res.json())
        .then(data => {
          setSearchResults(Array.isArray(data) ? data : []);
          setSearching(false);
        })
        .catch(() => {
          setError("Failed to search users");
          setSearching(false);
        });
    }, 400);
    return () => clearTimeout(timeout);
  }, [search]);

  // Send friend request
  const handleFriend = async (userId: number) => {
    setProcessing(userId);
    try {
      await fetch(process.env.NEXT_PUBLIC_API_URL + "/api/friendships/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ friend_id: userId }),
      });
      setProcessing(null);
    } catch {
      setError("Failed to send friend request");
      setProcessing(null);
    }
  };

  // Accept friend request
  const handleAccept = async (fromUserId: number) => {
    setProcessing(fromUserId);
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/friendships/requests/${fromUserId}/accept`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      setProcessing(null);
    } catch {
      setError("Failed to accept request");
      setProcessing(null);
    }
  };

  // Reject friend request
  const handleReject = async (fromUserId: number) => {
    setProcessing(fromUserId);
    try {
      await fetch(process.env.NEXT_PUBLIC_API_URL + "/api/friendships/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ friend_id: fromUserId }),
      });
      setProcessing(null);
    } catch {
      setError("Failed to reject request");
      setProcessing(null);
    }
  };

  // Unfriend
  const handleUnfriend = async (friendId: number) => {
    setProcessing(friendId);
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/friendships/${friendId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      setProcessing(null);
      setConfirmUnfriend(null);
    } catch {
      setError("Failed to unfriend");
      setProcessing(null);
      setConfirmUnfriend(null);
    }
  };

  if (loading || !user) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 p-4 flex flex-col gap-8 md:ml-56">
        <h1 className="text-2xl font-bold mb-2">Social</h1>

        {/* Incoming Friend Requests */}
        <section>
          <h2 className="text-lg font-semibold mb-2">Incoming Friend Requests</h2>
          <ul className="flex flex-col gap-2">
            {incomingRequests.length === 0 && (
              <li className="text-gray-500">No incoming requests.</li>
            )}
            {incomingRequests.map((req: any) => (
              <li
                key={req.id}
                className="bg-white rounded shadow p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={"/default-avatar.png"}
                    alt={req.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <span className="font-semibold">{req.username}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200"
                    onClick={() => handleAccept(req.id)}
                    disabled={processing === req.id}
                  >
                    {processing === req.id ? "Accepting..." : "Accept"}
                  </button>
                  <button
                    className="px-3 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                    onClick={() => handleReject(req.id)}
                    disabled={processing === req.id}
                  >
                    {processing === req.id ? "Rejecting..." : "Reject"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Friends List */}
        <section>
          <h2 className="text-lg font-semibold mb-2">Your Friends</h2>
          <ul className="flex flex-col gap-2">
            {friends.length === 0 && (
              <li className="text-gray-500">You have no friends yet.</li>
            )}
            {friends.map((friend: any) => (
              <li
                key={friend.id}
                className="bg-white rounded shadow p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={friend.profile_picture || "/default-avatar.png"}
                    alt={friend.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <span className="font-semibold">{friend.username}</span>
                </div>
                <button
                  className="px-3 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                  onClick={() => setConfirmUnfriend(friend.id)}
                >
                  Unfriend
                </button>
                {/* Confirmation Modal */}
                {confirmUnfriend === friend.id && (
                  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white rounded shadow-lg p-6 flex flex-col gap-4">
                      <span>
                        Are you sure you want to remove{" "}
                        <span className="font-semibold">{friend.username}</span> from your friends?
                      </span>
                      <div className="flex gap-2 justify-end">
                        <button
                          className="px-3 py-1 rounded bg-gray-200"
                          onClick={() => setConfirmUnfriend(null)}
                        >
                          Cancel
                        </button>
                        <button
                          className="px-3 py-1 rounded bg-red-600 text-white"
                          onClick={() => handleUnfriend(friend.id)}
                          disabled={processing === friend.id}
                        >
                          {processing === friend.id ? "Removing..." : "Unfriend"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* Search Bar */}
        <section>
          <h2 className="text-lg font-semibold mb-2">Find Friends</h2>
          <input
            type="text"
            className="w-full p-2 border rounded mb-2"
            placeholder="Search by username..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {searching && <div className="text-gray-500">Searching...</div>}
          <ul className="flex flex-col gap-2">
            {searchResults.map((result: any) => (
              <li
                key={result.id}
                className="bg-white rounded shadow p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={result.profile_picture || "/default-avatar.png"}
                    alt={result.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <span className="font-semibold">{result.username}</span>
                </div>
                <button
                  className="px-3 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200"
                  onClick={() => handleFriend(result.id)}
                  disabled={processing === result.id}
                >
                  {processing === result.id ? "Sending..." : "Friend"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}