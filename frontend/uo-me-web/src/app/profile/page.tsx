"use client";
import { useEffect, useState, useRef } from "react";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/hooks/useAuth";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [newPic, setNewPic] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch profile info
  useEffect(() => {
    if (!user) return;
    fetch(process.env.NEXT_PUBLIC_API_URL + "/api/users/profile", {
      credentials: "include",
    })
      .then(res => res.json())
      .then(data => {
        setProfile(data);
        setUsername(data.username);
        setEmail(data.email);
        setProfilePic(
          data.profile_picture ||
          (data.id ? `/static/profile_pics/user_${data.id}.png` : null)
        );
      })
      .catch(() => setError("Failed to load profile"));
  }, [user]);

  // Save profile changes
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to update profile");
      }
      setSaving(false);
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
      setSaving(false);
    }
  };

  // Upload profile picture
  const handlePicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setNewPic(file);
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/api/users/profile-picture", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to upload profile picture");
      }
      const data = await res.json();
      setProfilePic(data.url);
      setUploading(false);
    } catch (err: any) {
      setError(err.message || "Failed to upload profile picture");
      setUploading(false);
    }
  };

  // Delete user account
  const handleDeleteAccount = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/api/users/profile", {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to delete account");
      }
      // Optionally, redirect or log out the user here
      window.location.href = "/";
    } catch (err: any) {
      setError(err.message || "Failed to delete account");
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading || !user || !profile) return <div className="p-4">Loading...</div>;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 p-4 md:ml-56 flex flex-col items-center">
        <div className="w-full max-w-md bg-white rounded shadow p-6 flex flex-col gap-6">
          <h1 className="text-2xl font-bold mb-2">Your Profile</h1>
          {error && <div className="text-red-600">{error}</div>}

          <div className="flex flex-col items-center gap-2">
            <img
              src={profilePic || "/default-avatar.png"}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border"
            />
            <button
              className="px-3 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Change Picture"}
            </button>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={handlePicUpload}
            />
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSave}>
            <label className="flex flex-col gap-1">
              <span className="font-semibold">Username</span>
              <input
                type="text"
                className="p-2 border rounded"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                minLength={1}
                maxLength={16}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-semibold">Email</span>
              <input
                type="email"
                className="p-2 border rounded"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </label>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>

          <button
            className="mt-4 px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleting}
          >
            Delete Account
          </button>

          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
              <div className="bg-white rounded shadow-lg p-6 flex flex-col gap-4">
                <span>
                  Are you sure you want to <span className="font-bold text-red-600">delete your account</span>?<br />
                  This action cannot be undone.
                </span>
                <div className="flex gap-2 justify-end">
                  <button
                    className="px-3 py-1 rounded bg-gray-200"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-3 py-1 rounded bg-red-600 text-white"
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}