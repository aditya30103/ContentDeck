import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import { useSupabase } from '../context/SupabaseProvider';
import { useToast } from '../components/ui/Toast';
import { generateToken, hashToken } from '../lib/tokens';
import type { UserToken } from '../types';

const QUERY_KEY = ['user_tokens'] as const;

export function useTokens() {
  const db = useSupabase();
  const queryClient = useQueryClient();
  const toast = useToast();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await db
        .from('user_tokens')
        .select('id, name, created_at, last_used_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as UserToken[];
    },
  });

  const createToken = useMutation({
    mutationFn: async (name: string = 'Default') => {
      const {
        data: { user },
      } = await db.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const plainToken = generateToken();
      const tokenHash = await hashToken(plainToken);
      const { error } = await db
        .from('user_tokens')
        .insert({ name, token_hash: tokenHash, user_id: user.id });
      if (error) throw error;
      return { plainToken };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Token created');
    },
    onError: (err) => {
      Sentry.captureException(err);
      toast.error('Failed to create token');
    },
  });

  const deleteToken = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('user_tokens').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const prev = queryClient.getQueryData<UserToken[]>(QUERY_KEY);
      queryClient.setQueryData<UserToken[]>(QUERY_KEY, (old) => old?.filter((t) => t.id !== id));
      return { prev };
    },
    onError: (err, _id, context) => {
      Sentry.captureException(err);
      if (context?.prev) queryClient.setQueryData(QUERY_KEY, context.prev);
      toast.error('Failed to delete token');
    },
    onSuccess: () => toast.success('Token revoked'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  return {
    tokens: query.data ?? [],
    isLoading: query.isLoading,
    createToken,
    deleteToken,
  };
}
