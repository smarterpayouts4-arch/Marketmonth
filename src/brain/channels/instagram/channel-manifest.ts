import type { ChannelStatus } from '../channel-registry';

export const channelManifest = {
  id: 'instagram',
  status: 'not_connected' as ChannelStatus,
  specialist: 'instagram',
  label: 'instagram',
} as const;
