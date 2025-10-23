import { Navigate } from "react-router-dom";

// Redirect /provider/settings/payments to main settings page with payments tab
export default function PaymentsRoute() {
  return <Navigate to="/provider/settings?tab=payments" replace />;
}
