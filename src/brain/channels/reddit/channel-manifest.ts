import type { ChannelStatus } from '../channel-registry';

export const channelManifest = {
  id: 'reddit',
  status: 'not_connected' as ChannelStatus,
  specialist: 'reddit',
  label: 'reddit',
} as const;
