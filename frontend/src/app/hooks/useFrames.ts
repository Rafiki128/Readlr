import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../modules/auth/auth.context";

export interface FrameOption {
  id: number;
  asset_key: string;
  name: string;
  unlock_stage_id: number | null;
  unlock_stage_number: number | null;
  unlock_stage_title: string | null;
  design_notes: string | null;
  unlocked: boolean;
  equipped: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export function useFrames() {
  const { token } = useAuth();
  const [frames, setFrames] = useState<FrameOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFrames = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/frames/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFrames(data.frames);
      }
    } catch (err) {
      console.error("Failed to fetch frames:", err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchFrames();
  }, [fetchFrames]);

  const equipFrame = useCallback(
    async (frameId: number): Promise<boolean> => {
      if (!token) return false;
      try {
        const res = await fetch(`${API_URL}/frames/me/equip`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ frame_id: frameId }),
        });
        if (res.ok) {
          const data = await res.json();
          setFrames(data.frames);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [token]
  );

  const equippedAssetKey = frames.find((f) => f.equipped)?.asset_key ?? null;

  return { frames, isLoadingFrames: isLoading, equipFrame, equippedAssetKey, refetchFrames: fetchFrames };
}
