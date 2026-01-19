export function useProfile() { return { data: null, isLoading: false }; }
export function useUpdateProfile() { return { mutate: () => { }, isPending: false }; }
export function useChangePassword() { return { mutate: () => { }, isPending: false }; }