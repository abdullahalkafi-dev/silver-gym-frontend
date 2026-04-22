// components/accounts/tabs/ExpenseTab.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreateCategoryModal } from "../modals/CreateCategoryModal";
import { AddSubcategoryModal } from "../modals/AddSubcategoryModal";
import { EditCategoryModal } from "../modals/EditCategoryModal";
import { EditSubcategoryModal } from "../modals/EditSubcategoryModal";
import DeleteConfirmationModal from "@/components/modals/DeleteConfirmationModal";
import { HugeiconsIcon } from "@hugeicons/react";
import { Edit02Icon, PlusSignSquareIcon, Delete02Icon, ArchiveArrowDownIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { ExpenseCategory, ExpenseSubcategory } from "@/types/expense-category";
import { useUser } from "@/hooks/useUser";
import {
  useGetCategoriesByBranchQuery,
  useCreateExpenseCategoryMutation,
  useUpdateExpenseCategoryMutation,
  useDeleteExpenseCategoryMutation,
  useCreateExpenseSubcategoryMutation,
  useUpdateExpenseSubcategoryMutation,
  useDeleteExpenseSubcategoryMutation,
} from "@/redux/features/expense/expenseApi";

export const ExpenseTab = () => {
  const { activeBranchId } = useUser();

  const { data: categories = [], isLoading, isError } = useGetCategoriesByBranchQuery(
    { branchId: activeBranchId! },
    { skip: !activeBranchId },
  );

  const [createCategory] = useCreateExpenseCategoryMutation();
  const [updateCategory] = useUpdateExpenseCategoryMutation();
  const [deleteCategory] = useDeleteExpenseCategoryMutation();
  const [createSubcategory] = useCreateExpenseSubcategoryMutation();
  const [updateSubcategory] = useUpdateExpenseSubcategoryMutation();
  const [deleteSubcategory] = useDeleteExpenseSubcategoryMutation();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
  const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false);
  const [isEditSubcategoryModalOpen, setIsEditSubcategoryModalOpen] = useState(false);
  const [isDeleteCategoryModalOpen, setIsDeleteCategoryModalOpen] = useState(false);
  const [isDeleteSubcategoryModalOpen, setIsDeleteSubcategoryModalOpen] = useState(false);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoryToEdit, setCategoryToEdit] = useState<ExpenseCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<ExpenseCategory | null>(null);
  const [subcategoryToEdit, setSubcategoryToEdit] = useState<ExpenseSubcategory | null>(null);
  const [subcategoryToDelete, setSubcategoryToDelete] = useState<{
    categoryId: string;
    subcategory: ExpenseSubcategory;
  } | null>(null);

  // Auto-select first category when data loads (derived, no effect needed)
  const effectiveCategoryId =
    selectedCategoryId ??
    (categories.length > 0 ? categories[0].id : null);

  const selectedCategory =
    categories.find((c) => c.id === effectiveCategoryId) ?? null;

  // ─── Category Handlers ───────────────────────────────────────────────────

  const handleCreateCategory = async (data: {
    title: string;
    description: string;
    color: string;
  }) => {
    if (!activeBranchId) return;
    try {
      const result = await createCategory({
        branchId: activeBranchId,
        payload: data,
      }).unwrap();
      setSelectedCategoryId(result.id);
      setIsCreateModalOpen(false);
      toast.success("Category created successfully!");
    } catch {
      toast.error("Failed to create category");
    }
  };

  const handleEditCategory = async (data: {
    title: string;
    description: string;
    color: string;
  }) => {
    if (!categoryToEdit || !activeBranchId) return;
    try {
      await updateCategory({
        branchId: activeBranchId,
        categoryId: categoryToEdit.id,
        payload: data,
      }).unwrap();
      setIsEditCategoryModalOpen(false);
      setCategoryToEdit(null);
      toast.success("Category updated successfully!");
    } catch {
      toast.error("Failed to update category");
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete || !activeBranchId) return;
    try {
      await deleteCategory({
        branchId: activeBranchId,
        categoryId: categoryToDelete.id,
      }).unwrap();
      if (effectiveCategoryId === categoryToDelete.id) {
        const remaining = categories.filter((c) => c.id !== categoryToDelete.id);
        setSelectedCategoryId(remaining[0]?.id ?? null);
      }
      setIsDeleteCategoryModalOpen(false);
      setCategoryToDelete(null);
      toast.success("Category deleted successfully!");
    } catch (err: unknown) {
      const msg =
        (err as { data?: { message?: string } })?.data?.message ??
        "Failed to delete category";
      toast.error(msg);
    }
  };

  // ─── Subcategory Handlers ────────────────────────────────────────────────

  const handleAddSubcategory = async (data: { title: string }) => {
    if (!selectedCategory || !activeBranchId) return;
    try {
      await createSubcategory({
        branchId: activeBranchId,
        categoryId: selectedCategory.id,
        payload: data,
      }).unwrap();
      setIsSubcategoryModalOpen(false);
      toast.success("Subcategory added successfully!");
    } catch {
      toast.error("Failed to add subcategory");
    }
  };

  const handleEditSubcategory = async (data: { title: string }) => {
    if (!subcategoryToEdit || !activeBranchId) return;
    try {
      await updateSubcategory({
        branchId: activeBranchId,
        subcategoryId: subcategoryToEdit.id,
        payload: data,
      }).unwrap();
      setIsEditSubcategoryModalOpen(false);
      setSubcategoryToEdit(null);
      toast.success("Subcategory updated successfully!");
    } catch {
      toast.error("Failed to update subcategory");
    }
  };

  const handleDeleteSubcategory = async () => {
    if (!subcategoryToDelete || !activeBranchId) return;
    try {
      await deleteSubcategory({
        branchId: activeBranchId,
        subcategoryId: subcategoryToDelete.subcategory.id,
      }).unwrap();
      setIsDeleteSubcategoryModalOpen(false);
      setSubcategoryToDelete(null);
      toast.success("Subcategory deleted successfully!");
    } catch (err: unknown) {
      const msg =
        (err as { data?: { message?: string } })?.data?.message ??
        "Failed to delete subcategory";
      toast.error(msg);
    }
  };

  const openEditCategoryModal = (category: ExpenseCategory) => {
    setCategoryToEdit(category);
    setIsEditCategoryModalOpen(true);
  };

  const openDeleteCategoryModal = (category: ExpenseCategory) => {
    setCategoryToDelete(category);
    setIsDeleteCategoryModalOpen(true);
  };

  const openEditSubcategoryModal = (subcategory: ExpenseSubcategory) => {
    setSubcategoryToEdit(subcategory);
    setIsEditSubcategoryModalOpen(true);
  };

  const openDeleteSubcategoryModal = (
    categoryId: string,
    subcategory: ExpenseSubcategory,
  ) => {
    setSubcategoryToDelete({ categoryId, subcategory });
    setIsDeleteSubcategoryModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2 bg-gray-primary p-4 rounded-md animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-gray-200 rounded" />
          ))}
        </div>
        <div className="bg-gray-primary p-4 rounded-md animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-gray-200 rounded mb-2" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12 text-red-500">
        Failed to load expense categories. Please try again.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Categories Column */}
      <div className="space-y-4 bg-gray-primary p-4 rounded-md h-full overflow-y-auto">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-text-secondary">All Category&apos;s</h2>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-white hover:bg-purple/10 text-text-primary rounded cursor-pointer"
          >
            <HugeiconsIcon icon={PlusSignSquareIcon} size={20} />
          </Button>
        </div>

        <div className="space-y-2">
          {categories.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">
              No categories yet. Create one to get started.
            </p>
          ) : (
            categories.map((category) => (
              <div
                key={category.id}
                className={`w-full p-3 rounded border transition hover:border-gray-300 ${
                  effectiveCategoryId === category.id
                    ? "bg-purple-50 border-2 border-purple/10"
                    : "bg-white border-none"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => setSelectedCategoryId(category.id)}
                    className="flex-1 text-left cursor-pointer"
                  >
                    <p
                      className={`font-medium ${
                        effectiveCategoryId === category.id
                          ? "text-text-primary"
                          : "text-text-secondary"
                      }`}
                    >
                      {category.title}
                    </p>
                    <p className="text-xs mt-1 text-gray-500">
                      {category.subcategories.length} subcategories
                    </p>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditCategoryModal(category)}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                      title="Edit category"
                    >
                      <HugeiconsIcon icon={Edit02Icon} size={18} className="text-gray-600" />
                    </button>
                    <button
                      onClick={() => openDeleteCategoryModal(category)}
                      className="p-1.5 hover:bg-red-50 rounded transition-colors"
                      title="Delete category"
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={18} className="text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full bg-[#E1E1E1] hover:bg-gray-200 text-text-primary rounded-sm mt-5"
        >
          <HugeiconsIcon icon={PlusSignSquareIcon} size={20} />
          Add New Category
        </Button>
      </div>

      {/* Subcategories Column */}
      <div className="space-y-4">
        {selectedCategory && (
          <div className="bg-gray-primary p-4 rounded-md h-full">
            <h3 className="text-xl font-semibold mb-4 text-text-secondary">
              Expense Subcategory
            </h3>

            {selectedCategory.subcategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-1/2">
                <HugeiconsIcon icon={ArchiveArrowDownIcon} size={40} className="text-gray-600" />
                <p className="text-gray-500 text-sm py-4 text-center">
                  No subcategories yet
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {selectedCategory.subcategories.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between bg-white p-3 rounded"
                  >
                    <span className="text-gray-700">{sub.title}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditSubcategoryModal(sub)}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                        title="Edit subcategory"
                      >
                        <HugeiconsIcon icon={Edit02Icon} size={18} className="text-gray-600" />
                      </button>
                      <button
                        onClick={() =>
                          openDeleteSubcategoryModal(selectedCategory.id, sub)
                        }
                        className="p-1.5 hover:bg-red-50 rounded transition-colors"
                        title="Delete subcategory"
                      >
                        <HugeiconsIcon icon={Delete02Icon} size={18} className="text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={() => setIsSubcategoryModalOpen(true)}
              className="w-full bg-[#E1E1E1] hover:bg-gray-200 text-text-primary rounded-sm mt-5"
            >
              <HugeiconsIcon icon={PlusSignSquareIcon} size={20} />
              Add New Subcategory
            </Button>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateCategoryModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateCategory}
      />

      {categoryToEdit && (
        <EditCategoryModal
          isOpen={isEditCategoryModalOpen}
          onClose={() => {
            setIsEditCategoryModalOpen(false);
            setCategoryToEdit(null);
          }}
          onSubmit={handleEditCategory}
          category={categoryToEdit}
        />
      )}

      {selectedCategory && (
        <AddSubcategoryModal
          isOpen={isSubcategoryModalOpen}
          onClose={() => setIsSubcategoryModalOpen(false)}
          onSubmit={handleAddSubcategory}
          categoryTitle={selectedCategory.title}
        />
      )}

      {subcategoryToEdit && (
        <EditSubcategoryModal
          isOpen={isEditSubcategoryModalOpen}
          onClose={() => {
            setIsEditSubcategoryModalOpen(false);
            setSubcategoryToEdit(null);
          }}
          onSubmit={handleEditSubcategory}
          subcategory={subcategoryToEdit}
          categoryTitle={selectedCategory?.title || ""}
        />
      )}

      <DeleteConfirmationModal
        isOpen={isDeleteCategoryModalOpen}
        onClose={() => {
          setIsDeleteCategoryModalOpen(false);
          setCategoryToDelete(null);
        }}
        onConfirm={handleDeleteCategory}
        title="Delete Category"
        description="Are you sure you want to delete"
        itemName={categoryToDelete?.title || "this category"}
        confirmText="Delete"
        cancelText="Cancel"
      />

      <DeleteConfirmationModal
        isOpen={isDeleteSubcategoryModalOpen}
        onClose={() => {
          setIsDeleteSubcategoryModalOpen(false);
          setSubcategoryToDelete(null);
        }}
        onConfirm={handleDeleteSubcategory}
        title="Delete Subcategory"
        description="Are you sure you want to delete"
        itemName={subcategoryToDelete?.subcategory.title || "this subcategory"}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};
