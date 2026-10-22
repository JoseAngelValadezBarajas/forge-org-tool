export function repositoryDisplayName(rootPath: string): string {
  const segments = rootPath
    .replace(/[\\/]+$/, '')
    .split(/[\\/]/)
    .filter(Boolean);
  return segments.at(-1) ?? rootPath;
}
