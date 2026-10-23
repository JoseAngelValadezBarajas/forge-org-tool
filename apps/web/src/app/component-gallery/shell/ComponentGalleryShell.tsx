import { ThemeProvider } from '../../theme';
import { ComponentGalleryContent } from '../ComponentGalleryContent';

/** Development-only catalog shell with an isolated, deterministic theme provider. */
export function ComponentGallery() {
  return (
    <ThemeProvider initialTheme="dark" storageKey={null}>
      <ComponentGalleryContent />
    </ThemeProvider>
  );
}
