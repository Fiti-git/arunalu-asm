import { useEffect, useState } from "react";
import api from "utils/api";

export default function useManagerProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await api.get("/api/user/");
        setUser(res.data);
        localStorage.setItem("manager_profile", JSON.stringify(res.data));
      } catch (err) {
        console.error("Failed to load user profile");
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  return { user, loading };
}
