import { ChannelPermission, Permission, ServerEvents } from '@sharkord/shared';
import { z } from 'zod';
import { getCurrentVoiceRuntime } from '../../helpers/get-current-voice-runtime';
import { VoiceRuntime } from '../../runtimes/voice';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const updateVoiceStateRoute = protectedProcedure
  .input(
    z.object({
      micMuted: z.boolean().optional(),
      soundMuted: z.boolean().optional(),
      webcamEnabled: z.boolean().optional(),
      sharingScreen: z.boolean().optional()
    })
  )
  .mutation(async ({ input, ctx }) => {
    const { runtime, channelId } = await getCurrentVoiceRuntime(ctx);

    const validatedInput = { ...input };

    // produce refuses a screen without the server permission too, and a share it refuses
    // must never reach the rest of the call as live
    const canShareScreenAnywhere = await ctx.hasPermission(
      Permission.SHARE_SCREEN
    );

    const [canSpeak, canUseWebcam, canShareScreenHere] = await Promise.all([
      ctx.hasChannelPermission(channelId, ChannelPermission.SPEAK),
      ctx.hasChannelPermission(channelId, ChannelPermission.WEBCAM),
      ctx.hasChannelPermission(channelId, ChannelPermission.SHARE_SCREEN)
    ]);

    if (!canSpeak) {
      delete validatedInput.micMuted;
    }

    if (!canUseWebcam) {
      delete validatedInput.webcamEnabled;
    }

    if (!canShareScreenAnywhere || !canShareScreenHere) {
      delete validatedInput.sharingScreen;
    }

    invariant(
      validatedInput.micMuted !== false ||
        !VoiceRuntime.isServerMuted(ctx.user.id),
      {
        code: 'FORBIDDEN',
        message: 'You were muted by a moderator.'
      }
    );

    runtime.updateUserState(ctx.user.id, {
      ...validatedInput
    });

    const newState = runtime.getUserState(ctx.user.id);

    ctx.pubsub.publish(ServerEvents.USER_VOICE_STATE_UPDATE, {
      channelId: channelId,
      userId: ctx.user.id,
      state: newState
    });
  });

export { updateVoiceStateRoute };
