import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Package,
  FolderTree,
  Layers,
  Building,
  GitBranch,
  Users,
  ChevronDown,
  ChevronRight,
  Home,
  Tag,
  Wrench,
  MapPin,
  Brain,
  DollarSign,
  Upload,
  Settings,
  Package2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useSidebarStore } from "@/store/sidebar";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface NavigationItem {
  title: string;
  icon: any;
  href?: string;
  items?: NavigationItem[];
}

const getNavigationItems = (
  hasRole: (role: string) => boolean,
  hasGroup: (group: string) => boolean
) => {
  const canCreateProduct = () => {
    return (
      hasRole("master") ||
      hasGroup("CATALOG_EDITOR") ||
      hasGroup("CATALOG_ADMIN")
    );
  };

  const canAddFacility = () => {
    return hasRole("master");
  };

  const isMaster = () => {
    return hasRole("master");
  };

  const navigation: NavigationItem[] = [
    {
      title: "Dashboard",
      icon: Home,
      href: "/dashboard",
    },
    {
      title: "Products",
      icon: Package,
      items: [
        { title: "Product List", icon: Package, href: "/products/list" },
        {
          title: "Products Rejected",
          icon: Package,
          href: "/products/rejected",
        },
        ...(canCreateProduct()
          ? [
              {
                title: "Create Product",
                icon: Package,
                href: "/products/create",
              },
            ]
          : []),
        // { title: "Archived", icon: Package, href: "/products/archived" },
      ],
    },
    {
      title: "Categories",
      icon: FolderTree,
      items: [
        { title: "Category Tree", icon: FolderTree, href: "/categories/tree" },
      ],
    },
    {
      title: "Collections",
      icon: Layers,
      items: [
        { title: "Collection List", icon: Layers, href: "/collections/list" },
        // { title: "Combos", icon: Layers, href: "/combosandpacks/combos" },
      ],
    },
    {
      title: "Combos",
      icon: Package2,
      href: "/combosandpacks/combos",
      // items: [
      //   { title: "Combos", icon: Package2, href: "/combosandpacks/combos" },
      //   // { title: "Packs", icon: Package2, href: "/combosandpacks/packs" },
      // ],
    },
    {
      title: "Facilities",
      icon: Building,
      items: [
        { title: "Facility List", icon: Building, href: "/facilities/list" },
        // { title: "Map View", icon: Map, href: "/facilities/map" },
        ...(canAddFacility()
          ? [{ title: "Add Facility", icon: Building, href: "/facilities/new" }]
          : []),
      ],
    },
    {
      title: "Clusters",
      icon: GitBranch,
      href: "/clusters/list",
      // items: [
      //   { title: "Cluster List", icon: GitBranch, href: "/clusters/list" },
      //   { title: "Override", icon: GitBranch, href: "/clusters/override" },
      // ],
    },
    {
      title: "Users",
      icon: Users,
      href: "/users/list",
    },
    {
      title: "Brands",
      icon: Tag,
      href: "/brands/list",
    },
    // {
    //   title: 'Assignments',
    //   icon: Users,
    //   items: [
    //     { title: 'Assignment Matrix', icon: Users, href: '/assignments/matrix' },
    //     { title: 'Import', icon: FileText, href: '/assignments/import' },
    //   ],
    // },
    {
      title: "Tax & Pricing",
      icon: DollarSign,
      items: [
        // { title: 'Tax Groups', icon: DollarSign, href: '/tax-pricing/groups' },
        // { title: 'Pricing Rules', icon: DollarSign, href: '/tax-pricing/rules' },
        { title: "Override", icon: DollarSign, href: "/tax-pricing/override" },
        {
          title: "Updated Prices Variants",
          icon: DollarSign,
          href: "/tax-pricing/updated-prices-variants",
        },
      ],
    },
    {
      title: "Tools",
      icon: Wrench,
      items: [
        ...(isMaster()
          ? [
              {
                title: "Polygon Editor",
                icon: MapPin,
                href: "/polygon-editor",
              },
            ]
          : []),
        // { title: "Polygon Editor", icon: MapPin, href: "/polygon-editor" },
        { title: "Upload", icon: Upload, href: "/upload" },
      ],
    },
    ...(isMaster()
      ? [
          {
            title: "Configuration",
            icon: Settings,
            href: "/configuration",
          },
        ]
      : []),
    // {
    //   title: 'Intelligence',
    //   icon: Brain,
    //   items: [
    //     { title: 'Coverage', icon: Brain, href: '/intelligence/coverage' },
    //     { title: 'Simulator', icon: Brain, href: '/intelligence/simulator' },
    //   ],
    // },
    // {
    //   title: "Promotions",
    //   icon: Gift,
    //   items: [
    //     { title: "Discounts", icon: Percent, href: "/promotions/discounts" },
    //     { title: "Vouchers", icon: Ticket, href: "/promotions/vouchers" },
    //     { title: "Campaigns", icon: Megaphone, href: "/promotions/campaigns" },
    //     { title: "Rules", icon: Settings, href: "/promotions/rules" },
    //   ],
    // },
  ];

  return navigation;
};

interface SidebarItemProps {
  item: NavigationItem;
  isCollapsed: boolean;
}

function SidebarItem({ item, isCollapsed }: SidebarItemProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(
    item.items?.some((subItem) => location.pathname === subItem.href) || false
  );

  const Icon = item.icon;

  if (item.href) {
    return (
      <NavLink
        to={item.href}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            isActive
              ? "bg-primary text-primary-foreground"
              : "text-sidebar-foreground"
          )
        }
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!isCollapsed && <span>{item.title}</span>}
      </NavLink>
    );
  }

  if (isCollapsed) {
    const handleClick = () => {
      if (item.items && item.items.length > 0 && item.items[0].href) {
        navigate(item.items[0].href);
      }
    };

    const isActive =
      item.items?.some((subItem) => location.pathname === subItem.href) ||
      false;

    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "w-full justify-start px-3 py-2 transition-all duration-200",
          isActive
            ? "bg-primary text-primary-foreground"
            : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground"
        )}
        asChild
        onClick={item.items ? handleClick : undefined}
      >
        <div>
          <Icon className="h-5 w-5 shrink-0" />
        </div>
      </Button>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between px-3 py-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200"
        >
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">{item.title}</span>
          </div>
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="ml-6 mt-1 space-y-1">
        {item.items?.map((subItem) => (
          <SidebarItem key={subItem.title} item={subItem} isCollapsed={false} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function Sidebar({ className }: { className?: string }) {
  const { isCollapsed } = useSidebarStore();
  const { hasRole, hasGroup } = useAuth();

  const navigation = getNavigationItems(hasRole, hasGroup);

  return (
    <div
      className={cn(
        "border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out",
        isCollapsed ? "w-sidebar-collapsed" : "w-sidebar",
        className
      )}
    >
      <div className="flex h-full flex-col">
        <ScrollArea className="flex-1 px-3 py-4 pt-6">
          <div className="space-y-2">
            {navigation.map((item) => (
              <SidebarItem
                key={item.title}
                item={item}
                isCollapsed={isCollapsed}
              />
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
