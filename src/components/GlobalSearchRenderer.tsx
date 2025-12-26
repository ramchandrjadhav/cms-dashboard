import { GlobalSearchModal } from "./GlobalSearchModal";
import { useGlobalSearchContext } from "./GlobalSearchProvider";

export function GlobalSearchRenderer() {
  const { isOpen, closeSearch } = useGlobalSearchContext();

  return <GlobalSearchModal isOpen={isOpen} onClose={closeSearch} />;
}
