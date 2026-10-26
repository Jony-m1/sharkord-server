// below tailwind's lg breakpoint the top bar is hidden, and with it the buttons it carries for
// the chat of the call on screen
export const TOP_BAR_HIDDEN_QUERY = '(max-width: 1023.98px)';

// a call's chat is a screen of its own over the call wherever the call and the chat's composer
// do not both fit one above the other. that is a phone, and a phone on its side too: wide
// enough for md, but too short for the call's header, the call and the chat together
export const CALL_CHAT_SCREEN_QUERY =
  '(max-width: 767.98px), (max-width: 1023.98px) and (max-height: 500px)';

export const isCallChatScreenLayout = () => {
  const mediaQuery = window.matchMedia(CALL_CHAT_SCREEN_QUERY);

  return mediaQuery.matches;
};
