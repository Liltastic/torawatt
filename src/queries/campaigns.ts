import { useQuery } from '@tanstack/react-query';

import { campaignsApi } from '@/services/api';

/** Kampanyalar nadiren degisir; her acilista tekrar cekmeye gerek yok. */
export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: campaignsApi.list,
    staleTime: 5 * 60_000,
  });
}
