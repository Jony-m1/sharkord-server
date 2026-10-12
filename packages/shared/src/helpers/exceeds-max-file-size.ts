import { STORAGE_UNLIMITED_FILE_SIZE } from '../statics/storage';

// a max file size of 0 means no limit, like the per user quota
const exceedsMaxFileSize = (size: number, maxFileSize: number): boolean =>
  maxFileSize !== STORAGE_UNLIMITED_FILE_SIZE && size > maxFileSize;

export { exceedsMaxFileSize };
