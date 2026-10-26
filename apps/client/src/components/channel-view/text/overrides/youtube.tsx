import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { OverrideLayout } from './layout';
import { VideoPlayer } from './video-player';

type TYoutubeOverrideProps = {
  videoId: string;
};

// a thumbnail until clicked, as on Discord: opening a channel full of links then loads no
// youtube embeds at all
const YoutubeOverride = memo(({ videoId }: TYoutubeOverrideProps) => {
  const { t } = useTranslation('common');

  return (
    <OverrideLayout>
      <VideoPlayer
        url={`https://www.youtube.com/watch?v=${videoId}`}
        light={`https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`}
        previewLabel={t('playVideo')}
      />
    </OverrideLayout>
  );
});

export { YoutubeOverride };
