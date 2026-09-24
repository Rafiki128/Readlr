import { useEffect } from "react";
import { useAuth } from "../../modules/auth/auth.context";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// Toggles the .dark class that theme.css uses to swap palette tokens.
export function applyDarkMode(enabled: boolean) {
  document.documentElement.classList.toggle("dark", enabled);
}

// Applies the learner's persisted dark_mode setting, falling back to light when signed out.
export function useDarkMode() {
  const { token } = useAuth();

  useEffect(() => {
    if (!token) {
      applyDarkMode(false);
      return;
    }
    fetch(`${API_URL}/settings/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) applyDarkMode(Boolean(data.settings.dark_mode));
      })
      .catch((err) => console.error("Failed to load dark mode setting:", err));
  }, [token]);
}
