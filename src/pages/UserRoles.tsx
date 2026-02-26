import { AppLayout } from "@/components/AppLayout";
import { UserRolesManager } from "@/components/UserRolesManager";

const UserRoles = () => {
  return (
    <AppLayout title="User Roles">
      <div className="container mx-auto px-4 py-6 sm:px-6">
        <UserRolesManager />
      </div>
    </AppLayout>
  );
};

export default UserRoles;
