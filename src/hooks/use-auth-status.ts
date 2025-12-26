import { useAuth } from "@/context/AuthContext";

export const useAuthStatus = () => {
  const { user, isAuthenticated, hasRole, hasGroup, isLoading } = useAuth();

  return {
    user,
    isAuthenticated,
    hasRole,
    hasGroup,
    isLoading,
    // Convenience methods
    isMaster: hasRole("master"),
    isManager: hasRole("manager"),
    isCatalogAdmin: hasGroup("CATALOG_ADMIN"),
    isCatalogEditor: hasGroup("CATALOG_EDITOR"),
    isCatalogViewer: hasGroup("CATALOG_VIEWER"),
    // Check if user has any of the specified groups
    hasAnyGroup: (groups: string[]) => groups.some((group) => hasGroup(group)),
    // Check if user has all of the specified groups
    hasAllGroups: (groups: string[]) =>
      groups.every((group) => hasGroup(group)),
  };
};
