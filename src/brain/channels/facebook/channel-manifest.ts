import type { ChannelStatus } from '../channel-registry';

export const channelManifest = {
  id: 'facebook',
  status: 'not_connected' as ChannelStatus,
  specialist: 'facebook',
  label: 'facebook',
} as const;
