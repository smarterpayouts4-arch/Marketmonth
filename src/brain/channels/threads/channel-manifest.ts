import type { ChannelStatus } from '../channel-registry';

export const channelManifest = {
  id: 'threads',
  status: 'not_connected' as ChannelStatus,
  specialist: 'threads',
  label: 'threads',
} as const;
