import React, { useState, useEffect } from 'react';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { app } from '../../lib/firebase';

export interface FirebaseImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallback?: string;
}

export function FirebaseImage({ src, fallback, ...props }: FirebaseImageProps) {
  // If the src is not a gs:// URL, we can render it immediately.
  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(
    (src && !src.startsWith('gs://')) ? src : fallback || undefined
  );
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setHasError(false);

    async function resolveUrl() {
      if (!src) {
        if (fallback && isMounted) setResolvedSrc(fallback);
        return;
      }

      if (src.startsWith('gs://')) {
        try {
          const storage = getStorage(app);
          // Pass the complete gs:// URL so it uses the correct bucket
          const imageRef = ref(storage, src);
          const url = await getDownloadURL(imageRef);
          
          if (isMounted) {
            setResolvedSrc(url);
          }
        } catch (error) {
          console.error("Error resolving Firebase Storage URL:", src, error);
          if (fallback && isMounted) {
            setResolvedSrc(fallback);
          } else if (isMounted) {
            setHasError(true);
          }
        }
      } else {
        if (isMounted) {
          setResolvedSrc(src);
        }
      }
    }

    resolveUrl();

    return () => {
      isMounted = false;
    };
  }, [src, fallback]);

  if (hasError && !fallback) {
      return null;
  }

  return (
    <img
      src={resolvedSrc || undefined}
      {...props}
      style={{ ...props.style, display: (hasError && !fallback) ? 'none' : props.style?.display }}
      loading="lazy"
      onError={(e) => {
        if (props.onError) {
           props.onError(e);
        }
        if (fallback && e.currentTarget.src !== fallback && !e.currentTarget.src.endsWith(fallback)) {
          setResolvedSrc(fallback);
        } else if (!props.onError) {
          setHasError(true);
        }
      }}
    />
  );
}
