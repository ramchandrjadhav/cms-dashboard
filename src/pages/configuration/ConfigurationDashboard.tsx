import React from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import {
  Settings,
  Tag,
  FolderTree,
  ArrowRight,
  Ruler,
  Layout,
  Layers,
  Clock,
} from "lucide-react";

const ConfigurationDashboard = () => {
  const configurationOptions = [
    {
      title: "Attributes",
      description:
        "Create and manage product attributes like color, size, material, etc.",
      href: "/configuration/attributes",
      icon: Tag,
      color: "bg-blue-50 border-blue-200 hover:bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      title: "Category Attributes",
      description:
        "Assign attributes to categories to define product requirements",
      href: "/configuration/category-attributes",
      icon: FolderTree,
      color: "bg-green-50 border-green-200 hover:bg-green-100",
      iconColor: "text-green-600",
    },
    {
      title: "Size Charts",
      description:
        "Manage size charts and measurements for different categories",
      href: "/configuration/size-charts",
      icon: Ruler,
      color: "bg-purple-50 border-purple-200 hover:bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      title: "Tabs",
      description:
        "Create and manage tabs with their sections for better organization",
      href: "/configuration/tabs",
      icon: Layout,
      color: "bg-orange-50 border-orange-200 hover:bg-orange-100",
      iconColor: "text-orange-600",
    },
    {
      title: "Sections",
      description:
        "Create and manage sections with custom fields and field types",
      href: "/configuration/sections",
      icon: Layers,
      color: "bg-indigo-50 border-indigo-200 hover:bg-indigo-100",
      iconColor: "text-indigo-600",
    },
    {
      title: "Shelf Life",
      description:
        "Configure shelf life settings for different product categories",
      href: "/configuration/shelf-life",
      icon: Clock,
      color: "bg-amber-50 border-amber-200 hover:bg-amber-100",
      iconColor: "text-amber-600",
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Configuration"
        description="Manage your store configuration and settings"
      />

      {/* Configuration Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {configurationOptions.map((option, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${option.iconColor}`}>
                  <option.icon className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl">{option.title}</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    {option.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full group">
                <Link
                  to={option.href}
                  className="flex items-center justify-center"
                >
                  Configure
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <Settings className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <h3 className="text-sm font-medium">Configuration Overview</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Use the options above to configure your store's attributes and
                category settings. These settings will affect how products are
                organized and displayed in your catalog.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfigurationDashboard;
