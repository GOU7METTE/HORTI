import type { ImagePickerAsset } from 'expo-image-picker';

// Structurally compatible with UploadPhoto; contains no filename, EXIF or asset ID.
export type SelectedPhoto = {
  uri: string;
  mimeType?: string;
  fileSize?: number;
};

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_HINT = 'Choose one JPEG or PNG, no larger than 5 MiB. Metadata is only a hint; the server must validate the file before processing.';

type SelectionCheck = { photo: SelectedPhoto; error?: never } | { error: string; photo?: never };

export function checkSelection(asset: ImagePickerAsset): SelectionCheck {
  const mime = asset.mimeType?.toLowerCase().trim();
  const extension = asset.fileName?.split('.').at(-1)?.toLowerCase();
  const hasExtension = Boolean(asset.fileName?.includes('.'));
  if (mime?.includes('heic') || mime?.includes('heif') ||
      (hasExtension && ['heic', 'heif', 'hif'].includes(extension ?? ''))) {
    return { error: 'HEIC/HEIF photos are not supported. Choose a JPEG or PNG instead. HORTI does not convert photos.' };
  }
  const knownMime = mime && mime !== 'application/octet-stream';
  if ((asset.type && asset.type !== 'image') ||
      (knownMime && mime !== 'image/jpeg' && mime !== 'image/png') ||
      (hasExtension && !['jpg', 'jpeg', 'png'].includes(extension ?? ''))) {
    return { error: 'This format is not supported. Choose a JPEG or PNG. HORTI does not convert photos.' };
  }
  const size = typeof asset.fileSize === 'number' && Number.isFinite(asset.fileSize) && asset.fileSize >= 0
    ? asset.fileSize : undefined;
  if (size !== undefined && size > MAX_PHOTO_BYTES) {
    return { error: 'This photo exceeds 5 MiB. Choose a smaller JPEG or PNG.' };
  }
  if (size === 0 || typeof asset.uri !== 'string' || !/^(file|content):\/\//.test(asset.uri)) {
    return { error: 'This photo could not be selected. Choose another JPEG or PNG.' };
  }
  return { photo: { uri: asset.uri, ...(knownMime && asset.mimeType ? { mimeType: asset.mimeType } : {}),
    ...(size !== undefined ? { fileSize: size } : {}) } };
}

export function metadataHint(photo: SelectedPhoto): string {
  return photo.mimeType === undefined || photo.fileSize === undefined
    ? 'Format or size metadata is unavailable. This preview does not prove the photo meets the limits. Server validation is still required.'
    : 'The reported format and size fit the client limits. This does not verify the file contents; server validation is still required.';
}
