import { z } from 'zod';
import { getUserTimeStats } from '../../helpers/time-tracking';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

// anyone signed in may read anyone's totals: the owner chose to show them on every profile
// card, and they say no more than the voice and presence lists already show live
const getTimeStatsRoute = protectedProcedure
  .input(
    z
      .object({
        userId: z.number().int().positive().optional()
      })
      .optional()
  )
  .query(async ({ ctx, input }) => {
    const stats = await getUserTimeStats(input?.userId ?? ctx.user.id);

    invariant(stats, {
      code: 'NOT_FOUND',
      message: 'User not found'
    });

    return { ...stats, serverTime: Date.now() };
  });

export { getTimeStatsRoute };
