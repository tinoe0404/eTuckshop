"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import type { Category } from "@/types/category.types";

interface CategoryListProps {
  categories: Category[];
  selectedId?: number;
  onSelect: (categoryId: number | undefined) => void;
}

export function CategoryList({ categories, selectedId, onSelect }: CategoryListProps) {
  return (
    <div className="space-y-2">
      <Button
        variant={!selectedId ? "default" : "ghost"}
        className="w-full justify-start"
        onClick={() => onSelect(undefined)}
      >
        <Package className="mr-2 h-4 w-4" />
        All Products
      </Button>
      
      {categories.map((category) => (
        <Button
          key={category.id}
          variant={selectedId === category.id ? "default" : "ghost"}
          className="w-full justify-start"
          onClick={() => onSelect(category.id)}
        >
          {category.name}
        </Button>
      ))}
    </div>
  );
}