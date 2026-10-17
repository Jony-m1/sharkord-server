import { z } from 'zod';
import { config } from '../../config';
import { setAfk } from '../../helpers/afk';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const setAfkRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.setAfk.maxRequests,
  windowMs: config.rateLimiters.setAfk.windowMs,
  logLabel: 'setAfk'
})
  .input(z.object({ afk: z.boolean() }))
  .mutation(async ({ ctx, input }) => {
    await setAfk(ctx.user.id, input.afk);
  });

export { setAfkRoute };
