import { Toaster } from "../Component/StaffPagesComponents/ui/toaster";
import { Toaster as Sonner } from "../Component/StaffPagesComponents/ui/sonner";
import { TooltipProvider } from "../Component/StaffPagesComponents/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "../Component/StaffPagesComponents/layout/MainLayout";
import DashboardPage from "./DashboardPage";
import SportsPage from "./SportsPage";
import MembershipsPage from "./MemberShipsPage";
import RegistrationManagementPage from "./RegistrationManagementPage";
import MembershipFormPage from "./MembershipFormPage";
import FinancePage from "./FinancePage";
// import TaskApprovalPage from "./TaskApprovalPage";
import AdminPrivilegesPage from "./AdminPrivilegesPage";
import NotFound from "./NotFound";
import './staffDashboard.css'
import AuditLogPage from "./AuditLogPage";
import MediaGalleryDashboard, { MediaGalleryPostPage } from "./MediaGalleryDashboard";
import AddNewStaffPage from "./AddNewStaffPage";
import StaffListPage from "./StaffListPage";
import StaffManagementPage from "./StaffManagementPage";
import StaffProfile from "./StaffProfile";
import ProtectedRoute from "../Component/ProtectedRoute";
import PrivilegePackageAdminPage from "./PrivilegePackageAdminPage";
import AssignStaffPrivilegesPage from "./AssignStaffPrivilegesPage";
import RevokePrivilegesPage from "./RevokePrivilegesPage";
import { CredentialChangeModal } from "../components/CredentialChangeModal";
import MemberManagementPage from "./MemberManagementPage";
import StaffAddMemberPage from "./StaffAddMemberPage";
import StaffAddTeamMemberPage from "./StaffAddTeamMemberPage";
import SportsMembersPage from "./SportsMembersPage";
import SportManagementPage from "./SportManagementPage";
import SportsRequestsPage from "./SportsRequestsPage";
import CourtsManagementPage from "./CourtsManagementPage";
import CourtBookingsPage from "./CourtBookingsPage";
import AttendancePage from "./AttendancePage";
import TeamsManagementPage from "./TeamsManagementPage";
import SubscriptionsPage from "./SubscriptionsPage";
import { useAuth } from "../context/AuthContext";
import CardPrintPage from "./CardPrintPage";
import ManageInvitationsPage from "./ManageInvitationsPage";

const queryClient = new QueryClient();

// ─── Ordered list of fallback pages for non-dashboard users ──────────────────
// When a user does NOT have dashboard.view, we redirect them to the first page
// in this list that they have access to. The profile page has no privilege
// requirement so it is always the ultimate fallback.
const FALLBACK_PAGES: Array<{ path: string; privilege?: string }> = [
  { path: "/staff/dashboard/registrations", privilege: "VIEW_MEMBERS" },
  { path: "/staff/dashboard/members/manage", privilege: "VIEW_MEMBERS" },
  { path: "/staff/dashboard/sports", privilege: "VIEW_SPORTS" },
  { path: "/staff/dashboard/memberships", privilege: "VIEW_MEMBERSHIP_PLANS" },
  { path: "/staff/dashboard/finance", privilege: "VIEW_FINANCE" },
  // { path: "/staff/dashboard/tasks", privilege: "VIEW_TASKS" },
  { path: "/staff/dashboard/media-gallery"           /* no privilege */ },
  { path: "/staff/dashboard/audit-log", privilege: "audit.view" },
  { path: "/staff/dashboard/admin/staff/manage", privilege: "STAFF_CREATE" },
  { path: "/staff/dashboard/profile"                 /* always accessible */ },
];

/** Redirects admin/senior staff to DashboardPage; others to their first accessible page. */
function SmartIndexRedirect() {
  const { hasPrivilege } = useAuth();

  if (hasPrivilege("dashboard.view")) {
    return <DashboardPage />;
  }

  const target = FALLBACK_PAGES.find(
    (p) => !p.privilege || hasPrivilege(p.privilege)
  );

  return <Navigate to={target?.path ?? "/staff/dashboard/profile"} replace />;
}

