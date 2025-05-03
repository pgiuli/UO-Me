import { useEffect, useState, useCallback } from "react";

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL + "/api/users/profile",
        { credentials: "include" }
      );
      if (!res.ok) throw new Error();
      setUser(await res.json());
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const logout = async () => {
    await fetch(process.env.NEXT_PUBLIC_API_URL + "/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
  };

  return { user, loading, fetchProfile, logout };
}