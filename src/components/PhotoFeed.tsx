import { useState } from 'react';
import { Trash2, Download, Share2, Image as ImageIcon, Heart } from 'lucide-react';
import type { Photo } from '../types/Photo';
import { toggleLike as toggleLikeService } from '../lib/photoService';

interface PhotoFeedProps {
  photos: Photo[];
  onDelete: (id: string) => void;
  onUpdatePhoto?: (updatedPhoto: Photo) => void;
  currentUser: string;
}

const PlaceholderImage = () => (
  <div className="w-full h-96 glass-effect flex items-center justify-center">
    <div className="text-center">
      <ImageIcon className="mx-auto text-gray-500 mb-3 float" size={56} />
      <p className="text-gray-400 text-sm font-medium">Imagen no disponible</p>
    </div>
  </div>
);

export default function PhotoFeed({ photos, onDelete, onUpdatePhoto, currentUser }: PhotoFeedProps) {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const formatDateTime = (date: Date) => {
    const now = new Date();
    const photoDate = new Date(date);
    const diffMs = now.getTime() - photoDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) {
      if (diffMins < 1) return 'Ahora';
      if (diffMins < 60) return `Hace ${diffMins}m`;
      if (diffHours < 24) return `Hace ${diffHours}h`;
    }

    return photoDate.toLocaleString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleImageError = (photoId: string) => {
    setImageErrors((prev) => new Set(prev).add(photoId));
  };

  const toggleLike = async (photoId: string) => {
    console.log(`[PhotoFeed] toggleLike called for photo: ${photoId}`);
    if (!currentUser) {
      console.warn('[PhotoFeed] No user found');
      return;
    }

    const photo = photos.find(p => p.id === photoId);
    if (!photo) return;

    // Optimistic Update
    const isLiked = photo.likedBy?.includes(currentUser);
    const newLikedBy = isLiked
      ? (photo.likedBy || []).filter(u => u !== currentUser)
      : [...(photo.likedBy || []), currentUser];
    const newLikesCount = isLiked
      ? Math.max(0, (photo.likesCount || 0) - 1)
      : (photo.likesCount || 0) + 1;

    if (onUpdatePhoto) {
      onUpdatePhoto({
        ...photo,
        likesCount: newLikesCount,
        likedBy: newLikedBy
      });
    }

    try {
      const success = await toggleLikeService(photoId, currentUser);
      if (!success) {
        console.error('[PhotoFeed] toggleLikeService returned false');
        // Revert optimistic update if needed (will be handled by real-time sync eventually, 
        // but for now it helps pinpoint errors)
      }
    } catch (error) {
      console.error('[PhotoFeed] Error in toggleLikeService:', error);
    }
  };

  const downloadPhoto = async (photo: Photo) => {
    try {
      const response = await fetch(photo.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `photoparty-${photo.id}-${photo.createdAt.getTime()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading photo:', err);
      // Fallback simple download
      const link = document.createElement('a');
      link.href = photo.imageUrl;
      link.target = '_blank';
      link.download = `photoparty-${photo.id}.jpg`;
      link.click();
    }
  };

  const sharePhoto = async (photo: Photo) => {
    try {
      const response = await fetch(photo.imageUrl);
      const blob = await response.blob();
      const file = new File([blob], `photoparty-${photo.id}.jpg`, { type: 'image/jpeg' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: photo.title || 'Foto de PhotoParty',
        });
      } else {
        downloadPhoto(photo);
      }
    } catch (err) {
      downloadPhoto(photo);
    }
  };

  if (photos.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center py-20 px-4">
        <div className="text-center max-w-md">
          <div className="relative inline-block mb-6">
            <ImageIcon className="text-gray-600 float" size={80} />
            <div className="absolute inset-0 blur-2xl bg-purple-500/20 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">
            Tu galería está vacía
          </h2>
          <p className="text-gray-400 text-base">
            Captura tu primera foto y comienza a crear recuerdos increíbles
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Feed estilo Instagram Premium */}
      <div className="max-w-2xl mx-auto w-full pt-6 pb-6 px-4">

        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="mb-4 md:mb-6 animate-in slide-in-from-bottom-4"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Card con glassmorphism */}
            <div className="glass-effect rounded-2xl overflow-hidden border border-white/10 shadow-2xl hover:shadow-purple-500/20 transition-all duration-300">
              {/* Header de la foto */}
              <div className="px-3 py-2 md:px-4 md:py-3 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-white font-semibold text-sm">{photo.userName || 'PhotoParty'}</p>
                    <p className="text-gray-400 text-xs">{formatDateTime(photo.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Imagen */}
              <div className="relative w-full bg-black/50">
                {imageErrors.has(photo.id) ? (
                  <PlaceholderImage />
                ) : (
                  <img
                    src={photo.imageUrl}
                    alt={photo.title || 'Foto'}
                    className="w-full h-auto object-contain max-h-[50vh] md:max-h-[70vh]"
                    loading="lazy"
                    onError={() => handleImageError(photo.id)}
                  />
                )}
              </div>

              {/* Controles */}
              <div className="px-3 py-2 md:px-4 md:py-3">
                {/* Botones de acción principales */}
                <div className="flex items-center gap-4 mb-3">
                  <button
                    onClick={() => toggleLike(photo.id)}
                    className={`flex items-center gap-1.5 transition-all duration-200 ${photo.likedBy?.includes(currentUser)
                      ? 'text-red-500 scale-110'
                      : 'text-gray-400 hover:text-red-400 hover:scale-110'
                      }`}
                    aria-label="Me gusta"
                  >
                    <Heart
                      size={24}
                      fill={photo.likedBy?.includes(currentUser) ? 'currentColor' : 'none'}
                      className="transition-all"
                    />
                    {photo.likesCount !== undefined && photo.likesCount > 0 && (
                      <span className="text-sm font-bold">{photo.likesCount}</span>
                    )}
                  </button>

                  <button
                    onClick={() => sharePhoto(photo)}
                    className="text-gray-400 hover:text-blue-400 transition-all duration-200 hover:scale-110"
                    title="Compartir"
                    aria-label="Compartir foto"
                  >
                    <Share2 size={24} />
                  </button>

                  <button
                    onClick={() => downloadPhoto(photo)}
                    className="text-gray-400 hover:text-green-400 transition-all duration-200 hover:scale-110"
                    title="Descargar"
                    aria-label="Descargar foto"
                  >
                    <Download size={24} />
                  </button>

                  <div className="flex-1" />

                  {photo.userName === currentUser && (
                    <button
                      onClick={() => onDelete(photo.id)}
                      className="text-gray-400 hover:text-red-400 transition-all duration-200 hover:scale-110"
                      title="Eliminar"
                      aria-label="Eliminar foto"
                    >
                      <Trash2 size={22} />
                    </button>
                  )}
                </div>

                {/* Título si existe */}
                {photo.title && (
                  <p className="text-white text-sm font-medium mb-2 break-words">
                    <span className="font-bold">{photo.userName || 'PhotoParty'}</span> {photo.title}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
