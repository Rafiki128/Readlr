import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import "./app/components/worldPolish.css";
import "./app/components/worldDestinations.css";
import "./app/components/chroniclePages.css";
import "./app/components/learnerWorldConsistency.css";
import "./app/components/activityImmersion.css";
import { Toaster } from "./app/components/ui/sonner";
import { startBackgroundMusic } from "./hooks/backgroundMusic";

startBackgroundMusic();

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <Toaster position="bottom-center" richColors />
  </>
);
