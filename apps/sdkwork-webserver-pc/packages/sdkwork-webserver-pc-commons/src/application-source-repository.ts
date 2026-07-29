export const APPLICATION_GIT_REPOSITORY_MAX_LENGTH = 500;

export function normalizeApplicationGitRepositoryUrl(value: string | undefined): string {
  const repository = value?.trim();
  if (!repository) throw new Error("Git repository is required");
  if (repository.length > APPLICATION_GIT_REPOSITORY_MAX_LENGTH) {
    throw new Error(`Git repository must not exceed ${APPLICATION_GIT_REPOSITORY_MAX_LENGTH} characters`);
  }

  let parsed: URL;
  try {
    parsed = new URL(repository);
  } catch {
    throw new Error("Git repository must be a valid HTTPS URL");
  }
  if (
    parsed.protocol !== "https:"
    || !parsed.hostname
    || parsed.pathname === "/"
    || parsed.username
    || parsed.password
    || parsed.search
    || parsed.hash
  ) {
    throw new Error("Git repository must be an HTTPS URL without credentials, query parameters, or fragments");
  }
  return repository;
}

export function isValidApplicationGitRepositoryUrl(value: string | undefined): boolean {
  try {
    normalizeApplicationGitRepositoryUrl(value);
    return true;
  } catch {
    return false;
  }
}
