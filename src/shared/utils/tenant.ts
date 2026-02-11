// Tenant context scaffolding for future multi-user/multi-org support
// Эти значения заменятся реальными данными после добавления авторизации.

export const CURRENT_ORGANIZATION_ID = "org_local";
export const CURRENT_USER_ID = "user_local";

/**
 * Единый источник "текущего контекста" (для истории/мульти-организаций).
 * Позже сюда подставим данные из auth.
 */
export function getTenantContext() {
  return {
    organization_id: CURRENT_ORGANIZATION_ID,
    user_id: CURRENT_USER_ID,
  };
}
