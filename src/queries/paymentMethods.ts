import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { paymentMethodsApi, type CreatePaymentMethodInput } from '@/services/api';
import type { PaymentMethod } from '@/types/domain';

export const paymentMethodKeys = {
  all: ['payment-methods'] as const,
};

export function usePaymentMethods() {
  return useQuery({
    queryKey: paymentMethodKeys.all,
    queryFn: paymentMethodsApi.list,
  });
}

export function useDefaultPaymentMethod(): PaymentMethod | undefined {
  const { data } = usePaymentMethods();
  return data?.find((m) => m.isDefault) ?? data?.[0];
}

export function useAddPaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePaymentMethodInput) => paymentMethodsApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: paymentMethodKeys.all }),
  });
}

export function useSetDefaultPaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => paymentMethodsApi.setDefault(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: paymentMethodKeys.all }),
  });
}

export function useRemovePaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => paymentMethodsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: paymentMethodKeys.all }),
  });
}
