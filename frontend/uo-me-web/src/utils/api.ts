export async function registerUser({
    username,
    email,
    password,
  }: {
    username: string;
    email: string;
    password: string;
  }) {
    const res = await fetch(
      process.env.NEXT_PUBLIC_API_URL + "/api/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      }
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Registration failed");
    }
    return res.json();
  }

export async function loginUser({
    username,
    password,
  }: {
    username: string;
    password: string;
  }) {
    const res = await fetch(
      process.env.NEXT_PUBLIC_API_URL + "/api/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Important for cookie-based auth
        body: JSON.stringify({ username, password }),
      }
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Login failed");
    }
    return res.json();
  }