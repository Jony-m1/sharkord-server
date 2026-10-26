import { WIDE_LAYOUT_QUERY } from '@/helpers/is-wide-layout';
import { useMediaQuery } from '@/hooks/use-media-query';

// below tailwind's lg breakpoint the members are a drawer that slides over the conversation and
// stays mounted so it can slide out again, from lg up a column beside it that the top bar opens
export const useIsMembersDrawer = () => {
  const isWideLayout = useMediaQuery(WIDE_LAYOUT_QUERY);

  return !isWideLayout;
};
