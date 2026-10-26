import { Card, CardContent, CardHeader, CardTitle } from '@sharkord/ui';
import {
  Activity,
  File,
  Link,
  MessageSquareText,
  type LucideIcon
} from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ModViewScreen, useModViewContext } from '../context';

type TActivityRowProps = {
  view: ModViewScreen;
  icon: LucideIcon;
  label: string;
  count: number;
};

const ActivityRow = memo(
  ({ view, icon: Icon, label, count }: TActivityRowProps) => {
    const { setView } = useModViewContext();

    const handleClick = useCallback(() => {
      setView(view);
    }, [setView, view]);

    return (
      <button
        type="button"
        className="flex w-full items-center justify-between rounded px-1 py-1.5 text-left hover:bg-muted/30"
        onClick={handleClick}
      >
        <span className="flex items-center gap-3">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{label}</span>
        </span>
        <span className="text-sm text-muted-foreground">{count}</span>
      </button>
    );
  }
);

const ServerActivity = memo(() => {
  const { t } = useTranslation('settings');
  const { files, messages, links } = useModViewContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          {t('serverActivityTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <ActivityRow
          view={ModViewScreen.MESSAGES}
          icon={MessageSquareText}
          label={t('serverActivityMessages')}
          count={messages.length}
        />
        <ActivityRow
          view={ModViewScreen.LINKS}
          icon={Link}
          label={t('serverActivityLinks')}
          count={links.length}
        />
        <ActivityRow
          view={ModViewScreen.FILES}
          icon={File}
          label={t('serverActivityFiles')}
          count={files.length}
        />
      </CardContent>
    </Card>
  );
});

export { ServerActivity };
