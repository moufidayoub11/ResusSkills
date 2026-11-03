"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Search, Package } from "lucide-react";
import treatmentOptionsData from "@/data/treatment-options.json";

interface TreatmentOption {
  id: string;
  text: string;
}

interface Subcategory {
  id: string;
  name: string;
  options: TreatmentOption[];
}

interface Category {
  id: string;
  name: string;
  subcategories?: Subcategory[];
  options?: TreatmentOption[];
}

interface TreatmentOptionsSelectorProps {
  selectedOptions: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  disabled?: boolean;
}

export function TreatmentOptionsSelector({
  selectedOptions,
  onSelectionChange,
  disabled = false,
}: TreatmentOptionsSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Flatten all options for search
  const allOptions = useMemo(() => {
    const options: Array<TreatmentOption & { categoryName: string; subcategoryName?: string }> = [];
    
    treatmentOptionsData.categories.forEach((category: Category) => {
      if (category.subcategories) {
        category.subcategories.forEach((subcategory) => {
          subcategory.options.forEach((option) => {
            options.push({
              ...option,
              categoryName: category.name,
              subcategoryName: subcategory.name,
            });
          });
        });
      } else if (category.options) {
        category.options.forEach((option) => {
          options.push({
            ...option,
            categoryName: category.name,
          });
        });
      }
    });
    
    return options;
  }, []);

  // Filter options based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return treatmentOptionsData.categories;
    }

    const query = searchQuery.toLowerCase();
    return treatmentOptionsData.categories
      .map((category: Category) => {
        if (category.subcategories) {
          const filteredSubcategories = category.subcategories
            .map((subcategory) => ({
              ...subcategory,
              options: subcategory.options.filter((option) =>
                option.text.toLowerCase().includes(query)
              ),
            }))
            .filter((subcategory) => subcategory.options.length > 0);

          if (filteredSubcategories.length > 0) {
            return { ...category, subcategories: filteredSubcategories };
          }
        } else if (category.options) {
          const filteredOptions = category.options.filter((option) =>
            option.text.toLowerCase().includes(query)
          );
          
          if (filteredOptions.length > 0) {
            return { ...category, options: filteredOptions };
          }
        }
        return null;
      })
      .filter(Boolean) as Category[];
  }, [searchQuery]);

  const handleOptionToggle = (optionId: string) => {
    if (disabled) return;
    
    const newSelection = selectedOptions.includes(optionId)
      ? selectedOptions.filter((id) => id !== optionId)
      : [...selectedOptions, optionId];
    
    onSelectionChange(newSelection);
  };

  const selectedCount = selectedOptions.length;
  const totalCount = allOptions.length;

  return (
    <Card className="border-2 border-purple-200 dark:border-purple-800">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-purple-500" />
            Prise en Charge
          </CardTitle>
          <Badge variant={selectedCount > 0 ? "default" : "secondary"} className="text-sm">
            {selectedCount} / {totalCount} sélectionné{selectedCount > 1 ? "s" : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher un traitement..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            disabled={disabled}
          />
        </div>

        {/* Treatment Options */}
        <ScrollArea className="h-100 pr-4">
          <Accordion type="multiple" className="w-full" defaultValue={treatmentOptionsData.categories.map((c: Category) => c.id)}>
            {filteredCategories.map((category: Category) => (
              <AccordionItem key={category.id} value={category.id}>
                <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span>{category.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {category.subcategories
                        ? category.subcategories.reduce(
                            (sum, sub) =>
                              sum +
                              sub.options.filter((opt) =>
                                selectedOptions.includes(opt.id)
                              ).length,
                            0
                          )
                        : category.options?.filter((opt) =>
                            selectedOptions.includes(opt.id)
                          ).length || 0}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {category.subcategories ? (
                      // Category has subcategories
                      category.subcategories.map((subcategory) => (
                        <div key={subcategory.id} className="space-y-2">
                          <h4 className="text-sm font-medium text-muted-foreground pl-2">
                            {subcategory.name}
                          </h4>
                          <div className="space-y-2 pl-2">
                            {subcategory.options.map((option) => (
                              <div
                                key={option.id}
                                className="flex items-center space-x-2"
                              >
                                <Checkbox
                                  id={option.id}
                                  checked={selectedOptions.includes(option.id)}
                                  onCheckedChange={() =>
                                    handleOptionToggle(option.id)
                                  }
                                  disabled={disabled}
                                />
                                <Label
                                  htmlFor={option.id}
                                  className="text-sm font-normal cursor-pointer leading-tight flex-1"
                                >
                                  {option.text}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      // Category has options directly
                      <div className="space-y-2 pl-2">
                        {category.options?.map((option) => (
                          <div
                            key={option.id}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={option.id}
                              checked={selectedOptions.includes(option.id)}
                              onCheckedChange={() =>
                                handleOptionToggle(option.id)
                              }
                              disabled={disabled}
                            />
                            <Label
                              htmlFor={option.id}
                              className="text-sm font-normal cursor-pointer leading-tight flex-1"
                            >
                              {option.text}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>

        {searchQuery && filteredCategories.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun traitement trouvé pour &quot;{searchQuery}&quot;
          </p>
        )}
      </CardContent>
    </Card>
  );
}
