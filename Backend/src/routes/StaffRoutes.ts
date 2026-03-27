import { Router } from 'express';
import StaffController from '../controllers/StaffController';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * Staff Management Routes
 * All routes are prefixed with /api/staff
 * 
 * These routes support the privilege package system with per-individual overrides
 */

// Staff Types
router.get('/types', StaffController.getStaffTypes);

// Privilege Management
router.get('/privileges', authenticate, StaffController.getPrivileges);

// Privilege Packages (CRUD operations)
router.get('/packages', authenticate, StaffController.getPrivilegePackages);
router.post('/packages', authenticate, StaffController.createPrivilegePackage);
router.get('/packages/:packageId', authenticate, StaffController.getPrivilegePackageById);
router.put('/packages/:packageId', authenticate, StaffController.updatePrivilegePackage);
router.delete('/packages/:packageId', authenticate, StaffController.deletePrivilegePackage);
router.put('/packages/:packageId/privileges', authenticate, StaffController.updatePackagePrivileges);
router.get('/packages/:packageId/privileges', authenticate, StaffController.getPackagePrivileges);

// Staff CRUD Operations
// IMPORTANT: Register endpoint requires authentication
// Only ADMIN can register EXECUTIVE_MANAGER
// Only ADMIN and EXECUTIVE_MANAGER can register other staff immediately
// DEPUTY_EXEC_MANAGER registrations require approval
router.post('/register', authenticate, StaffController.registerStaff);
router.get('/', StaffController.getAllStaff);

// Individual Privilege Grants/Revokes (more specific routes first)
router.get('/:id/privileges', authenticate, StaffController.getStaffPrivileges);
router.get('/:id/final-privileges', authenticate, StaffController.getFinalPrivileges);
router.get('/:id/privilege-codes', authenticate, StaffController.getFinalPrivilegeCodes);
router.post('/:id/check-privilege/:privilegeCode', authenticate, StaffController.checkStaffPrivilege);
router.post('/:id/check-privileges/any', authenticate, StaffController.checkStaffHasAnyPrivilege);
router.post('/:id/check-privileges/all', authenticate, StaffController.checkStaffHasAllPrivileges);
router.get('/:id/privilege-stats', authenticate, StaffController.getStaffPrivilegeStats);
router.get('/:id/privilege-breakdown', authenticate, StaffController.getStaffPrivilegeBreakdown);
router.post('/:id/grant-privilege', authenticate, StaffController.grantPrivilege);
router.post('/:id/revoke-privilege', authenticate, StaffController.revokePrivilege);
router.get('/:id/has-privilege/:privilegeCode', authenticate, StaffController.checkPrivilege);

// Privilege Package Assignment
router.post('/:id/assign-packages', authenticate, StaffController.assignPackages);

// Activity Logs
router.get('/:id/activity-logs', authenticate, StaffController.getActivityLogs);

// Staff detail routes (less specific, at the end)
router.get('/:id', authenticate, StaffController.getStaffById);
router.put('/:id', authenticate, StaffController.updateStaff);
router.patch('/:id/deactivate', authenticate, StaffController.deactivateStaff);

export default router;
