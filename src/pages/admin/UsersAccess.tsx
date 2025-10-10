import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminUsers from "@/pages/admin/UserManagement";
import AdminTeam from "@/pages/admin/TeamManagement";
import AdminBetaAccess from "@/pages/admin/BetaAccess";

export default function UsersAccess() {
  return (
    <div className="p-4 md:p-6">
      <header className="mb-4">
        <h1 className="text-xl md:text-2xl font-bold">Users & Access</h1>
        <p className="text-sm text-muted-foreground">Manage users, roles, and beta access</p>
      </header>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="team">Team & Roles</TabsTrigger>
          <TabsTrigger value="beta">Beta Access</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <AdminUsers />
        </TabsContent>
        <TabsContent value="team" className="mt-4">
          <AdminTeam />
        </TabsContent>
        <TabsContent value="beta" className="mt-4">
          <AdminBetaAccess />
        </TabsContent>
      </Tabs>
    </div>
  );
}
