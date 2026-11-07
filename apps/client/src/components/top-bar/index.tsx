import { ChannelHeaderActions } from '@/components/channel-view/text/channel-header-actions';
import {
  useCurrentVoiceChannelId,
  useIsCurrentVoiceChannelSelected,
  useVisibleVoiceChatChannelId,
  useVoiceViewChannelId
} from '@/features/server/channels/hooks';
import { usePublicServerSettings } from '@/features/server/hooks';
import { TOP_BAR_HIDDEN_QUERY } from '@/helpers/call-chat-layout';
import { getDesktopApi } from '@/helpers/desktop-api';
import { useDesktopServerList } from '@/hooks/use-desktop-server-list';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import { PluginSlot, TestId } from '@sharkord/shared';
import { Button, Tooltip } from '@sharkord/ui';
import {
  PanelLeft,
  PanelLeftClose,
  PanelRight,
  PanelRightClose,
  Settings
} from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PluginSlotRenderer } from '../plugin-slot-renderer';
import { ServerSearch } from './server-search';
import { VoiceButtons } from './voice-buttons';
import { VoiceChatToggle } from './voice-chat-toggle';
import { VoiceChatTopic } from './voice-chat-topic';

type TTopBarProps = {
  onToggleRightSidebar: () => void;
  isOpen: boolean;
};

const TopBar = memo(({ onToggleRightSidebar, isOpen }: TTopBarProps) => {
  const { t } = useTranslation('topbar');
  const isCurrentVoiceChannelSelected = useIsCurrentVoiceChannelSelected();
  const currentVoiceChannelId = useCurrentVoiceChannelId();
  const visibleVoiceChatChannelId = useVisibleVoiceChatChannelId();
  // the chat belongs to the call on screen, whether or not it is the call we are in
  const voiceViewChannelId = useVoiceViewChannelId();
  // below lg the call's header or the chat's own carries the chat's buttons, and a second,
  // hidden copy here would mount its plugin slot twice
  const isHidden = useMediaQuery(TOP_BAR_HIDDEN_QUERY);
  const settings = usePublicServerSettings();
  const {
    isDesktop,
    isVisible: isServerListVisible,
    toggle: toggleServerList
  } = useDesktopServerList();
  const desktopApi = getDesktopApi();
  const ServerListIcon = isServerListVisible ? PanelLeftClose : PanelLeft;
  const serverListLabel = isServerListVisible
    ? t('closeServerList')
    : t('openServerList');

  const handleOpenDesktopSettings = useCallback(() => {
    if (desktopApi) {
      desktopApi.openSettings();
    }
  }, [desktopApi]);

  return (
    <div
      className={cn(
        'h-12 w-full grid-cols-[1fr_minmax(320px,1.4fr)_1fr] items-center border-b border-border bg-card px-4 gap-2',
        isDesktop ? 'grid' : 'hidden lg:grid'
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {isDesktop && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleServerList}
              className="h-7 px-2 transition-all duration-200 ease-in-out"
            >
              <Tooltip content={serverListLabel}>
                <div>
                  <ServerListIcon className="w-4 h-4 transition-transform duration-200 ease-in-out" />
                </div>
              </Tooltip>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenDesktopSettings}
              className="h-7 px-2 transition-all duration-200 ease-in-out"
            >
              <Tooltip content={t('desktopSettings')}>
                <div>
                  <Settings className="w-4 h-4" />
                </div>
              </Tooltip>
            </Button>
          </>
        )}
        {visibleVoiceChatChannelId && (
          <VoiceChatTopic channelId={visibleVoiceChatChannelId} />
        )}
      </div>

      <div className="flex items-center justify-center">
        {settings?.enableSearch && <ServerSearch />}
      </div>

      <div className="flex min-w-0 items-center justify-end gap-2">
        <PluginSlotRenderer slotId={PluginSlot.TOPBAR_RIGHT} />
        {visibleVoiceChatChannelId && !isHidden && (
          <ChannelHeaderActions channelId={visibleVoiceChatChannelId} />
        )}
        {isCurrentVoiceChannelSelected && currentVoiceChannelId && (
          <VoiceButtons currentVoiceChannelId={currentVoiceChannelId} />
        )}
        {voiceViewChannelId && (
          <VoiceChatToggle
            channelId={voiceViewChannelId}
            testId={TestId.VOICE_CHAT_TOGGLE}
          />
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleRightSidebar}
          data-testid={TestId.MEMBERS_TOGGLE}
          className="h-7 px-2 transition-all duration-200 ease-in-out"
        >
          {isOpen ? (
            <Tooltip content={t('closeMembersSidebar')}>
              <div>
                <PanelRightClose className="w-4 h-4 transition-transform duration-200 ease-in-out" />
              </div>
            </Tooltip>
          ) : (
            <Tooltip content={t('openMembersSidebar')}>
              <div>
                <PanelRight className="w-4 h-4 transition-transform duration-200 ease-in-out" />
              </div>
            </Tooltip>
          )}
        </Button>
      </div>
    </div>
  );
});

export { TopBar };
