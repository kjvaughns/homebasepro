import { Navigate } from "react-router-dom";

// Redirect to main settings page
export default function PaymentSettings() {
  return <Navigate to="/provider/settings" replace />;
}
