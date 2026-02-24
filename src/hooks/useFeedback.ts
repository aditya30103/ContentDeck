import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '../context/SupabaseProvider';
import { useToast } from '../components/ui/Toast';
import type { FeedbackItem, FeedbackInsert, FeedbackStatus } from '../types';

const QUERY_KEY = ['feedback'] as const;

export function useFeedback() {
  const db = useSupabase();
  const queryClient = useQueryClient();
  const toast = useToast();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await db
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as FeedbackItem[];
    },
  });

  const submitFeedback = useMutation({
    mutationFn: async (payload: FeedbackInsert) => {
      const { error } = await db
        .from('feedback')
        .insert(payload as unknown as Record<string, unknown>);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Feedback submitted');
    },
    onError: () => toast.error('Failed to submit feedback'),
  });

  const updateStatus = useMutation({
    mutationFn: async ({
      id,
      status,
      resolution_note,
    }: {
      id: string;
      status: FeedbackStatus;
      resolution_note?: string;
    }) => {
      const updates: Record<string, unknown> = { status };
      if (resolution_note !== undefined) updates.resolution_note = resolution_note;
      const { error } = await db.from('feedback').update(updates).eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, status, resolution_note }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const prev = queryClient.getQueryData<FeedbackItem[]>(QUERY_KEY);
      queryClient.setQueryData<FeedbackItem[]>(QUERY_KEY, (old) =>
        old?.map((item) =>
          item.id === id
            ? {
                ...item,
                status,
                resolution_note: resolution_note ?? item.resolution_note,
              }
            : item,
        ),
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(QUERY_KEY, context.prev);
      toast.error('Failed to update status');
    },
    onSuccess: () => toast.success('Status updated'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  return {
    feedbackItems: query.data ?? [],
    isLoading: query.isLoading,
    submitFeedback,
    updateStatus,
  };
}
