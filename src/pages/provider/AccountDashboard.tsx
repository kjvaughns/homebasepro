import EmbeddedAccountDashboard from "@/components/provider/EmbeddedAccountDashboard";

export default function AccountDashboard() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Account Management</h1>
        <p className="text-muted-foreground">View balances, manage payouts, and update bank details</p>
      </div>

      <EmbeddedAccountDashboard />
    </div>
  );
}
