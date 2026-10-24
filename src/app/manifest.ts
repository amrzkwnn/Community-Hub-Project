import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NadiKomuniti',
    short_name: 'NadiKomuniti',
    description: 'Your connected community hub for local updates, reporting issues, discovering services and supporting your neighbourhood.',
    start_url: '/?tab=home',
    scope: '/',
    display: 'standalone',
    background_color: '#F8F9FA',
    theme_color: '#BA1B1D',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/maskable-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
