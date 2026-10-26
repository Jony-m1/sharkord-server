import type { TJoinedSettings, TPublicServerSettings } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { db } from '..';
import { config } from '../../config';
import { files, settings } from '../schema';

// since this is static, we can keep it in memory to avoid querying the DB every time
let token: string;

// the logo and the banner are both rows of files, so one join needs a name of its own
const bannerFiles = alias(files, 'banner_files');

const getSettings = async (): Promise<TJoinedSettings> => {
  const row = await db
    .select({ settings, logo: files, banner: bannerFiles })
    .from(settings)
    .leftJoin(files, eq(files.id, settings.logoId))
    .leftJoin(bannerFiles, eq(bannerFiles.id, settings.bannerId))
    .get();

  if (!row) {
    throw new Error(
      'Server settings not found in database. Something is wrong.'
    );
  }

  if (!token && row.settings.secretToken) {
    token = row.settings.secretToken;
  }

  return {
    ...row.settings,
    logo: row.logo ?? null,
    banner: row.banner ?? null
  };
};

const getPublicSettings: () => Promise<TPublicServerSettings> = async () => {
  const settings = await getSettings();

  const publicSettings: TPublicServerSettings = {
    description: settings.description ?? '',
    name: settings.name,
    serverId: settings.serverId,
    storageUploadEnabled: settings.storageUploadEnabled,
    directMessagesEnabled: settings.directMessagesEnabled,
    storageQuota: settings.storageQuota,
    storageUploadMaxFileSize: settings.storageUploadMaxFileSize,
    storageFileSharingInDirectMessages:
      settings.storageFileSharingInDirectMessages,
    storageMaxAvatarSize: settings.storageMaxAvatarSize,
    storageMaxBannerSize: settings.storageMaxBannerSize,
    storageMaxFilesPerMessage: settings.storageMaxFilesPerMessage,
    storageSpaceQuotaByUser: settings.storageSpaceQuotaByUser,
    storageOverflowAction: settings.storageOverflowAction,
    enablePlugins: settings.enablePlugins,
    webRtcSimulcastEnabled: settings.webRtcSimulcastEnabled,
    webRtcMaxBitrate: config.webRtc.maxBitrate,
    enableSearch: settings.enableSearch,
    showWelcomeDialog: settings.showWelcomeDialog,
    storageSignedUrlsEnabled: settings.storageSignedUrlsEnabled,
    banner: settings.banner
  };

  return publicSettings;
};

const getServerTokenSync = (): string => {
  if (!token) {
    throw new Error('Server token has not been initialized yet');
  }

  return token;
};

const getServerToken = async (): Promise<string> => {
  if (token) return token;

  const { secretToken } = await getSettings();

  if (!secretToken) {
    throw new Error('Secret token not found in database settings');
  }

  token = secretToken;

  return token;
};

export { getPublicSettings, getServerToken, getServerTokenSync, getSettings };
