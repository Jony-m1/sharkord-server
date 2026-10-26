import { Permission } from '@sharkord/shared';
import z from 'zod';
import { changeServerImage } from '../../helpers/change-server-image';
import { protectedProcedure } from '../../utils/trpc';

const changeLogoRoute = protectedProcedure
  .input(
    z.object({
      fileId: z.string().optional()
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_SETTINGS);

    await changeServerImage(ctx.userId, 'logo', input.fileId);
  });

export { changeLogoRoute };
