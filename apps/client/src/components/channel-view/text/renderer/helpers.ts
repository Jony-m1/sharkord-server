import type { TJoinedMessage } from '@sharkord/shared';
import { Element, htmlToDOM, Text, type DOMNode } from 'html-react-parser';
import type {
  TFoundMedia,
  TFoundOpenGraph,
  TMessageMetadataLike
} from './types';

const normalizeComparableUrl = (href: string): string => {
  try {
    const url = new URL(href);

    url.hash = '';

    return url.toString();
  } catch {
    return href;
  }
};

const getDisplayHostname = (href: string): string => {
  try {
    return new URL(href).hostname.replace(/^www\./, '');
  } catch {
    return href;
  }
};

const getYoutubeVideoId = (url: URL) => {
  const hostname = url.hostname.replace(/^www\./, '');

  if (hostname === 'youtu.be') {
    return url.pathname.split('/').filter(Boolean)[0] ?? undefined;
  }

  if (!hostname.endsWith('youtube.com')) {
    return undefined;
  }

  const [firstSegment, secondSegment] = url.pathname.split('/').filter(Boolean);

  if (url.pathname === '/watch') {
    return url.searchParams.get('v') ?? undefined;
  }

  if (firstSegment && ['shorts', 'embed', 'v', 'live'].includes(firstSegment)) {
    return secondSegment ?? undefined;
  }

  return undefined;
};

const getYoutubeInfo = (
  href: string
): {
  isYoutube: boolean;
  videoId: string | undefined;
} => {
  try {
    const url = new URL(href);
    const videoId = getYoutubeVideoId(url);

    return { isYoutube: !!videoId, videoId };
  } catch {
    // ignore
  }

  return { isYoutube: false, videoId: undefined };
};

const collectLinkHrefs = (nodes: DOMNode[]): string[] =>
  nodes.flatMap((node) => {
    if (!(node instanceof Element)) return [];

    const childHrefs = collectLinkHrefs(node.children as DOMNode[]);

    if (node.name === 'a' && node.attribs.href) {
      return [node.attribs.href, ...childHrefs];
    }

    return childHrefs;
  });

const extractYoutubeVideoIds = (html: string): string[] => {
  const videoIds = new Set<string>();

  for (const href of collectLinkHrefs(htmlToDOM(html))) {
    const { videoId } = getYoutubeInfo(href);

    if (videoId) {
      videoIds.add(videoId);
    }
  }

  return [...videoIds];
};

const hasSpecializedLinkOverride = (href: string): boolean => {
  const { isYoutube } = getYoutubeInfo(href);

  return isYoutube;
};

type TMediaLinkScan = { mediaLinks: number; otherContent: boolean };

const scanForMediaLinks = (
  nodes: DOMNode[],
  mediaUrls: Set<string>
): TMediaLinkScan =>
  nodes.reduce<TMediaLinkScan>(
    (scan, node) => {
      if (node instanceof Text) {
        return node.data.trim() ? { ...scan, otherContent: true } : scan;
      }

      if (!(node instanceof Element)) return scan;

      if (
        node.name === 'a' &&
        node.attribs.href &&
        mediaUrls.has(normalizeComparableUrl(node.attribs.href))
      ) {
        return { ...scan, mediaLinks: scan.mediaLinks + 1 };
      }

      // an image of its own (a custom emoji) is content the media below does not repeat
      if (node.name === 'img') {
        return { ...scan, otherContent: true };
      }

      const inner = scanForMediaLinks(node.children as DOMNode[], mediaUrls);

      return {
        mediaLinks: scan.mediaLinks + inner.mediaLinks,
        otherContent: scan.otherContent || inner.otherContent
      };
    },
    { mediaLinks: 0, otherContent: false }
  );

// a message that is nothing but links to the media shown under it (a GIF from the picker, a
// pasted image link) shows just the media, as in Discord; the bare link only repeats it
const isMediaLinksOnly = (html: string, media: TFoundMedia[]): boolean => {
  if (!media.length) return false;

  const mediaUrls = new Set(
    media.map((item) => normalizeComparableUrl(item.url))
  );
  const { mediaLinks, otherContent } = scanForMediaLinks(
    htmlToDOM(html),
    mediaUrls
  );

  return mediaLinks > 0 && !otherContent;
};

// media that fails to load (a format the browser cannot decode, a file gone from disk) gives way
// to what it stood in for: the card of its file, and the link it repeated in the text
const getShownMedia = (
  media: TFoundMedia[],
  failedUrls: ReadonlySet<string>
): TFoundMedia[] => {
  if (!failedUrls.size) return media;

  return media.filter((item) => !failedUrls.has(item.url));
};

// a picture or a video already shows its file above the cards, so a card would only repeat it.
// audio keeps its card next to the player, as do documents and archives. given only the media
// that is shown, a file whose media failed keeps its card and with it the way to download it
const getAttachmentFiles = <TAttachment extends { id: number }>(
  files: TAttachment[],
  media: TFoundMedia[]
): TAttachment[] => {
  const inlineFileIds = new Set<number>();

  for (const item of media) {
    if (item.fileId !== undefined && item.type !== 'audio') {
      inlineFileIds.add(item.fileId);
    }
  }

  return files.filter((file) => !inlineFileIds.has(file.id));
};

const DIRECT_MEDIA_TYPES = new Set(['image', 'video', 'audio']);

const isMediaMetadata = (metadata: TMessageMetadataLike | null | undefined) => {
  return !!metadata?.mediaType && DIRECT_MEDIA_TYPES.has(metadata.mediaType);
};

const extractMessageOpenGraph = (
  message: TJoinedMessage,
  media: TFoundMedia[]
): TFoundOpenGraph[] => {
  const directMediaUrls = new Set(
    media.map((item) => normalizeComparableUrl(item.url))
  );
  const seenPreviewUrls = new Set<string>();

  return (message.metadata ?? [])
    .map((metadata, index) => {
      const metadataEntry = metadata as TMessageMetadataLike;

      if (
        !metadataEntry ||
        metadataEntry.kind === 'media' ||
        isMediaMetadata(metadataEntry)
      ) {
        return undefined;
      }

      if (!metadataEntry.url || hasSpecializedLinkOverride(metadataEntry.url)) {
        return undefined;
      }

      const normalizedUrl = normalizeComparableUrl(metadataEntry.url);

      if (seenPreviewUrls.has(normalizedUrl)) {
        return undefined;
      }

      seenPreviewUrls.add(normalizedUrl);

      const imageUrl = (metadataEntry.images ?? []).find((url) => {
        return !directMediaUrls.has(normalizeComparableUrl(url));
      });

      const preview: TFoundOpenGraph = {
        key: `open-graph:${normalizedUrl}:${index}`,
        url: metadataEntry.url,
        hostname: getDisplayHostname(metadataEntry.url),
        title: metadataEntry.title,
        siteName: metadataEntry.siteName,
        description: metadataEntry.description,
        imageUrl,
        faviconUrl: metadataEntry.favicons?.[0]
      };

      const hasRenderableContent =
        !!preview.title ||
        !!preview.siteName ||
        !!preview.description ||
        !!preview.imageUrl ||
        !!preview.faviconUrl;

      return hasRenderableContent ? preview : undefined;
    })
    .filter((item): item is TFoundOpenGraph => !!item);
};

export {
  extractMessageOpenGraph,
  extractYoutubeVideoIds,
  getAttachmentFiles,
  getDisplayHostname,
  getShownMedia,
  getYoutubeInfo,
  getYoutubeVideoId,
  hasSpecializedLinkOverride,
  isMediaLinksOnly,
  normalizeComparableUrl
};
