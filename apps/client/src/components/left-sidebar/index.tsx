import { ResizableSidebar } from '@/components/resizable-sidebar';
import { setSelectedChannelId } from '@/features/server/channels/actions';
import {
  useDmsOpen,
  usePublicServerSettings,
  useServerName
} from '@/features/server/hooks';
import { useThreadsOpen } from '@/features/server/threads/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import { LocalStorageKey } from '@/helpers/storage';
import { cn } from '@/lib/utils';
import { TestId } from '@sharkord/shared';
import { memo, useCallback } from 'react';
import { Categories } from './categories';
import { DirectMessages } from './direct-messages';
import { DmButton } from './direct-messages/dm-button';
import { useFollowVoiceMove, useRestoreLastSelectedChannel } from './hooks';
import { PluginButtons } from './plugin-buttons';
import { ServerDropdownMenu } from './server-dropdown';
import { Threads } from './threads';
import { ThreadsButton } from './threads/threads-button';
import { UserControl } from './user-control';
import { VoiceControl } from './voice-control';

const MIN_WIDTH = 200;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 288; // w-72 = 288px

type TLeftSidebarProps = {
  className?: string;
};

const LeftSidebar = memo(({ className }: TLeftSidebarProps) => {
  const serverName = useServerName();
  const dmsOpen = useDmsOpen();
  const threadsOpen = useThreadsOpen();
  const publicSettings = usePublicServerSettings();
  // across the top with the name over it, as on Discord. the name and the menu keep their own 48px
  // row at the top either way, so they share a centre line with each other and the channel header
  const bannerUrl = getFileUrl(publicSettings?.banner);

  useRestoreLastSelectedChannel();
  useFollowVoiceMove();

  const handleServerNameClick = useCallback(() => {
    setSelectedChannelId(undefined);
  }, []);

  let content = <Categories />;

  if (threadsOpen) {
    content = <Threads />;
  } else if (dmsOpen) {
    content = <DirectMessages />;
  }

  return (
    <ResizableSidebar
      storageKey={LocalStorageKey.LEFT_SIDEBAR_WIDTH}
      minWidth={MIN_WIDTH}
      maxWidth={MAX_WIDTH}
      defaultWidth={DEFAULT_WIDTH}
      edge="right"
      className={cn('h-full', className)}
      data-testid={TestId.LEFT_SIDEBAR}
    >
      <div
        data-testid={TestId.SERVER_HEADER}
        className={cn(
          'relative w-full shrink-0 border-b border-border',
          bannerUrl ? 'h-36' : 'h-12'
        )}
      >
        {bannerUrl && (
          <>
            <img
              src={bannerUrl}
              alt=""
              data-testid={TestId.SERVER_BANNER}
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-black/15 to-transparent" />
          </>
        )}
        <div className="relative flex h-12 items-center justify-between px-4">
          <h2
            className={cn(
              'min-w-0 font-semibold text-foreground truncate cursor-pointer',
              bannerUrl && 'text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]'
            )}
            onClick={handleServerNameClick}
            data-testid={TestId.LEFT_SIDEBAR_SERVER_NAME}
          >
            {serverName}
          </h2>
          <div className="relative shrink-0">
            <ServerDropdownMenu />
          </div>
        </div>
      </div>
      <div className="space-y-0.5 border-b border-border px-2 py-2">
        {publicSettings?.directMessagesEnabled && <DmButton />}
        <ThreadsButton />
      </div>
      <PluginButtons />
      <div className="flex-1 overflow-y-auto">{content}</div>
      <VoiceControl />
      <UserControl />
    </ResizableSidebar>
  );
});

export { LeftSidebar };
