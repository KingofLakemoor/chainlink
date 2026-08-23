import React, { useState, useEffect } from 'react';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { app } from '../../lib/firebase';


function optimizeEspnUrl(url: string) {
    if (!url) return url;
    if (url.includes('a.espncdn.com/i/teamlogos/') && !url.includes('combiner/i')) {
        try {
            const urlObj = new URL(url);
            return `https://a.espncdn.com/combiner/i?img=${urlObj.pathname}&h=150&w=150`;
        } catch(e) {
            return url;
        }
    }
    return url;
}



export interface FirebaseImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallback?: string;
  fallbackIcon?: React.ReactNode;
}

export function FirebaseImage({ src, fallback, fallbackIcon, ...props }: FirebaseImageProps) {
  // If the src is not a gs:// URL, we can render it immediately.
  
  const getInitialSrc = (s: string) => {
      if (!s) return fallback || undefined;
      if (s.startsWith('gs://')) return undefined;
      if (s.startsWith('/contestants/')) return 'https://scriptless.club602.com' + s;
      return optimizeEspnUrl(s);
  };
  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(getInitialSrc(src));
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setHasError(false);

    async function resolveUrl() {
      if (!src) {
        if (fallback && isMounted) setResolvedSrc(fallback);
        else if (isMounted) setHasError(true);
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
          setResolvedSrc(optimizeEspnUrl(src.startsWith('/contestants/') ? 'https://scriptless.club602.com' + src : src));
        }
      }
    }

    resolveUrl();

    return () => {
      isMounted = false;
    };
  }, [src, fallback]);

  if (hasError && !fallback && !fallbackIcon) {
      return null;
  }
  
  if (hasError && fallbackIcon) {
      return <>{fallbackIcon}</>;
  }

  return (
    <img
      src={resolvedSrc || undefined}
      {...props}
      style={{ ...props.style, display: (hasError && !fallbackIcon) ? 'none' : props.style?.display }}
      loading="lazy"
      referrerPolicy="no-referrer"
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
