import { useState } from 'react';
import { Trash2, Download, Share2, Image as ImageIcon, Heart, X as CloseIcon } from 'lucide-react';
import type { Photo } from '../types/Photo';
import { toggleLike as toggleLikeService } from '../lib/photoService';

interface PhotoFeedProps {
  photos: Photo[];
  onDelete: (id: string) => void;
  onUpdatePhoto?: (updatedPhoto: Photo) => void;
  currentUser: string;
  viewMode: 'feed' | 'grid';
}

const PlaceholderImage = () => (
  <div className="w-full h-96 glass-effect flex items-center justify-center">
    <div className="text-center">
      <ImageIcon className="mx-auto text-gray-500 mb-3 float" size={56} />
      <p className="text-gray-400 text-sm font-medium">Imagen no disponible</p>
    </div>
  </div>
);

export default function PhotoFeed({ photos, onDelete, onUpdatePhoto, currentUser, viewMode }: PhotoFeedProps) {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isFirstOpen, setIsFirstOpen] = useState(true);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchCurrentX, setTouchCurrentX] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);

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

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setSelectedPhoto(null);
      setIsClosing(false);
      setIsFirstOpen(true);
      setTouchStartX(null);
      setTouchCurrentX(0);
    }, 300);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchCurrentX(e.targetTouches[0].clientX);
    setIsFirstOpen(false);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX !== null) {
      setTouchCurrentX(e.targetTouches[0].clientX);
    }
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || !selectedPhoto) return;

    const deltaX = touchCurrentX - touchStartX;
    const threshold = window.innerWidth * 0.2; // 20% del ancho para cambiar

    if (Math.abs(deltaX) > threshold) {
      const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id);
      if (deltaX > 0 && currentIndex > 0) {
        setSelectedPhoto(photos[currentIndex - 1]);
      } else if (deltaX < 0 && currentIndex < photos.length - 1) {
        setSelectedPhoto(photos[currentIndex + 1]);
      }
    }

    setTouchStartX(null);
    setTouchCurrentX(0);
    setIsDragging(false);
  };

  const swipeOffset = touchStartX !== null ? touchCurrentX - touchStartX : 0;
  const currentPhotoIndex = selectedPhoto ? photos.findIndex(p => p.id === selectedPhoto.id) : -1;

  return (
    <div className="w-full">
      {viewMode === 'feed' ? (
        /* Feed estilo Instagram Premium */
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
                      className="w-full h-auto object-contain max-h-[50vh] md:max-h-[70vh] cursor-zoom-in"
                      loading="lazy"
                      onClick={() => {
                        setIsFirstOpen(true);
                        setSelectedPhoto(photo);
                      }}
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
      ) : (
        /* Album estilo Cuadrícula (Celular) */
        <div className="max-w-4xl mx-auto w-full pt-4 pb-12 px-1">
          <div className="grid grid-cols-3 gap-1 md:gap-2">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="relative aspect-square animate-in zoom-in duration-300 overflow-hidden group"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                {imageErrors.has(photo.id) ? (
                  <div className="w-full h-full glass-effect flex items-center justify-center">
                    <ImageIcon className="text-gray-600" size={24} />
                  </div>
                ) : (
                  <img
                    src={photo.imageUrl}
                    alt={photo.title || 'Foto'}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 cursor-pointer"
                    loading="lazy"
                    onClick={() => {
                      setIsFirstOpen(true);
                      setSelectedPhoto(photo);
                    }}
                    onError={() => handleImageError(photo.id)}
                  />
                )}

                {/* Overlay de likes simple en grid */}
                {(photo.likesCount || 0) > 0 && (
                  <div className="absolute bottom-1 right-1 flex items-center gap-1 bg-black/40 backdrop-blur-md px-1.5 py-0.5 rounded-full text-[10px] text-white">
                    <Heart size={10} fill="red" className="text-red-500" />
                    <span>{photo.likesCount}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedPhoto && (
        <div
          className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden backdrop-blur-lg bg-black/40 transition-all duration-300 ${isClosing ? 'fade-out' : 'animate-in fade-in duration-500'
            }`}
          onClick={handleClose}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Header del Modal */}
          <div className={`absolute top-0 left-0 right-0 p-4 flex justify-between items-center glass-effect-dark z-[110] transition-transform duration-300 ${isClosing ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'
            }`}>
            <div className="flex flex-col">
              <span className="text-white font-bold text-sm">{selectedPhoto.userName || 'PhotoParty'}</span>
              <span className="text-gray-400 text-xs">{formatDateTime(selectedPhoto.createdAt)}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all transform hover:scale-110"
            >
              <CloseIcon size={24} />
            </button>
          </div>

          {/* Contenedor del Carrusel (Slider) */}
          <div
            className="absolute inset-0 flex transition-transform duration-300 ease-out z-[105]"
            style={{
              transform: `translateX(calc(-${currentPhotoIndex * 100}% + ${swipeOffset}px))`,
              transition: isDragging ? 'none' : 'transform 0.3s ease-out'
            }}
          >
            {photos.map((photo, idx) => {
              // Optimizacion: Solo renderizamos el actual y los vecinos para mejor performance
              const isVisible = Math.abs(idx - currentPhotoIndex) <= 1;
              if (!isVisible) return <div key={photo.id} className="min-w-full h-full" />;

              return (
                <div
                  key={photo.id}
                  className="min-w-full h-full flex items-center justify-center p-4 touch-none"
                >
                  <img
                    src={photo.imageUrl}
                    alt={photo.title || 'Foto'}
                    className={`max-w-full max-h-[80vh] object-contain shadow-2xl transition-all duration-300 ${isClosing ? 'zoom-out' : (isFirstOpen && idx === currentPhotoIndex) ? 'animate-in zoom-in-95 duration-500' : ''
                      }`}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              );
            })}
          </div>

          {/* Footer del Modal con Acciones */}
          <div className={`absolute bottom-0 left-0 right-0 p-6 flex justify-center items-center gap-8 glass-effect-dark z-[110] transition-transform duration-300 ${isClosing ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'
            }`}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleLike(selectedPhoto.id);
              }}
              className={`flex flex-col items-center gap-1 transition-all ${selectedPhoto.likedBy?.includes(currentUser) ? 'text-red-500 scale-110' : 'text-gray-400'
                }`}
            >
              <Heart size={28} fill={selectedPhoto.likedBy?.includes(currentUser) ? 'currentColor' : 'none'} />
              <span className="text-xs font-bold">{selectedPhoto.likesCount || 0}</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                sharePhoto(selectedPhoto);
              }}
              className="flex flex-col items-center gap-1 text-gray-400 hover:text-blue-400"
            >
              <Share2 size={28} />
              <span className="text-xs font-bold">Compartir</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                downloadPhoto(selectedPhoto);
              }}
              className="flex flex-col items-center gap-1 text-gray-400 hover:text-green-400"
            >
              <Download size={28} />
              <span className="text-xs font-bold">Descargar</span>
            </button>

            {selectedPhoto.userName === currentUser && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(selectedPhoto.id);
                  handleClose();
                }}
                className="flex flex-col items-center gap-1 text-gray-400 hover:text-red-400"
              >
                <Trash2 size={28} />
                <span className="text-xs font-bold">Eliminar</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
