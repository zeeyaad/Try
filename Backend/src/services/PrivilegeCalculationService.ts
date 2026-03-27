import { AppDataSource } from '../database/data-source';

export class PrivilegeCalculationService {
  /**
   * Calculate final privilege codes for a staff member
   * Combines privileges from packages and individual grants/revokes
   */
  static async calculateFinalPrivileges(staffId: number): Promise<Record<string, unknown>[]> {
    const queryRunner = AppDataSource.createQueryRunner();
    try {
      // Get privilege codes in final set
      const privilegeCodes = await this.calculateFinalPrivilegeCodes(staffId);

      // If no privileges, return empty array
      if (privilegeCodes.size === 0) {
        return [];
      }

      // Get full privilege details for each code in the final set
      const codesArray = Array.from(privilegeCodes);
      const placeholders = codesArray.map((_, i) => `$${i + 1}`).join(',');

      const privileges = await queryRunner.query(
        `
        SELECT id, code, name_en, name_ar, module, is_active
        FROM privileges
        WHERE code IN (${placeholders}) AND is_active = true
        ORDER BY module, code
        `,
        codesArray
      );

      return privileges;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get final computed privilege codes for a staff member (optimized)
   */
  static async calculateFinalPrivilegeCodes(staffId: number): Promise<Set<string>> {
    const queryRunner = AppDataSource.createQueryRunner();
    try {
      // 1. Check if staff is Admin (staff_type_id = 1)
      const staffCheck = await queryRunner.query(
        `SELECT staff_type_id FROM staff WHERE id = $1`,
        [staffId]
      );

      if (staffCheck.length > 0 && staffCheck[0].staff_type_id === 1) {
        // Admin gets ALL active privileges
        const allPrivileges = await queryRunner.query(
          `SELECT code FROM privileges WHERE is_active = true`
        );
        const adminSet = new Set<string>();
        allPrivileges.forEach((p: { code: string }) => adminSet.add(p.code));
        return adminSet;
      }

      // 2. Get privileges from assigned packages
      // Fixed table name: staff_package_privileges -> privileges_packages
      const packagePrivileges = await queryRunner.query(
        `
        SELECT DISTINCT p.code
        FROM privileges p
        INNER JOIN privileges_packages pp ON p.id = pp.privilege_id
        INNER JOIN staff_packages sp ON pp.package_id = sp.package_id
        WHERE sp.staff_id = $1 AND p.is_active = true
        `,
        [staffId]
      );

      // 3. Get individually granted privileges
      // Fixed table name: staff_privilege_overrides -> staff_privileges_override
      const grantedPrivileges = await queryRunner.query(
        `
        SELECT DISTINCT p.code
        FROM privileges p
        INNER JOIN staff_privileges_override spo ON p.id = spo.privilege_id
        WHERE spo.staff_id = $1 AND spo.is_granted = true AND p.is_active = true
        `,
        [staffId]
      );

      // 4. Get individually revoked privileges
      // Fixed table name: staff_privilege_overrides -> staff_privileges_override
      const revokedPrivileges = await queryRunner.query(
        `
        SELECT DISTINCT p.code
        FROM privileges p
        INNER JOIN staff_privileges_override spo ON p.id = spo.privilege_id
        WHERE spo.staff_id = $1 AND spo.is_granted = false AND p.is_active = true
        `,
        [staffId]
      );

      // Combine: packages + grants - revokes
      const finalSet = new Set<string>();

      packagePrivileges.forEach((p: Record<string, unknown>) => {
        finalSet.add(p.code as string);
      });

      grantedPrivileges.forEach((p: Record<string, unknown>) => {
        finalSet.add(p.code as string);
      });

      revokedPrivileges.forEach((p: Record<string, unknown>) => {
        finalSet.delete(p.code as string);
      });

      return finalSet;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Check if staff member has a specific privilege
   */
  static async hasPrivilege(staffId: number, privilegeCode: string): Promise<boolean> {
    const privileges = await this.calculateFinalPrivilegeCodes(staffId);
    return privileges.has(privilegeCode);
  }

  /**
   * Check if staff member has ANY of the specified privileges
   */
  static async hasAnyPrivilege(staffId: number, privilegeCodes: string[]): Promise<string[]> {
    const privileges = await this.calculateFinalPrivilegeCodes(staffId);
    return privilegeCodes.filter((code) => privileges.has(code));
  }

  /**
   * Check if staff member has ALL of the specified privileges
   */
  static async hasAllPrivileges(staffId: number, privilegeCodes: string[]): Promise<boolean> {
    const privileges = await this.calculateFinalPrivilegeCodes(staffId);
    return privilegeCodes.every((code) => privileges.has(code));
  }

  /**
   * Get privilege statistics for a staff member
   */
  static async getPrivilegeStats(
    staffId: number
  ): Promise<{
    total_privileges: number;
    privileges_from_packages: number;
    individually_granted: number;
    individually_revoked: number;
    modules: string[];
  }> {
    const queryRunner = AppDataSource.createQueryRunner();
    try {
      // Get package privileges count
      const packageCount = await queryRunner.query(
        `
        SELECT COUNT(DISTINCT p.id) as count
        FROM privileges p
        INNER JOIN privileges_packages pp ON p.id = pp.privilege_id
        INNER JOIN staff_packages sp ON pp.package_id = sp.package_id
        WHERE sp.staff_id = $1 AND p.is_active = true
        `,
        [staffId]
      );

      // Get granted count
      const grantedCount = await queryRunner.query(
        `
        SELECT COUNT(DISTINCT p.id) as count
        FROM privileges p
        INNER JOIN staff_privileges_override spo ON p.id = spo.privilege_id
        WHERE spo.staff_id = $1 AND spo.is_granted = true AND p.is_active = true
        `,
        [staffId]
      );

      // Get revoked count
      const revokedCount = await queryRunner.query(
        `
        SELECT COUNT(DISTINCT p.id) as count
        FROM privileges p
        INNER JOIN staff_privileges_override spo ON p.id = spo.privilege_id
        WHERE spo.staff_id = $1 AND spo.is_granted = false AND p.is_active = true
        `,
        [staffId]
      );

      // Get unique modules
      const modules = await queryRunner.query(
        `
        SELECT DISTINCT p.module
        FROM privileges p
        WHERE p.is_active = true AND (
          p.id IN (
            SELECT DISTINCT p2.id
            FROM privileges p2
            INNER JOIN privileges_packages pp ON p2.id = pp.privilege_id
            INNER JOIN staff_packages sp ON pp.package_id = sp.package_id
            WHERE sp.staff_id = $1
          )
          OR p.id IN (
            SELECT DISTINCT p2.id
            FROM privileges p2
            INNER JOIN staff_privileges_override spo ON p2.id = spo.privilege_id
            WHERE spo.staff_id = $1 AND spo.is_granted = true
          )
        )
        AND p.id NOT IN (
          SELECT DISTINCT p2.id
          FROM privileges p2
          INNER JOIN staff_privileges_override spo ON p2.id = spo.privilege_id
          WHERE spo.staff_id = $1 AND spo.is_granted = false
        )
        ORDER BY p.module
        `,
        [staffId]
      );

      const privileges = await this.calculateFinalPrivilegeCodes(staffId);

      return {
        total_privileges: privileges.size,
        privileges_from_packages: (packageCount[0]?.count || 0) as number,
        individually_granted: (grantedCount[0]?.count || 0) as number,
        individually_revoked: (revokedCount[0]?.count || 0) as number,
        modules: modules.map((m: Record<string, unknown>) => m.module as string),
      };
    } finally {
      await queryRunner.release();
    }
  }
}

export default PrivilegeCalculationService;
