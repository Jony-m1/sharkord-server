import { TestId } from '@sharkord/shared';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

// the version of this client, and of the Continental desktop app when the page runs inside it
// (it leaves its version on window), so anyone can say which build they are on
const ClientVersion = memo(() => {
  const { t } = useTranslation('settings');
  const desktopVersion = window.__continentalVersion;

  return (
    <div
      data-testid={TestId.CLIENT_VERSION}
      className="pointer-events-none fixed bottom-3 right-4 z-10 hidden select-text flex-col items-end text-xs text-muted-foreground/70 lg:flex"
    >
      {desktopVersion && (
        <span>{t('desktopAppVersion', { version: desktopVersion })}</span>
      )}
      <span>{t('clientVersion', { version: VITE_APP_VERSION })}</span>
    </div>
  );
});

export { ClientVersion };
