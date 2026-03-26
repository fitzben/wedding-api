const BASE = "/api/gallery";

interface SectionsResponse {
  sections: GallerySection[];
}

interface MediaResponse {
  media: GalleryMedia[];
}


export interface GallerySection {
  id: string;
  name: string;
  key: string;
  accepts_video: boolean;
  sort_order: number;
  cover_media_id: string | null;
  media_count: number;
}

export interface GalleryMedia {
  id: string;
  section_id: string;
  public_url: string;
  filename: string;
  content_type: string;
  media_type: "image" | "video";
  caption: string | null;
  sort_order: number;
}

export const getGallerySections = async (): Promise<GallerySection[]> => {
  const res = await fetch(`${BASE}/sections`);
  if (!res.ok) throw new Error("Failed to fetch gallery sections");
  const data = (await res.json()) as SectionsResponse;
  return data.sections ?? [];
};

export const getGalleryMedia = async (
  sectionId: string,
): Promise<GalleryMedia[]> => {
  const res = await fetch(`${BASE}/media?section_id=${sectionId}`);
  if (!res.ok) throw new Error("Failed to fetch gallery media");
  const data = (await res.json()) as MediaResponse;
  return data.media ?? [];
};
