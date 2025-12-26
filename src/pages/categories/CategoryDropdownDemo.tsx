import React, { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  LevelCategoryDropdown,
  LevelCategory,
} from "@/components/ui/level-category-dropdown";

export default function CategoryDropdownDemo() {
  const [selectedCategory, setSelectedCategory] =
    useState<LevelCategory | null>(null);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Hierarchical Category Dropdown Demo"
        description="Testing the new hierarchical category dropdown component with breadcrumb navigation"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Basic Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Select Category</Label>
              <LevelCategoryDropdown
                value={selectedCategory}
                onValueChange={setSelectedCategory}
                placeholder="Select category (SS-Cat & SSS-Cat only)"
                searchPlaceholder="Search categories..."
                emptyMessage="No SS-Cat or SSS-Cat categories found."
              />
            </div>

            {selectedCategory && (
              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-medium text-sm mb-2">Selected Category:</h4>
                <div className="text-sm space-y-1">
                  <p>
                    <strong>ID:</strong> {selectedCategory.id}
                  </p>
                  <p>
                    <strong>Name:</strong> {selectedCategory.name}
                  </p>
                  {selectedCategory.description && (
                    <p>
                      <strong>Description:</strong>{" "}
                      {selectedCategory.description}
                    </p>
                  )}
                  <p>
                    <strong>Active:</strong>{" "}
                    {selectedCategory.is_active ? "Yes" : "No"}
                  </p>
                  {selectedCategory.parent && (
                    <p>
                      <strong>Parent ID:</strong> {selectedCategory.parent}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">
                  Hierarchical navigation with breadcrumbs
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">
                  Visual indicators for categories with children
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">
                  Search functionality within current level
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">
                  Full path display in trigger button
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">
                  Easy navigation back to root or any level
                </span>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-sm text-blue-900 mb-2">
                How to Use:
              </h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Click the dropdown to see top-level categories</li>
                <li>Categories with children show a right arrow and count</li>
                <li>Click on a category with children to navigate deeper</li>
                <li>Use breadcrumbs to navigate back to any level</li>
                <li>
                  Select a leaf category (no children) to make a selection
                </li>
                <li>Use search to filter categories at the current level</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Response Preview */}
      <Card>
        <CardHeader>
          <CardTitle>API Response Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg font-mono text-sm">
            <pre className="whitespace-pre-wrap">
              {`interface HierarchicalCategory {
  id: string;
  name: string;
  description?: string;
  is_active?: boolean;
  parent?: string;
  children?: HierarchicalCategory[];
}

// Example response from /cms/categories/list/
{
  "results": [
    {
      "id": "1",
      "name": "Home",
      "description": "Home and living items",
      "is_active": true,
      "children": [
        {
          "id": "2", 
          "name": "grocery",
          "description": "Grocery items",
          "is_active": true,
          "children": [
            {
              "id": "3",
              "name": "Fruits & Vegetables",
              "description": "Fresh produce",
              "is_active": true
            }
          ]
        }
      ]
    }
  ]
}`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
