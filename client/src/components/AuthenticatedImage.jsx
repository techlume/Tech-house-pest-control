import { useEffect, useState } from 'react';
import { http } from '../services/http';
export function AuthenticatedImage({ src, alt, className }) {
  const [url, setUrl] = useState(src?.startsWith('data:') ? src : '');
  useEffect(() => {
    if (!src || src.startsWith('data:')) return;
    let objectUrl;
    http
      .get(src.replace(/^\/api\/v1/, ''), { responseType: 'blob' })
      .then(({ data }) => {
        objectUrl = URL.createObjectURL(data);
        setUrl(objectUrl);
      })
      .catch(() => setUrl(''));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);
  return url ? <img src={url} alt={alt} className={className} /> : <span className='muted'>Protected image unavailable</span>;
}
