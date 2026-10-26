import {
  requestConfirmation,
  requestTextInput
} from '@/features/dialogs/actions';
import { getTRPCClient } from '@/lib/trpc';
import { getTrpcError } from '@sharkord/shared';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TUseModerationActionsOptions = {
  userId: number;
  isDeleted: boolean;
  onChange?: () => void;
};

// every place that moderates someone (the moderation view, the profile card, the users table)
// goes through these, so the prompts, toasts and refreshes stay the same in all of them.
// onChange reloads what the caller fetched about the user; the profile card reads the store,
// which the server's own events keep current, so it passes none
const useModerationActions = ({
  userId,
  isDeleted,
  onChange
}: TUseModerationActionsOptions) => {
  const { t } = useTranslation('settings');

  const kick = useCallback(async () => {
    const reason = await requestTextInput({
      title: t('kickTitle'),
      message: t('kickMsg'),
      confirmLabel: t('kickConfirm'),
      allowEmpty: true
    });

    if (reason === null) return;

    try {
      const trpc = getTRPCClient();

      await trpc.users.kick.mutate({ userId, reason });

      toast.success(t('kickedSuccess'));
    } catch (error) {
      toast.error(getTrpcError(error, t('failedKick')));
    } finally {
      onChange?.();
    }
  }, [userId, onChange, t]);

  const ban = useCallback(async () => {
    if (isDeleted) {
      toast.error(t('cannotBanDeletedUser'));

      return;
    }

    const reason = await requestTextInput({
      title: t('banTitle'),
      message: t('banMsg'),
      confirmLabel: t('banConfirm'),
      allowEmpty: true
    });

    if (reason === null) return;

    try {
      const trpc = getTRPCClient();

      await trpc.users.ban.mutate({ userId, reason });

      toast.success(t('bannedSuccess'));
    } catch (error) {
      toast.error(getTrpcError(error, t('failedBan')));
    } finally {
      onChange?.();
    }
  }, [userId, isDeleted, onChange, t]);

  const unban = useCallback(async () => {
    if (isDeleted) {
      toast.error(t('cannotBanDeletedUser'));

      return;
    }

    const answer = await requestConfirmation({
      title: t('unbanTitle'),
      message: t('unbanMsg'),
      confirmLabel: t('unbanConfirm')
    });

    if (!answer) return;

    try {
      const trpc = getTRPCClient();

      await trpc.users.unban.mutate({ userId });

      toast.success(t('unbannedSuccess'));
    } catch (error) {
      toast.error(getTrpcError(error, t('failedUnban')));
    } finally {
      onChange?.();
    }
  }, [userId, isDeleted, onChange, t]);

  const addRole = useCallback(
    async (roleId: number) => {
      try {
        const trpc = getTRPCClient();

        await trpc.users.addRole.mutate({ userId, roleId });

        toast.success(t('dialogs:roleAssigned'));
      } catch (error) {
        toast.error(getTrpcError(error, t('dialogs:failedAssignRole')));
      } finally {
        onChange?.();
      }
    },
    [userId, onChange, t]
  );

  const removeRole = useCallback(
    async (roleId: number, roleName: string) => {
      const answer = await requestConfirmation({
        title: t('removeRoleTitle'),
        message: t('removeRoleMsg', { roleName }),
        confirmLabel: t('removeRoleConfirm')
      });

      if (!answer) return;

      try {
        const trpc = getTRPCClient();

        await trpc.users.removeRole.mutate({ userId, roleId });

        toast.success(t('roleRemovedSuccess'));
      } catch (error) {
        toast.error(getTrpcError(error, t('failedRemoveRole')));
      } finally {
        onChange?.();
      }
    },
    [userId, onChange, t]
  );

  const moveTo = useCallback(
    async (channelId: number) => {
      try {
        const trpc = getTRPCClient();

        await trpc.voice.moveUser.mutate({ userId, channelId });
      } catch (error) {
        toast.error(getTrpcError(error, t('sidebar:failedMoveUser')));
      }
    },
    [userId, t]
  );

  const disconnect = useCallback(async () => {
    try {
      const trpc = getTRPCClient();

      await trpc.voice.disconnectUser.mutate({ userId });
    } catch (error) {
      toast.error(getTrpcError(error, t('failedDisconnectUser')));
    }
  }, [userId, t]);

  const setServerMute = useCallback(
    async (muted: boolean) => {
      try {
        const trpc = getTRPCClient();

        await trpc.voice.setServerMute.mutate({ userId, muted });
      } catch (error) {
        toast.error(getTrpcError(error, t('failedServerMute')));
      }
    },
    [userId, t]
  );

  return useMemo(
    () => ({
      kick,
      ban,
      unban,
      addRole,
      removeRole,
      moveTo,
      disconnect,
      setServerMute
    }),
    [kick, ban, unban, addRole, removeRole, moveTo, disconnect, setServerMute]
  );
};

export { useModerationActions };
