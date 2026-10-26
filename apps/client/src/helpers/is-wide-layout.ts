// tailwind's lg breakpoint, from which the members and a thread are columns beside the
// conversation. in rem as tailwind's own is, for the reason isPhoneLayout gives
export const WIDE_LAYOUT_QUERY = '(min-width: 64rem)';

export const isWideLayout = () => {
  const mediaQuery = window.matchMedia(WIDE_LAYOUT_QUERY);

  return mediaQuery.matches;
};
