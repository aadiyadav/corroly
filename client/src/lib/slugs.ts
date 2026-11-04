import { Repository } from "@/store/slices/repositorySlice";

/**
 * Converts a repository name into a clean, URL-safe slug.
 * e.g., "Workspace 2" -> "workspace-2"
 * e.g., "My First Workspace" -> "my-first-workspace"
 */
export function getRepoSlug(repo: { name: string; id: string }): string {
  if (!repo || !repo.name) return "";
  const cleaned = repo.name
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
  return encodeURIComponent(cleaned || repo.id);
}

/**
 * Finds a repository from a list matching a URL slug or name or ID.
 */
export function findRepoBySlugOrName(
  repositories: Repository[],
  slug: string
): Repository | undefined {
  if (!slug || !repositories || repositories.length === 0) return undefined;
  const decoded = decodeURIComponent(slug).trim().toLowerCase();
  const slugifiedDecoded = decoded.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");

  return repositories.find((r) => {
    const rName = r.name.trim().toLowerCase();
    const rSlug = rName.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
    return (
      rSlug === slugifiedDecoded ||
      rName === decoded ||
      rSlug === decoded ||
      r.id.toLowerCase() === decoded
    );
  });
}
