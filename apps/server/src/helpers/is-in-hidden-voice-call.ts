import { ChannelPermission } from '@sharkord/shared';
import { VoiceRuntime } from '../runtimes/voice';
import type { Context } from '../utils/trpc';

// a disconnect or a server mute is aimed at a user but lands in the call they are in, so a
// moderator must not be able to reach into a channel they cannot see through one
const isInHiddenVoiceCall = async (ctx: Context, userId: number) => {
  const runtime = VoiceRuntime.findRuntimeByUserId(userId);

  if (!runtime) return false;

  const canSeeCall = await ctx.hasChannelPermission(
    runtime.id,
    ChannelPermission.VIEW_CHANNEL
  );

  return !canSeeCall;
};

export { isInHiddenVoiceCall };
