import { getUserTimeStats } from '../../helpers/time-tracking';
import { protectedProcedure } from '../../utils/trpc';

// your own totals only, so being signed in is the only permission it needs
const getTimeStatsRoute = protectedProcedure.query(async ({ ctx }) => ({
  ...(await getUserTimeStats(ctx.user.id)),
  serverTime: Date.now()
}));

export { getTimeStatsRoute };
