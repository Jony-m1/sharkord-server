import { describe, expect, test } from 'bun:test';
import { getAttachmentFiles, getShownMedia } from '../helpers';
import type { TFoundMedia } from '../types';

const picture = { id: 1, originalName: 'picture.png' };
const clip = { id: 2, originalName: 'clip.mp4' };
const archive = { id: 3, originalName: 'archive.zip' };
const song = { id: 4, originalName: 'song.mp3' };
const scan = { id: 5, originalName: 'scan.tif' };
const recording = { id: 6, originalName: 'recording.avi' };

const fileMedia = (fileId: number, type: TFoundMedia['type']): TFoundMedia => ({
  key: `file:${fileId}`,
  type,
  url: `https://example.com/files/${fileId}`,
  fileId
});

describe('getAttachmentFiles', () => {
  test('should drop the card of a picture shown inline', () => {
    expect(getAttachmentFiles([picture], [fileMedia(1, 'image')])).toEqual([]);
  });

  test('should drop the card of a video shown inline', () => {
    expect(getAttachmentFiles([clip], [fileMedia(2, 'video')])).toEqual([]);
  });

  test('should keep the card of a file next to a picture', () => {
    expect(
      getAttachmentFiles([picture, archive], [fileMedia(1, 'image')])
    ).toEqual([archive]);
  });

  test('should keep the card of an audio file next to its player', () => {
    expect(getAttachmentFiles([song], [fileMedia(4, 'audio')])).toEqual([song]);
  });

  test('should keep a card when only a link shows the same kind of media', () => {
    const linkedPicture: TFoundMedia = {
      key: 'metadata:image:https://example.com/files/1',
      type: 'image',
      url: 'https://example.com/files/1'
    };

    expect(getAttachmentFiles([picture], [linkedPicture])).toEqual([picture]);
  });

  test('should keep every card when nothing is shown inline', () => {
    expect(getAttachmentFiles([picture, archive], [])).toEqual([
      picture,
      archive
    ]);
  });
});

describe('getShownMedia', () => {
  test('should hand back the same list when nothing failed', () => {
    const media = [fileMedia(1, 'image'), fileMedia(2, 'video')];

    expect(getShownMedia(media, new Set())).toBe(media);
  });

  test('should leave out media that failed to load and keep the rest', () => {
    const pictureMedia = fileMedia(1, 'image');
    const clipMedia = fileMedia(2, 'video');

    expect(
      getShownMedia([pictureMedia, clipMedia], new Set([pictureMedia.url]))
    ).toEqual([clipMedia]);
  });

  test('should give a picture the browser cannot decode its card back', () => {
    const scanMedia = fileMedia(5, 'image');
    const shown = getShownMedia([scanMedia], new Set([scanMedia.url]));

    expect(getAttachmentFiles([scan], shown)).toEqual([scan]);
  });

  test('should give a video the browser cannot play its card back', () => {
    const recordingMedia = fileMedia(6, 'video');
    const shown = getShownMedia(
      [fileMedia(1, 'image'), recordingMedia],
      new Set([recordingMedia.url])
    );

    expect(getAttachmentFiles([picture, recording], shown)).toEqual([
      recording
    ]);
  });
});
