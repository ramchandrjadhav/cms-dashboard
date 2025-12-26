import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { TopNavigation } from "./TopNavigation";
import { Sidebar } from "./Sidebar";
import { GlobalSearchRenderer } from "../GlobalSearchRenderer";
import { useThemeStore } from "@/store/theme";
import { useSidebarStore } from "@/store/sidebar";

export function AppLayout() {
  const { theme } = useThemeStore();
  const { isCollapsed } = useSidebarStore();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />
      <div className="flex">
        <Sidebar className="fixed left-0 z-30 top-[var(--header-height)] h-[calc(100vh-var(--header-height))]" />
        <main
          className={
            (isCollapsed ? "ml-20" : "ml-64") +
            " flex-1 overflow-auto transition-all duration-300 ease-in-out pt-[var(--header-height)] px-8 py-10"
          }
        >
          <Outlet />
        </main>
      </div>
      <GlobalSearchRenderer />
    </div>
  );
}
