import { openDialog, requestConfirmation } from '@/features/dialogs/actions';
import { openServerScreen } from '@/features/server-screens/actions';
import { disconnectFromServer } from '@/features/server/actions';
import { Permission, TestId } from '@sharkord/shared';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@sharkord/ui';
import { ChevronDown } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '../dialogs/dialogs';
import { Protect } from '../protect';
import { ServerScreen } from '../server-screens/screens';

const ServerDropdownMenu = memo(() => {
  const { t } = useTranslation('sidebar');
  const serverSettingsPermissions = useMemo(
    () => [
      Permission.MANAGE_SETTINGS,
      Permission.MANAGE_ROLES,
      Permission.MANAGE_EMOJIS,
      Permission.MANAGE_STORAGE,
      Permission.MANAGE_USERS,
      Permission.MANAGE_INVITES,
      Permission.MANAGE_UPDATES
    ],
    []
  );

  const handleDisconnectClick = useCallback(async () => {
    const confirmed = await requestConfirmation({
      title: t('disconnectConfirmTitle'),
      message: t('disconnectConfirmMsg'),
      confirmLabel: t('disconnect')
    });

    if (confirmed) {
      disconnectFromServer();
    }
  }, [t]);

  const handleAddCategoryClick = useCallback(() => {
    openDialog(Dialog.CREATE_CATEGORY);
  }, []);

  const handleServerSettingsClick = useCallback(() => {
    openServerScreen(ServerScreen.SERVER_SETTINGS);
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          data-testid={TestId.SERVER_MENU_TRIGGER}
          variant="ghost"
          size="icon"
          className="group/server-menu"
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-150 group-data-[state=open]/server-menu:rotate-180 motion-reduce:transition-none" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('server')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <Protect permission={Permission.MANAGE_CATEGORIES}>
          <DropdownMenuItem
            data-testid={TestId.SERVER_MENU_ADD_CATEGORY}
            onClick={handleAddCategoryClick}
          >
            {t('addCategory')}
          </DropdownMenuItem>
        </Protect>
        <Protect permission={serverSettingsPermissions}>
          <DropdownMenuItem
            data-testid={TestId.SERVER_MENU_SERVER_SETTINGS}
            onClick={handleServerSettingsClick}
          >
            {t('serverSettings')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </Protect>
        <DropdownMenuItem
          data-testid={TestId.SERVER_MENU_DISCONNECT}
          onClick={handleDisconnectClick}
          className="text-destructive focus:text-destructive"
        >
          {t('disconnect')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

export { ServerDropdownMenu };
