import { useEffect, useState } from "react";

export function useMicrophonePermission() {
  const [permission, setPermission] = useState<PermissionState | "unknown">("unknown");
  useEffect(() => {
    let disposed = false;
    let status: PermissionStatus | undefined;
    const update = () => { if (!disposed && status) setPermission(status.state); };
    const refresh = async () => {
      try {
        const next = await navigator.permissions?.query({ name: "microphone" as PermissionName });
        if (disposed || !next) return;
        status?.removeEventListener("change", update);
        status = next;
        status.addEventListener("change", update);
        update();
      } catch { /* Recording still requests permission on browsers without this query. */ }
    };
    void refresh();
    window.addEventListener("focus", refresh);
    return () => { disposed = true; status?.removeEventListener("change", update); window.removeEventListener("focus", refresh); };
  }, []);
  return permission;
}
