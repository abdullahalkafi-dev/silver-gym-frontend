// components/examples/DynamicRoleExamples.tsx
/**
 * This file contains real-world examples of how to implement dynamic role-based UI
 * These are NOT meant to be used directly, but rather as reference implementations
 */

"use client";
/* ============================================
  EXAMPLE 1: Simple Permission Check with Button
  ============================================ */
import { CanAccess } from "@/components/shared/CanAccess";
import { Button } from "@/components/ui/button";

export const Example1_SimpleButton = () => {
  return (
    <Button>Add New Member</Button>
  );
};

/* ============================================
  EXAMPLE 2: Conditional Rendering with Fallback
  ============================================ */
export const Example2_WithFallback = () => {
  return (
    <CanAccess permission="billing:manage">
      <Button variant="destructive">Delete Billing Record</Button>
    </CanAccess>
  );
};

/* ============================================
  EXAMPLE 3: Using usePermission Hook
  ============================================ */
import { usePermission } from "@/hooks/usePermission";

export const Example3_UsingHook = () => {
  const { hasPermission } = usePermission();

  return (
    <div className="space-y-4">
      <div>
        <h2>Members List</h2>
        {/* Members list content */}
      </div>

      <Button>Create Member</Button>

      {hasPermission("member:manage") && <Button variant="outline">Edit Member</Button>}

      {hasPermission("member:manage") && (
        <Button variant="destructive">Delete Member</Button>
      )}
    </div>
  );
};

/* ============================================
  EXAMPLE 4: Complex Permission Logic
  ============================================ */
export const Example4_ComplexLogic = () => {
  const { hasPermission } = usePermission();

  const canManageBilling = hasPermission("billing:manage");
  const canViewFinancials = true;

  return (
    <div>
      {canManageBilling && (
        <div className="bg-blue-50 p-4 rounded">
          <h2>Billing Management</h2>
          {/* Full billing management interface */}
        </div>
      )}

      {canViewFinancials && !canManageBilling && (
        <div className="bg-gray-50 p-4 rounded">
          <h2>Financial Overview (View Only)</h2>
          {/* Read-only financial data */}
        </div>
      )}
    </div>
  );
};

/* ============================================
  EXAMPLE 5: Protected Route Page
  ============================================ */

export const Example5_ProtectedPage = () => {
  return (
    <div>
      <h1>User Access Management</h1>
      <p>
        This content is only visible to users with permission to manage users
        or create roles.
      </p>
    </div>
  );
};

/* ============================================
  EXAMPLE 6: Dynamic Sidebar Filtering
  ============================================ */
import { getSidebarForRole } from "@/config/sidebarConfig";
export const Example6_DynamicSidebar = () => {
  const { user } = useUser();

  if (!user) return null;

  // This automatically filters menu items based on role
  const sidebarSections = getSidebarForRole(user.role);

  return (
    <nav>
      {sidebarSections.map((section) => (
        <div key={section.toString()}>
          {section.items.map((item) => (
            <a key={item.id} href={item.path}>
              {item.icon} {item.label}
            </a>
          ))}
        </div>
      ))}
    </nav>
  );
};

/* ============================================
  EXAMPLE 7: Form with Permission-Based Fields
  ============================================ */
import { useForm } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Example7_PermissionBasedForm = () => {
  const form = useForm();
  const { hasPermission } = usePermission();

  return (
    <Form {...form}>
      <form className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Member Name</Label>
          <Input id="name" placeholder="Enter member name" />
        </div>

        {hasPermission("member:manage") && (
          <>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="Enter email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" placeholder="Enter phone" />
            </div>
          </>
        )}

        {hasPermission("member:manage") && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 rounded">
            <Checkbox id="confirm" />
            <Label htmlFor="confirm" className="text-red-600">
              Confirm Deletion
            </Label>
          </div>
        )}
      </form>
    </Form>
  );
};

/* ============================================
  EXAMPLE 8: Role-Based Component Visibility
  ============================================ */
import { useUser } from "@/hooks/useUser";

export const Example8_RoleBasedUI = () => {
  const { role } = useUser();

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Always visible */}
      <DashboardCard title="Overview" />

      {/* Admin only */}
      {role === "admin" && (
        <>
          <DashboardCard title="Analytics" />
          <DashboardCard title="Reports" />
        </>
      )}

      {/* Manager and Admin */}
      {(role === "manager" || role === "admin") && (
        <DashboardCard title="Members" />
      )}

      {/* Permission-based */}
      <DashboardCard title="Billing" />

      <DashboardCard title="User Access" />
    </div>
  );
};

interface DashboardCardProps {
  title: string;
}

const DashboardCard = ({ title }: DashboardCardProps) => (
  <div className="bg-white p-4 rounded shadow">
    <h3 className="font-semibold">{title}</h3>
  </div>
);

/* ============================================
  EXAMPLE 9: Table with Permission-Based Actions
  ============================================ */
export const Example9_TableActions = () => {
  const { hasPermission } = usePermission();

  return (
    <table className="w-full">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {/* Sample row */}
        <tr>
          <td>John Doe</td>
          <td>john@example.com</td>
          <td className="space-x-2">
            <Button size="sm" variant="outline">
              View
            </Button>
            {hasPermission("member:manage") && (
              <Button size="sm" variant="outline">
                Edit
              </Button>
            )}
            {hasPermission("member:manage") && (
              <Button size="sm" variant="destructive">
                Delete
              </Button>
            )}
          </td>
        </tr>
      </tbody>
    </table>
  );
};

/* ============================================
  EXAMPLE 10: Combining Multiple Guards
  ============================================ */
export const Example10_MultipleGuards = () => {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded">
        <h2>Members Management</h2>

        <Button>Add Member</Button>

        <CanAccess permission="member:manage">
          <Button>Edit Members</Button>
        </CanAccess>

        <CanAccess permission="member:manage">
          <Button variant="destructive">Delete Members</Button>
        </CanAccess>
      </div>

      <div className="bg-green-50 p-4 rounded">
        <h2>Billing Management (Full Access)</h2>
        {/* Full billing interface */}
      </div>
    </div>
  );
};

export default Example1_SimpleButton;
