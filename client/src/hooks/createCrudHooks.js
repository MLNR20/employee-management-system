import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Builds the TanStack Query hooks for one entity from its CRUD use cases.
 * Mutations invalidate everything under the entity's key, so lists and open
 * items refetch on their own after a change.
 *
 * @param {string} key cache key, e.g. "employees"
 * @param {{list: Function, get: Function, add: Function, update: Function, remove: Function}} crud
 */
export const createCrudHooks = (key, crud) => {
  const useInvalidate = () => {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: [key] });
  };

  return {
    useList: () => useQuery({ queryKey: [key], queryFn: crud.list }),

    useOne: (id) =>
      useQuery({ queryKey: [key, id], queryFn: () => crud.get(id), enabled: Boolean(id) }),

    useCreate: () => {
      const invalidate = useInvalidate();
      return useMutation({ mutationFn: crud.add, onSuccess: invalidate });
    },

    useUpdate: () => {
      const invalidate = useInvalidate();
      return useMutation({
        mutationFn: ({ id, data }) => crud.update(id, data),
        onSuccess: invalidate,
      });
    },

    useRemove: () => {
      const invalidate = useInvalidate();
      return useMutation({ mutationFn: crud.remove, onSuccess: invalidate });
    },
  };
};
