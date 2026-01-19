import { create } from 'zustand';
import { Category } from '@/types';

interface CategoryFormData {
  name: string;
  description: string;
}

interface CategoryUIStore {
  // Dialog states
  isCreateDialogOpen: boolean;
  isEditDialogOpen: boolean;
  deleteCategoryId: number | null;
  
  // Form state
  formData: CategoryFormData;
  editingCategory: Category | null;
  
  // Search
  searchQuery: string;
  
  // Actions
  openCreateDialog: () => void;
  closeCreateDialog: () => void;
  
  openEditDialog: (category: Category) => void;
  closeEditDialog: () => void;
  
  openDeleteDialog: (id: number) => void;
  closeDeleteDialog: () => void;
  
  setFormData: (data: Partial<CategoryFormData>) => void;
  resetForm: () => void;
  
  setSearchQuery: (query: string) => void;
}

const initialFormData: CategoryFormData = {
  name: '',
  description: '',
};

export const useCategoryUIStore = create<CategoryUIStore>((set) => ({
  // Initial state
  isCreateDialogOpen: false,
  isEditDialogOpen: false,
  deleteCategoryId: null,
  formData: initialFormData,
  editingCategory: null,
  searchQuery: '',
  
  // Dialog actions
  openCreateDialog: () => 
    set({ isCreateDialogOpen: true, formData: initialFormData }),
  
  closeCreateDialog: () => 
    set({ isCreateDialogOpen: false, formData: initialFormData }),
  
  openEditDialog: (category) =>
    set({
      isEditDialogOpen: true,
      editingCategory: category,
      formData: {
        name: category.name,
        description: category.description || '',
      },
    }),
  
  closeEditDialog: () =>
    set({
      isEditDialogOpen: false,
      editingCategory: null,
      formData: initialFormData,
    }),
  
  openDeleteDialog: (id) => set({ deleteCategoryId: id }),
  
  closeDeleteDialog: () => set({ deleteCategoryId: null }),
  
  // Form actions
  setFormData: (data) =>
    set((state) => ({
      formData: { ...state.formData, ...data },
    })),
  
  resetForm: () => set({ formData: initialFormData }),
  
  // Search action
  setSearchQuery: (query) => set({ searchQuery: query }),
}));