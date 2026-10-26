import { Permission } from '@sharkord/shared';
import { z } from 'zod';
import { config } from '../../config';
import { getPublicUserById } from '../../db/queries/users';
import { assertCanActOnUser } from '../../helpers/assert-can-act-on-user';
import { isInHiddenVoiceCall } from '../../helpers/is-in-hidden-voice-call';
import { disconnectVoiceUser } from '../../helpers/voice-moderation';
import { logger } from '../../logger';
import { invariant } from '../../utils/invariant';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

// shares the move limiter and permission: taking someone out of a call is the same power as
// moving them, and a separate permission would need labels in every locale
const disconnectUserRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.moveMembers.maxRequests,
  windowMs: config.rateLimiters.moveMembers.windowMs,
  logLabel: 'disconnectUser'
})
  .input(
    z.object({
      userId: z.number().int().positive()
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MOVE_MEMBERS);

    const user = await getPublicUserById(input.userId);

    invariant(user, {
      code: 'NOT_FOUND',
      message: 'User not found'
    });

    const inHiddenCall = await isInHiddenVoiceCall(ctx, input.userId);

    // answered exactly like a user in no call, so nothing about the hidden channel comes back
    invariant(!inHiddenCall, {
      code: 'BAD_REQUEST',
      message: 'User is not in a voice channel'
    });

    await assertCanActOnUser(ctx.userId, input.userId);

    await disconnectVoiceUser(input.userId);

    logger.info('%s disconnected %s from voice', ctx.user.name, user.name);
  });

export { disconnectUserRoute };
