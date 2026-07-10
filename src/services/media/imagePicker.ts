import * as ImagePicker from 'expo-image-picker';
import { SelectedImage } from '@/types/media';

const MAX_IMAGE_COUNT = 5;
const MAX_IMAGE_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

type PickImagesResult =
  | {
      status: 'success';
      images: SelectedImage[];
      message?: string;
    }
  | {
      status: 'cancelled' | 'permission-denied' | 'validation-error';
      message?: string;
      images?: SelectedImage[];
    };

const buildSelectedImageId = (asset: ImagePicker.ImagePickerAsset, index: number): string =>
  `${asset.assetId ?? asset.fileName ?? 'image'}-${Date.now()}-${index}`;

const normalizeMimeType = (
  mimeType: string | null | undefined,
  fileName: string | null | undefined,
): string | undefined => {
  if (mimeType && ALLOWED_MIME_TYPES.has(mimeType)) {
    return mimeType;
  }

  const normalizedName = String(fileName ?? '').toLowerCase();
  if (normalizedName.endsWith('.png')) return 'image/png';
  if (normalizedName.endsWith('.webp')) return 'image/webp';
  if (normalizedName.endsWith('.jpg') || normalizedName.endsWith('.jpeg')) return 'image/jpeg';
  return mimeType ?? undefined;
};

const normalizeSelectedImage = (
  asset: ImagePicker.ImagePickerAsset,
  index: number,
  isCover: boolean,
): SelectedImage => ({
  id: buildSelectedImageId(asset, index),
  uri: asset.uri,
  fileName: asset.fileName ?? `tour-image-${Date.now()}-${index}.jpg`,
  mimeType: normalizeMimeType(asset.mimeType, asset.fileName),
  width: asset.width,
  height: asset.height,
  fileSize: asset.fileSize ?? undefined,
  isCover,
});

const validateAssets = (
  assets: ImagePicker.ImagePickerAsset[],
): { isValid: boolean; message?: string } => {
  const invalidMimeAsset = assets.find(asset => {
    const mimeType = normalizeMimeType(asset.mimeType, asset.fileName);
    return !mimeType || !ALLOWED_MIME_TYPES.has(mimeType);
  });

  if (invalidMimeAsset) {
    return {
      isValid: false,
      message: 'Chỉ hỗ trợ ảnh JPEG, PNG hoặc WEBP.',
    };
  }

  const oversizedAsset = assets.find(
    asset => typeof asset.fileSize === 'number' && asset.fileSize > MAX_IMAGE_FILE_SIZE_BYTES,
  );

  if (oversizedAsset) {
    return {
      isValid: false,
      message: 'Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 10MB.',
    };
  }

  return { isValid: true };
};

export const reorderSelectedImages = (
  images: SelectedImage[],
  coverImageId: string,
): SelectedImage[] =>
  images.map(image => ({
    ...image,
    isCover: image.id === coverImageId,
  }));

export const removeSelectedImage = (
  images: SelectedImage[],
  imageId: string,
): SelectedImage[] => {
  const nextImages = images.filter(image => image.id !== imageId);

  if (nextImages.length === 0) {
    return [];
  }

  if (nextImages.some(image => image.isCover)) {
    return nextImages;
  }

  return nextImages.map((image, index) => ({
    ...image,
    isCover: index === 0,
  }));
};

export const pickImagesFromLibrary = async (
  existingImages: SelectedImage[],
): Promise<PickImagesResult> => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    return {
      status: 'permission-denied',
      message: 'Bạn chưa cấp quyền truy cập thư viện ảnh.',
    };
  }

  const remainingSlots = Math.max(MAX_IMAGE_COUNT - existingImages.length, 0);
  if (remainingSlots === 0) {
    return {
      status: 'validation-error',
      message: `Bạn chỉ có thể chọn tối đa ${MAX_IMAGE_COUNT} ảnh.`,
      images: existingImages,
    };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: remainingSlots,
    quality: 0.9,
    orderedSelection: true,
  });

  if (result.canceled) {
    return { status: 'cancelled' };
  }

  const pickedAssets = Array.isArray(result.assets) ? result.assets : [];
  const validationResult = validateAssets(pickedAssets);
  if (!validationResult.isValid) {
    return {
      status: 'validation-error',
      message: validationResult.message,
      images: existingImages,
    };
  }

  const hasCoverImage = existingImages.some(image => image.isCover);
  const nextImages = [
    ...existingImages,
    ...pickedAssets.map((asset, index) =>
      normalizeSelectedImage(asset, index, !hasCoverImage && existingImages.length === 0 && index === 0),
    ),
  ].slice(0, MAX_IMAGE_COUNT);

  const normalizedImages = nextImages.some(image => image.isCover)
    ? nextImages
    : nextImages.map((image, index) => ({
        ...image,
        isCover: index === 0,
      }));

  return {
    status: 'success',
    images: normalizedImages,
    message:
      pickedAssets.length > remainingSlots
        ? `Chỉ giữ tối đa ${MAX_IMAGE_COUNT} ảnh đầu tiên.`
        : undefined,
  };
};

export const MAX_TOUR_IMAGE_COUNT = MAX_IMAGE_COUNT;
