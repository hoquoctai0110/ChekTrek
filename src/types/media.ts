export type SelectedImage = {
  id: string;
  uri: string;
  fileName?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  isCover: boolean;
};
