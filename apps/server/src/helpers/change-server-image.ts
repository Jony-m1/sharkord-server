import { FileSaveType } from '@sharkord/shared';
import { removeFile } from '../db/mutations/files';
import { updateSettings } from '../db/mutations/server';
import { publishSettings } from '../db/publishers';
import { getSettings } from '../db/queries/server';
import { saveReplacementImage } from './change-user-image';

type TServerImageTarget = 'logo' | 'banner';

// saves the new image before removing the old one, so a rejected save leaves the server with
// the image it had rather than with none
const changeServerImage = async (
  userId: number,
  target: TServerImageTarget,
  fileId?: string
) => {
  const isLogo = target === 'logo';
  const settings = await getSettings();
  const previousFileId = isLogo ? settings.logoId : settings.bannerId;

  const nextFileId = await saveReplacementImage(
    userId,
    isLogo ? FileSaveType.SERVER_LOGO : FileSaveType.SERVER_BANNER,
    fileId
  );

  await updateSettings(
    isLogo ? { logoId: nextFileId } : { bannerId: nextFileId }
  );

  if (previousFileId) {
    await removeFile(previousFileId);
  }

  publishSettings();
};

export { changeServerImage };
