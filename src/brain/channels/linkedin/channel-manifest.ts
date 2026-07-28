import type { ChannelStatus } from '../channel-registry';

export const channelManifest = {
  id: 'linkedin',
  status: 'not_connected' as ChannelStatus,
  specialist: 'linkedin',
  label: 'linkedin',
} as const;
