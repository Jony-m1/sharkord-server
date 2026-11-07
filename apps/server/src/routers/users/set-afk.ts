import { z } from 'zod';
import { setAfk } from '../../helpers/afk';
import { protectedProcedure } from '../../utils/trpc';

const setAfkRoute = protectedProcedure
  .input(z.object({ afk: z.boolean() }))
  .mutation(async ({ ctx, input }) => {
    await setAfk(ctx.user.id, input.afk);
  });

export { setAfkRoute };