const StaffDashboard = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <CredentialChangeModal />
        <MainLayout>
          <Routes>
            <Route index element={<SmartIndexRedirect />} />
            <Route path="sports" element={<ProtectedRoute requiredPrivilege="VIEW_SPORTS"><SportsPage /></ProtectedRoute>} />
            {/* <Route path="sports/requests" element={<ProtectedRoute requiredPrivilege="VIEW_SPORTS"><SportsRequestsPage /></ProtectedRoute>} /> */}
            <Route path="sports/courts" element={<ProtectedRoute requiredPrivilege="VIEW_SPORTS"><CourtsManagementPage /></ProtectedRoute>} />
            <Route path="sports/bookings" element={<ProtectedRoute requiredPrivilege="VIEW_SPORTS"><CourtBookingsPage /></ProtectedRoute>} />
            <Route path="sports/invitations" element={<ProtectedRoute requiredPrivilege="VIEW_SPORTS"><ManageInvitationsPage /></ProtectedRoute>} />
            {/* <Route path="sports/attendance" element={<ProtectedRoute requiredPrivilege="VIEW_SPORTS"><AttendancePage /></ProtectedRoute>} /> */}
            <Route path="sports/teams" element={<ProtectedRoute requiredPrivilege="VIEW_SPORTS"><TeamsManagementPage /></ProtectedRoute>} />
            <Route path="profile" element={<StaffProfile />} />
            <Route path="memberships" element={<ProtectedRoute requiredPrivilege="VIEW_MEMBERSHIP_PLANS"><MembershipsPage /></ProtectedRoute>} />
            <Route path="registrations" element={<ProtectedRoute requiredPrivilege="VIEW_MEMBERS"><RegistrationManagementPage /></ProtectedRoute>} />
            <Route path="membership-form" element={<ProtectedRoute requiredPrivilege="VIEW_MEMBERS"><MembershipFormPage /></ProtectedRoute>} />
            {/* <Route path="finance" element={<ProtectedRoute requiredPrivilege="VIEW_FINANCE"><FinancePage /></ProtectedRoute>} /> */}
            <Route path="finance/subscriptions" element={<ProtectedRoute requiredPrivilege="VIEW_FINANCE"><SubscriptionsPage /></ProtectedRoute>} />
            {/* <Route path="tasks" element={<ProtectedRoute requiredPrivilege="VIEW_TASKS"><TaskApprovalPage /></ProtectedRoute>} /> */}
            <Route path="admin/privileges" element={<ProtectedRoute requiredPrivilege="VIEW_PRIVILEGES"><AdminPrivilegesPage /></ProtectedRoute>} />
            <Route path="admin/privilege-packages" element={<ProtectedRoute requiredPrivilege="VIEW_PRIVILEGES"><PrivilegePackageAdminPage /></ProtectedRoute>} />
            <Route path="audit-log" element={<ProtectedRoute requiredPrivilege="audit.view"><AuditLogPage /></ProtectedRoute>} />
            <Route path="admin/staff/new" element={<ProtectedRoute requiredPrivilege="STAFF_CREATE"><AddNewStaffPage /></ProtectedRoute>} />
            <Route path="admin/staff/list" element={<ProtectedRoute requiredPrivilege="STAFF_CREATE"><StaffListPage /></ProtectedRoute>} />
            <Route path="admin/staff/manage" element={<ProtectedRoute requiredPrivilege="STAFF_CREATE"><StaffManagementPage /></ProtectedRoute>} />
            <Route path="admin/staff/assign-privileges" element={<ProtectedRoute requiredPrivilege="VIEW_PRIVILEGES"><AssignStaffPrivilegesPage /></ProtectedRoute>} />
            <Route path="admin/staff/revoke-privileges" element={<ProtectedRoute requiredPrivilege="VIEW_PRIVILEGES"><RevokePrivilegesPage /></ProtectedRoute>} />
            <Route path="members/manage" element={<ProtectedRoute requiredPrivilege="VIEW_MEMBERS"><MemberManagementPage /></ProtectedRoute>} />
            <Route path="members/sports" element={<ProtectedRoute requiredPrivilege="VIEW_MEMBERS"><SportsMembersPage /></ProtectedRoute>} />
            <Route path="members/sports-view" element={<ProtectedRoute requiredPrivilege="VIEW_MEMBERS"><SportManagementPage /></ProtectedRoute>} />
            <Route path="members/new" element={<ProtectedRoute requiredPrivilege="VIEW_MEMBERS"><StaffAddMemberPage /></ProtectedRoute>} />
            <Route path="members/new-team" element={<ProtectedRoute requiredPrivilege="VIEW_MEMBERS"><StaffAddTeamMemberPage /></ProtectedRoute>} />
            <Route path="members/card-print" element={<ProtectedRoute requiredPrivilege="VIEW_MEMBERS"><CardPrintPage /></ProtectedRoute>} />
            <Route path="media-gallery" element={<MediaGalleryDashboard />} />
            <Route path="media-gallery/:id" element={<MediaGalleryPostPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </MainLayout>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default StaffDashboard;

