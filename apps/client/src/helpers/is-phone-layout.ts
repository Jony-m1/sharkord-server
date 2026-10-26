// below tailwind's md breakpoint the list and the conversation are two screens; from md up they
// sit side by side and a swipe has nothing to go back to
export const isPhoneLayout = () => {
  const sideBySide = window.matchMedia('(min-width: 768px)');

  return !sideBySide.matches;
};
