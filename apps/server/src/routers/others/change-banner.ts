import { Permission } from '@sharkord/shared';
import z from 'zod';
import { changeServerImage } from '../../helpers/change-server-image';
import { protectedProcedure } from '../../utils/trpc';

// the picture across the top of the channel list, as on Discord
const changeBannerRoute = protectedProcedure
  .input(
    z.object({
      fileId: z.string().optional()
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_SETTINGS);

    await changeServerImage(ctx.userId, 'banner', input.fileId);
  });

export { changeBannerRoute };
