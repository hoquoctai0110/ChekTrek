import { AxiosProgressEvent } from 'axios';
import apiClient from './axios';
import { SelectedImage } from '@/types/media';

export type UploadImagesOptions = {
  onProgress?: (progress: number) => void;
};

export type UploadedImagePayload = {
  coverImageUrl?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  imageUrls?: string[];
};

type ReactNativeFormFile = {
  uri: string;
  name: string;
  type: string;
};
const buildTourImageUploadEndpoint = (tourId: string): string => `/tours/me/${tourId}/images`;

const normalizeUploadUri = (uri: string): string => {
  if (uri.startsWith('file://') || uri.startsWith('content://')) {
    return uri;
  }

  return `file://${uri}`;
};

const normalizeFileName = (image: SelectedImage, index: number): string => {
  const originalName = String(image.fileName ?? '').trim();
  if (originalName) {
    return originalName;
  }

  const mimeType = String(image.mimeType ?? 'image/jpeg');
  const extension = mimeType.includes('png')
    ? 'png'
    : mimeType.includes('webp')
      ? 'webp'
      : 'jpg';

  return `tour-image-${Date.now()}-${index}.${extension}`;
};

const normalizeMimeType = (image: SelectedImage): string => {
  const mimeType = String(image.mimeType ?? '').trim().toLowerCase();
  if (mimeType === 'image/png' || mimeType === 'image/webp' || mimeType === 'image/jpeg') {
    return mimeType;
  }

  const fileName = String(image.fileName ?? '').toLowerCase();
  if (fileName.endsWith('.png')) return 'image/png';
  if (fileName.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
};

const sortImagesForUpload = (images: SelectedImage[]): SelectedImage[] =>
  [...images].sort((firstImage, secondImage) => {
    if (firstImage.isCover === secondImage.isCover) return 0;
    return firstImage.isCover ? -1 : 1;
  });

export const buildImageFormData = (images: SelectedImage[]): FormData => {
  const formData = new FormData();

  sortImagesForUpload(images).forEach((image, index) => {
    formData.append(
      'files',
      ({
        uri: normalizeUploadUri(image.uri),
        name: normalizeFileName(image, index),
        type: normalizeMimeType(image),
      } as ReactNativeFormFile) as unknown as Blob,
    );
  });

  return formData;
};

const parseUploadedImagesPayload = (data: unknown): UploadedImagePayload => {
  const payload = (data as { data?: unknown })?.data ?? data;
  const root = payload as UploadedImagePayload | undefined;

  return {
    coverImageUrl: root?.coverImageUrl,
    thumbnailUrl: root?.thumbnailUrl,
    imageUrl: root?.imageUrl,
    imageUrls: Array.isArray(root?.imageUrls) ? root?.imageUrls : undefined,
  };
};

export const uploadTourImages = async (
  tourId: string,
  images: SelectedImage[],
  options: UploadImagesOptions = {},
): Promise<UploadedImagePayload> => {
  const imageList = Array.isArray(images) ? images.filter(image => image.uri) : [];
  if (imageList.length === 0) {
    return {};
  }

  const endpoint = buildTourImageUploadEndpoint(tourId);
  const formData = buildImageFormData(imageList);
  const response = await apiClient.post(endpoint, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Accept: 'application/json',
    },
    onUploadProgress: (progressEvent: AxiosProgressEvent) => {
      if (!options.onProgress) return;

      const total = progressEvent.total ?? progressEvent.loaded;
      const progress = total > 0 ? progressEvent.loaded / total : 0;
      options.onProgress(Math.max(0, Math.min(progress, 1)));
    },
  });

  options.onProgress?.(1);
  return parseUploadedImagesPayload(response.data);
};
