import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./utils/serviceWorker";

// Register service worker early for push notifications
if ('serviceWorker' in navigator) {
  console.log('🔧 Registering service worker...');
  registerServiceWorker()
    .then((registration) => {
      if (registration) {
        console.log('✅ Service worker registered successfully:', registration.scope);
      } else {
        console.warn('⚠️ Service worker registration returned null');
      }
    })
    .catch((error) => {
      console.error('❌ Service worker registration failed:', error);
    });
} else {
  console.warn('⚠️ Service workers not supported in this browser');
}

createRoot(document.getElementById("root")!).render(<App />);
