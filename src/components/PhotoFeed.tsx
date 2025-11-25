import { useState } from 'react';
import { Trash2, Download, Share2, Image as ImageIcon, Package, Heart, MessageCircle } from 'lucide-react';
import type { Photo } from '../types/Photo';

interface PhotoFeedProps {
  photos: Photo[];
  onDelete: (id: string) => void;
}

const PlaceholderImage = () => (
  <div className="w-full h-96 glass-effect flex items-center justify-center">
    <div className="text-center">
      <ImageIcon className="mx-auto text-gray-500 mb-3 float" size={56} />
      <p className="text-gray-400 text-sm font-medium">Imagen no disponible</p>
    </div>
  </div>
);

export default function PhotoFeed({ photos, onDelete }: PhotoFeedProps) {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [likedPhotos, setLikedPhotos] = useState<Set<string>>(new Set());

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

  const toggleLike = (photoId: string) => {
    setLikedPhotos((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
  };

  const downloadPhoto = (photo: Photo) => {
    try {
      const link = document.createElement('a');
      link.href = photo.imageUrl;
      link.download = `photoparty-${photo.id}-${photo.createdAt.getTime()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error downloading photo:', err);
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

  const exportAllPhotos = async () => {
    if (photos.length === 0) return;

    setIsExporting(true);
    try {
      if (photos.length === 1) {
        downloadPhoto(photos[0]);
        setIsExporting(false);
        return;
      }

      for (let i = 0; i < photos.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        downloadPhoto(photos[i]);
      }
    } catch (err) {
      console.error('Error exporting photos:', err);
    } finally {
      setIsExporting(false);
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
    <div className="flex-1 overflow-y-auto">
      {/* Botones de acción */}
      {photos.length > 1 && (
        <div className="sticky top-0 z-20 glass-effect-dark border-b border-white/5 px-4 py-3 flex gap-3 slide-in-from-top">
          <button
            onClick={exportAllPhotos}
            disabled={isExporting}
            className="flex-1 btn-secondary text-white px-4 py-3 rounded-xl hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2 font-semibold text-sm disabled:opacity-50"
          >
            <Package size={18} />
            <span>Exportar Todas</span>
          </button>
        </div>
      )}

      {/* Feed estilo Instagram Premium */}
      <div className="max-w-2xl mx-auto w-full pb-6">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="mb-6 animate-in slide-in-from-bottom-4"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Card con glassmorphism */}
            <div className="glass-effect rounded-2xl overflow-hidden border border-white/10 shadow-2xl hover:shadow-purple-500/20 transition-all duration-300">
              {/* Header de la foto */}
              <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white shadow-lg">
                    📸
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">PhotoParty</p>
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
                    className="w-full h-auto object-contain max-h-[70vh]"
                    loading="lazy"
                    onError={() => handleImageError(photo.id)}
                  />
                )}
              </div>

              {/* Controles */}
              <div className="px-4 py-3">
                {/* Botones de acción principales */}
                <div className="flex items-center gap-4 mb-3">
                  <button
                    onClick={() => toggleLike(photo.id)}
                    className={`transition-all duration-200 ${likedPhotos.has(photo.id)
                        ? 'text-red-500 scale-110'
                        : 'text-gray-400 hover:text-red-400 hover:scale-110'
                      }`}
                    aria-label="Me gusta"
                  >
                    <Heart
                      size={24}
                      fill={likedPhotos.has(photo.id) ? 'currentColor' : 'none'}
                      className="transition-all"
                    />
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

                  <button
                    onClick={() => onDelete(photo.id)}
                    className="text-gray-400 hover:text-red-400 transition-all duration-200 hover:scale-110"
                    title="Eliminar"
                    aria-label="Eliminar foto"
                  >
                    <Trash2 size={22} />
                  </button>
                </div>

                {/* Título si existe */}
                {photo.title && (
                  <p className="text-white text-sm font-medium mb-2 break-words">
                    <span className="font-bold">PhotoParty</span> {photo.title}
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
