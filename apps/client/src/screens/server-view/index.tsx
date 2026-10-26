import { LeftSidebar } from '@/components/left-sidebar';
import { ModViewSheet } from '@/components/mod-view-sheet';
import { Protect } from '@/components/protect';
import { RightSidebar } from '@/components/right-sidebar';
import { ThreadSidebar } from '@/components/thread-sidebar';
import { TopBar } from '@/components/top-bar';
import { VoiceProvider } from '@/components/voice-provider';
import {
  closeSelectedThread,
  closeVoiceChatSidebar,
  setMembersDrawerOpen
} from '@/features/app/actions';
import {
  useIsMembersDrawerOpen,
  useSelectedDmChannelId,
  useThreadSidebar
} from '@/features/app/hooks';
import { closeMobileContent, setDmsOpen } from '@/features/server/actions';
import { useVisibleVoiceChatChannelId } from '@/features/server/channels/hooks';
import {
  useDmsOpen,
  useIsMobileContentOpen,
  useIsThreadOverConversation,
  usePublicServerSettings
} from '@/features/server/hooks';
import { isPhoneLayout } from '@/helpers/is-phone-layout';
import {
  getLocalStorageItemBool,
  LocalStorageKey,
  setLocalStorageItemBool
} from '@/helpers/storage';
import { useSwipeGestures } from '@/hooks/use-swipe-gestures';
import { cn } from '@/lib/utils';
import { Permission, TestId } from '@sharkord/shared';
import { memo, useCallback, useEffect, useState } from 'react';
import { ContentWrapper } from './content-wrapper';
import { useIsMembersDrawer } from './hooks/use-is-members-drawer';
import { PreventBrowser } from './prevent-browser';

// the list, the members drawer and its overlay move together, on the compositor only, with the
// curve the call's chat slides in with. closeMobileContent waits the same 260ms
const SLIDE_MOTION =
  'duration-[260ms] ease-[cubic-bezier(.32,.72,0,1)] motion-reduce:transition-none';

const ServerView = memo(() => {
  // on a phone the channel list is a full screen of its own, which slides away while a
  // conversation is open and comes back when it is closed
  const isMobileContentOpen = useIsMobileContentOpen();
  const isThreadOverConversation = useIsThreadOverConversation();
  const isMembersDrawer = useIsMembersDrawer();
  const isMembersDrawerOpen = useIsMembersDrawerOpen();
  const [isDesktopRightSidebarOpen, setIsDesktopRightSidebarOpen] = useState(
    getLocalStorageItemBool(LocalStorageKey.RIGHT_SIDEBAR_STATE, true)
  );
  const dmsOpen = useDmsOpen();
  const selectedDmChannelId = useSelectedDmChannelId();
  const publicSettings = usePublicServerSettings();
  const { isOpen: isThreadSidebarOpen } = useThreadSidebar();
  const visibleVoiceChatChannelId = useVisibleVoiceChatChannelId();

  const handleDesktopRightSidebarToggle = useCallback(() => {
    setIsDesktopRightSidebarOpen((prev) => !prev);
    setLocalStorageItemBool(
      LocalStorageKey.RIGHT_SIDEBAR_STATE,
      !isDesktopRightSidebarOpen
    );
  }, [isDesktopRightSidebarOpen]);

  // swiping right goes back a screen (members, then a thread or a call's chat, then the
  // conversation), as on Discord. on a phone the call's chat is a screen of its own over the call
  const handleSwipeRight = useCallback(() => {
    if (isMembersDrawer && isMembersDrawerOpen) {
      setMembersDrawerOpen(false);

      return;
    }

    if (!isMobileContentOpen || !isPhoneLayout()) return;

    // back to the conversation the thread was opened from, as its close button goes
    if (isThreadOverConversation) {
      closeSelectedThread();

      return;
    }

    if (visibleVoiceChatChannelId !== undefined) {
      closeVoiceChatSidebar();

      return;
    }

    closeMobileContent();
  }, [
    isMembersDrawer,
    isMembersDrawerOpen,
    isMobileContentOpen,
    isThreadOverConversation,
    visibleVoiceChatChannelId
  ]);

  const handleSwipeLeft = useCallback(() => {
    // from lg up the members are a column the top bar opens, which a swipe could not close
    if (!isMembersDrawer) return;

    if (isMembersDrawerOpen) {
      setMembersDrawerOpen(false);

      return;
    }

    // on a phone the members belong to a conversation, not to the list
    if (isMobileContentOpen || !isPhoneLayout()) {
      setMembersDrawerOpen(true);
    }
  }, [isMembersDrawer, isMembersDrawerOpen, isMobileContentOpen]);

  const handleMembersOverlayClick = useCallback(() => {
    setMembersDrawerOpen(false);
  }, []);

  const swipeHandlers = useSwipeGestures({
    onSwipeRight: handleSwipeRight,
    onSwipeLeft: handleSwipeLeft
  });

  // setDmsOpen goes back to the channel from before the DMs
  useEffect(() => {
    if (publicSettings?.directMessagesEnabled === false && dmsOpen) {
      setDmsOpen(false);
    }
  }, [publicSettings?.directMessagesEnabled, dmsOpen]);

  return (
    <VoiceProvider>
      <div
        data-testid={TestId.SERVER_VIEW}
        className="flex h-dvh flex-col bg-background text-foreground dark"
        {...swipeHandlers}
      >
        <TopBar
          onToggleRightSidebar={handleDesktopRightSidebarToggle}
          isOpen={isDesktopRightSidebarOpen}
        />
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <PreventBrowser />

          <div
            data-testid={TestId.MEMBERS_OVERLAY}
            className={cn(
              'lg:hidden fixed inset-0 bg-black/50 z-30 transition-opacity',
              SLIDE_MOTION,
              isMembersDrawerOpen
                ? 'opacity-100'
                : 'pointer-events-none opacity-0'
            )}
            onClick={handleMembersOverlayClick}
          />

          <LeftSidebar
            className={cn(
              'md:relative md:flex fixed inset-0 left-0 h-full z-40 md:z-0 max-md:w-full! transition-transform',
              SLIDE_MOTION,
              isMobileContentOpen
                ? '-translate-x-full md:translate-x-0'
                : 'translate-x-0'
            )}
          />

          <ContentWrapper
            isDmMode={dmsOpen}
            selectedDmChannelId={selectedDmChannelId}
          />

          <ThreadSidebar isOpen={isThreadSidebarOpen} />

          <RightSidebar
            className={cn(
              'fixed top-0 bottom-0 right-0 h-full z-40 transition-transform',
              'lg:relative lg:z-0',
              SLIDE_MOTION,
              isMembersDrawerOpen
                ? 'translate-x-0'
                : 'translate-x-full lg:translate-x-0'
            )}
            isOpen={isMembersDrawer || isDesktopRightSidebarOpen}
          />

          <Protect permission={Permission.MANAGE_USERS}>
            <ModViewSheet />
          </Protect>
        </div>
      </div>
    </VoiceProvider>
  );
});

export { ServerView };
