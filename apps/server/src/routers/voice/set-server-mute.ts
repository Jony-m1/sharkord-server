import { Permission } from '@sharkord/shared';
import { z } from 'zod';
import { config } from '../../config';
import { getPublicUserById } from '../../db/queries/users';
import { assertCanActOnUser } from '../../helpers/assert-can-act-on-user';
import { isInHiddenVoiceCall } from '../../helpers/is-in-hidden-voice-call';
import { setVoiceServerMute } from '../../helpers/voice-moderation';
import { logger } from '../../logger';
import { invariant } from '../../utils/invariant';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

// the target does not have to be in a call: the mute belongs to the user, not the call, so it
// survives a leave and a rejoin, and lifting it has to work after they left
const setServerMuteRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.moveMembers.maxRequests,
  windowMs: config.rateLimiters.moveMembers.windowMs,
  logLabel: 'setServerMute'
})
  .input(
    z.object({
      userId: z.number().int().positive(),
      muted: z.boolean()
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MOVE_MEMBERS);

    const user = await getPublicUserById(input.userId);

    invariant(user, {
      code: 'NOT_FOUND',
      message: 'User not found'
    });

    // lifting a mute only hands the user their microphone back, wherever they are. a refusal
    // tells nothing new, since every client already hears who is in which call
    if (input.muted) {
      const inHiddenCall = await isInHiddenVoiceCall(ctx, input.userId);

      invariant(!inHiddenCall, {
        code: 'FORBIDDEN',
        message:
          'You cannot server mute someone in a voice channel you cannot see'
      });
    }

    await assertCanActOnUser(ctx.userId, input.userId);

    await setVoiceServerMute(input.userId, input.muted);

    logger.info(
      '%s %s %s',
      ctx.user.name,
      input.muted ? 'server muted' : 'lifted the server mute of',
      user.name
    );
  });

export { setServerMuteRoute };
