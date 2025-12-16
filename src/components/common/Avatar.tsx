import React from 'react';

const getInitials = (name: string | undefined | null): string => {
  if (!name || name === 'undefined' || name === 'null') {
    return '?';
  }
  const trimmed = String(name).trim();
  if (!trimmed || trimmed.length === 0) {
    return '?';
  }
  const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) {
    return '?';
  }
  if (words.length === 1) {
    return words[0][0]?.toUpperCase() || '?';
  }
  return words.map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?';
};

interface AvatarProps {
  src: string | undefined | null;
  name: string;
  fallbackClass?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ src, name, fallbackClass }) => {
  const [showFallback, setShowFallback] = React.useState(!src);
  const [imgError, setImgError] = React.useState(false);

  // Reset states when src changes (important for async loading)
  React.useEffect(() => {
    if (src) {
      setShowFallback(false);
      setImgError(false);
    } else {
      setShowFallback(true);
    }
  }, [src]);

  const handleImageError = () => {
    setImgError(true);
    setShowFallback(true);
  };

  if (showFallback || imgError || !src) {
    return <div className={fallbackClass}>{getInitials(name)}</div>;
  }

  return (
    <img
      src={src}
      alt={name}
      className={fallbackClass}
      onError={handleImageError}
      loading="lazy"
    />
  );
};
