import { createContext, useContext, useState, useEffect } from "react";

interface GlobalSearchContextType {
  isOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
}

const GlobalSearchContext = createContext<GlobalSearchContextType | undefined>(
  undefined
);

export function useGlobalSearchContext() {
  const context = useContext(GlobalSearchContext);
  if (context === undefined) {
    throw new Error(
      "useGlobalSearchContext must be used within a GlobalSearchProvider"
    );
  }
  return context;
}

interface GlobalSearchProviderProps {
  children: React.ReactNode;
}

export function GlobalSearchProvider({ children }: GlobalSearchProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setIsOpen(true);
      }

      // Close on Escape
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    // Add event listener
    document.addEventListener("keydown", handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const openSearch = () => setIsOpen(true);
  const closeSearch = () => setIsOpen(false);

  const value = {
    isOpen,
    openSearch,
    closeSearch,
  };

  return (
    <GlobalSearchContext.Provider value={value}>
      {children}
    </GlobalSearchContext.Provider>
  );
}
