// components/accounts/tabs/IncomeCategoryTab.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import DeleteConfirmationModal from "@/components/modals/DeleteConfirmationModal";
import { HugeiconsIcon } from "@hugeicons/react";
import { Edit02Icon, PlusSignSquareIcon, Delete02Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { useUser } from "@/hooks/useUser";
import {
  useGetIncomeCategoriesQuery,
  useCreateIncomeCategoryMutation,
  useUpdateIncomeCategoryMutation,
  useDeleteIncomeCategoryMutation,
  IncomeCategory,
} from "@/redux/features/incomeCategory/incomeCategoryApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Default System Categories (read-only for information)
const SYSTEM_INCOME_CATEGORIES = [
  { id: "sys-member-package", title: "Member Package Fee", description: "Default income from member package enrollments", color: "#8B5CF6" },
  { id: "sys-monthly-fee", title: "Monthly Membership Fee", description: "Recurring monthly dues from active members", color: "#3B82F6" },
  { id: "sys-locker-fee", title: "Locker Rental Fee", description: "Revenue from locker assignments and renewals", color: "#F59E0B" },
];

export const IncomeCategoryTab = () => {
  const { activeBranchId } = useUser();

  const { data: categories = [], isLoading } = useGetIncomeCategoriesQuery(
    { branchId: activeBranchId! },
    { skip: !activeBranchId },
  );

  const [createCategory] = useCreateIncomeCategoryMutation();
  const [updateCategory] = useUpdateIncomeCategoryMutation();
  const [deleteCategory] = useDeleteIncomeCategoryMutation();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<IncomeCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<IncomeCategory | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formColor, setFormColor] = useState("#10B981");

  const openCreateModal = () => {
    setFormTitle("");
    setFormDescription("");
    setFormColor("#10B981");
    setIsCreateModalOpen(true);
  };

  const openEditModal = (cat: IncomeCategory) => {
    setCategoryToEdit(cat);
    setFormTitle(cat.title);
    setFormDescription(cat.description || "");
    setFormColor(cat.color || "#10B981");
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBranchId || !formTitle.trim()) return;

    try {
      await createCategory({
        branchId: activeBranchId,
        payload: {
          title: formTitle.trim(),
          description: formDescription.trim(),
          color: formColor,
        },
      }).unwrap();
      setIsCreateModalOpen(false);
      toast.success("Income category created successfully!");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to create income category");
    }
  };

  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBranchId || !categoryToEdit || !formTitle.trim()) return;

    try {
      await updateCategory({
        branchId: activeBranchId,
        categoryId: categoryToEdit._id,
        payload: {
          title: formTitle.trim(),
          description: formDescription.trim(),
          color: formColor,
        },
      }).unwrap();
      setCategoryToEdit(null);
      toast.success("Income category updated successfully!");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update income category");
    }
  };

  const handleDeleteCategory = async () => {
    if (!activeBranchId || !categoryToDelete) return;

    try {
      await deleteCategory({
        branchId: activeBranchId,
        categoryId: categoryToDelete._id,
      }).unwrap();
      setCategoryToDelete(null);
      toast.success("Income category deactivated successfully!");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to deactivate income category");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Custom Income Categories</h3>
          <p className="text-xs text-gray-500">
            Define custom revenue channels such as Owner Investment, Sponsorships, or Asset Sales.
          </p>
        </div>
        <Button
          onClick={openCreateModal}
          className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 cursor-pointer h-10 px-4"
        >
          <HugeiconsIcon icon={PlusSignSquareIcon} size={18} />
          <span>Add Custom Category</span>
        </Button>
      </div>

      {/* System Standard Categories (Protected) */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Default System Income Sources (Fixed)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SYSTEM_INCOME_CATEGORIES.map((sysCat) => (
            <div
              key={sysCat.id}
              className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 flex flex-col justify-between space-y-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: sysCat.color }}
                />
                <span className="font-semibold text-sm text-gray-800">{sysCat.title}</span>
              </div>
              <p className="text-xs text-gray-500">{sysCat.description}</p>
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                System Default
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Categories List */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Branch Custom Income Categories
        </h4>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading custom categories...</div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-xl">
            <p className="text-sm text-gray-500 mb-2">No custom income categories added yet.</p>
            <p className="text-xs text-gray-400 mb-4">
              Click &quot;Add Custom Category&quot; to define custom revenue sources.
            </p>
            <Button
              onClick={openCreateModal}
              variant="outline"
              className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 cursor-pointer"
            >
              Add First Category
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <div
                key={cat._id}
                className="p-4 rounded-xl border border-gray-200 bg-white hover:shadow-md transition-shadow flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color || "#10B981" }}
                      />
                      <span className="font-semibold text-sm text-gray-900">{cat.title}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                      Custom
                    </span>
                  </div>
                  {cat.description ? (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{cat.description}</p>
                  ) : (
                    <p className="text-xs text-gray-400 italic mt-1">No description provided</p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditModal(cat)}
                    className="h-8 px-2 text-gray-600 hover:text-purple hover:bg-purple-50 cursor-pointer"
                  >
                    <HugeiconsIcon icon={Edit02Icon} size={16} />
                    <span className="ml-1 text-xs">Edit</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setCategoryToDelete(cat)}
                    className="h-8 px-2 text-gray-600 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={16} />
                    <span className="ml-1 text-xs">Deactivate</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Add Income Category
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCategory} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Category Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g., Owner Investment, Sponsorship, Asset Sale"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                rows={3}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Brief description of this income channel..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Badge Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
                />
                <span className="text-xs text-gray-500 font-mono">{formColor}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
              >
                Create Category
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!categoryToEdit} onOpenChange={() => setCategoryToEdit(null)}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Edit Income Category
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditCategory} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Category Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                rows={3}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Badge Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
                />
                <span className="text-xs text-gray-500 font-mono">{formColor}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCategoryToEdit(null)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={handleDeleteCategory}
        title="Deactivate Income Category"
        description={`Are you sure you want to deactivate "${categoryToDelete?.title}"? Existing historical payments under this category will remain recorded for accounting and analytics reports.`}
      />
    </div>
  );
};
