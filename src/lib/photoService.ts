import type { Photo } from '../types/Photo';

// Fallback: usar localStorage si Supabase falla
const STORAGE_KEY = 'photoparty_photos';

function getLocalPhotos(): Photo[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored).map((p: any) => ({
      ...p,
      createdAt: new Date(p.createdAt),
    }));
  } catch {
    return [];
  }
}

function saveLocalPhotos(photos: Photo[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
  } catch (err) {
    console.error('Error saving to localStorage:', err);
  }
}

export async function savePhoto(
  imageBase64: string,
  title?: string
): Promise<Photo | null> {
  try {
    console.log('Saving photo to localStorage...');

    const newPhoto: Photo = {
      id: `local-${Date.now()}-${Math.random()}`,
      imageUrl: imageBase64,
      title: title || undefined,
      createdAt: new Date(),
    };

    const photos = getLocalPhotos();
    photos.unshift(newPhoto);
    saveLocalPhotos(photos);

    console.log('Photo saved successfully to localStorage');
    return newPhoto;
  } catch (err) {
    console.error('Error in savePhoto:', err);
    if (err instanceof Error) {
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
    }
    return null;
  }
}

export async function getPhotos(): Promise<Photo[]> {
  try {
    console.log('Fetching photos from localStorage...');
    const photos = getLocalPhotos();
    console.log('Photos fetched successfully:', photos.length, 'photos');
    return photos;
  } catch (err) {
    console.error('Error in getPhotos:', err);
    if (err instanceof Error) {
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
    }
    return [];
  }
}

export async function deletePhoto(id: string): Promise<boolean> {
  try {
    console.log('Deleting photo from localStorage:', id);
    const photos = getLocalPhotos();
    const filtered = photos.filter((p) => p.id !== id);
    saveLocalPhotos(filtered);
    console.log('Photo deleted successfully');
    return true;
  } catch (err) {
    console.error('Error in deletePhoto:', err);
    return false;
  }
}

export async function updatePhotoTitle(id: string, title: string): Promise<boolean> {
  try {
    console.log('Updating photo title in localStorage:', id);
    const photos = getLocalPhotos();
    const photo = photos.find((p) => p.id === id);
    if (photo) {
      photo.title = title || undefined;
      saveLocalPhotos(photos);
      console.log('Photo title updated successfully');
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error in updatePhotoTitle:', err);
    return false;
  }
}
