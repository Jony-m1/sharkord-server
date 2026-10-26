// below tailwind's md breakpoint the list and the conversation are two screens; from md up they
// sit side by side and a swipe has nothing to go back to. in rem as tailwind's own is: a media
// query reads rem against the browser's default font size, so a px one would part from the css
// for anyone who changed it
export const isPhoneLayout = () => {
  const sideBySide = window.matchMedia('(min-width: 48rem)');

  return !sideBySide.matches;
};
