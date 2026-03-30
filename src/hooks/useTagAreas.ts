import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import { useSupabase } from '../context/SupabaseProvider';
import { useToast } from '../components/ui/Toast';
import type { TagArea } from '../types';

const QUERY_KEY = ['tagAreas'] as const;

export function useTagAreas() {
  const db = useSupabase();
  const queryClient = useQueryClient();
  const toast = useToast();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await db
        .from('tag_areas')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as TagArea[];
    },
  });

  const createArea = useMutation({
    mutationFn: async (area: {
      name: string;
      description?: string;
      color?: string;
      emoji?: string;
    }) => {
      // Client-side duplicate check
      const existing = query.data ?? [];
      if (existing.some((a) => a.name.toLowerCase() === area.name.trim().toLowerCase())) {
        throw new Error(`Area '${area.name.trim()}' already exists`);
      }
      const maxOrder = existing.reduce((max, a) => Math.max(max, a.sort_order), -1);
      const { data, error } = (await db
        .from('tag_areas')
        .insert({ ...area, sort_order: maxOrder + 1 })
        .select()
        .single()) as { data: TagArea; error: Error | null };
      if (error) throw error;
      return data;
    },
    onSuccess: (newArea) => {
      queryClient.setQueryData<TagArea[]>(QUERY_KEY, (old) =>
        old ? [...old, newArea] : [newArea],
      );
      toast.success('Area created');
    },
    onError: (err) => {
      // Don't send expected duplicate validation errors to Sentry.
      // Supabase returns a plain object (not Error) with code '23505' for unique violations.
      const errObj = err as unknown as Record<string, unknown>;
      const isDuplicate =
        (err instanceof Error && err.message.includes('already exists')) ||
        (typeof err === 'object' && err !== null && errObj.code === '23505');
      if (!isDuplicate) {
        Sentry.captureException(err);
      }
      toast.error(err instanceof Error ? err.message : 'Failed to create area');
    },
  });

  const updateArea = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TagArea> & { id: string }) => {
      const { data, error } = (await db
        .from('tag_areas')
        .update(updates)
        .eq('id', id)
        .select()
        .single()) as { data: TagArea; error: Error | null };
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const prev = queryClient.getQueryData<TagArea[]>(QUERY_KEY);
      queryClient.setQueryData<TagArea[]>(QUERY_KEY, (old) =>
        old?.map((a) => (a.id === id ? { ...a, ...updates } : a)),
      );
      return { prev };
    },
    onError: (err, _vars, context) => {
      Sentry.captureException(err);
      if (context?.prev) queryClient.setQueryData(QUERY_KEY, context.prev);
      toast.error('Update failed');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const deleteArea = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('tag_areas').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const prev = queryClient.getQueryData<TagArea[]>(QUERY_KEY);
      queryClient.setQueryData<TagArea[]>(QUERY_KEY, (old) => old?.filter((a) => a.id !== id));
      return { prev };
    },
    onError: (err, _id, context) => {
      Sentry.captureException(err);
      if (context?.prev) queryClient.setQueryData(QUERY_KEY, context.prev);
      toast.error('Failed to delete area');
    },
    onSuccess: () => toast.success('Area deleted — bookmarks kept, now uncategorized'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const reorderAreas = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      // Update sort_order for each area based on position
      const updates = orderedIds.map((id, index) =>
        db.from('tag_areas').update({ sort_order: index }).eq('id', id),
      );
      const results = await Promise.all(updates);
      const firstError = results.find((r) => r.error);
      if (firstError?.error) throw firstError.error;
    },
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const prev = queryClient.getQueryData<TagArea[]>(QUERY_KEY);
      queryClient.setQueryData<TagArea[]>(QUERY_KEY, (old) => {
        if (!old) return old;
        return orderedIds
          .map((id, index) => {
            const area = old.find((a) => a.id === id);
            return area ? { ...area, sort_order: index } : null;
          })
          .filter((a): a is TagArea => a !== null);
      });
      return { prev };
    },
    onError: (err, _vars, context) => {
      Sentry.captureException(err);
      if (context?.prev) queryClient.setQueryData(QUERY_KEY, context.prev);
      toast.error('Reorder failed');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  return {
    areas: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createArea,
    updateArea,
    deleteArea,
    reorderAreas,
  };
}
