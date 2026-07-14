import React, { useState, useEffect } from 'react';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { app } from '../../lib/firebase';

export interface FirebaseImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallback?: string;
}

export function FirebaseImage({ src, fallback, ...props }: FirebaseImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(src || fallback || undefined);

  useEffect(() => {
    let isMounted = true;

    async function resolveUrl() {
      if (!src) {
        if (fallback) setResolvedSrc(fallback);
        return;
      }

      if (src.startsWith('gs://')) {
        try {
          if (src.toLowerCase().includes('scriptless.png')) {
            if (isMounted) {
              setResolvedSrc('/images/scriptless.png');
            }
            return;
          }

          const storage = getStorage(app);
          let adjustedSrc = src;

          try {
            const parsedUrl = new URL(src);
            let path = decodeURIComponent(parsedUrl.pathname);
            if (path.startsWith('/')) {
              path = path.substring(1);
            }
            adjustedSrc = path;
          } catch (e) {
            // Fallback to basic string replacement if URL parsing fails
            adjustedSrc = adjustedSrc.replace('gs://chainlink-2-72590.firebasestorage.app/', '').replace('gs://chainlink-2-72590.appspot.com/', '');
          }

          adjustedSrc = adjustedSrc.replace(/sponsors\/scriptless\.png/i, "Sponsors/scriptless.png");
          adjustedSrc = adjustedSrc.replace(/^achievements\//i, "Achievements/");
          const imageRef = ref(storage, adjustedSrc);
          const url = await getDownloadURL(imageRef);
          if (isMounted) {
            setResolvedSrc(url);
          }
        } catch (error) {
          console.error("Error resolving Firebase Storage URL:", src, error);
          if (fallback && isMounted) {
            setResolvedSrc(fallback);
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

  return (
    <img
      src={resolvedSrc || undefined}
      {...props}
      loading="lazy"
      crossOrigin="anonymous"
      onError={(e) => {
        if (fallback && e.currentTarget.src !== fallback) {
          e.currentTarget.src = fallback;
        } else {
          e.currentTarget.style.display = 'none';
        }
      }}
    />
  );
}
