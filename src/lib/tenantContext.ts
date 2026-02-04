// Tenant context scaffolding for future multi-user/multi-org support
// These constants will be replaced by real auth data when authentication is added

export const CURRENT_ORGANIZATION_ID = 'org_local';
export const CURRENT_USER_ID = 'user_local';

// Helper to get current tenant context
export function getTenantContext() {
  return {
    organization_id: CURRENT_ORGANIZATION_ID,
    user_id: CURRENT_USER_ID,
  };
}
