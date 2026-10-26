import { TestId } from '@sharkord/shared';
import { Button, Spinner } from '@sharkord/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

type TSaveBarProps = {
  isSaving: boolean;
  save: () => Promise<void>;
  discard: () => void;
};

const SaveBar = memo(({ isSaving, save, discard }: TSaveBarProps) => {
  const { t } = useTranslation('settings');

  return (
    <div className="pointer-events-none sticky bottom-4 z-20 px-4 md:px-6">
      <div className="pointer-events-auto mx-auto flex max-w-4xl items-center justify-between gap-4 rounded-xl border bg-card px-4 py-3 shadow-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-150 motion-reduce:animate-none">
        <span className="min-w-0 text-sm font-medium">
          {t('unsavedChanges')}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            data-testid={TestId.SETTINGS_SAVE_BAR_RESET}
            variant="ghost"
            onClick={discard}
            disabled={isSaving}
          >
            {t('resetChanges')}
          </Button>
          <Button onClick={save} disabled={isSaving}>
            {isSaving && <Spinner size="xxs" />}
            {isSaving ? t('saving') : t('saveChanges')}
          </Button>
        </div>
      </div>
    </div>
  );
});

export { SaveBar };
