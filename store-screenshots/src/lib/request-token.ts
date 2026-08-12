export const EDITOR_REQUEST_TOKEN_HEADER = "x-whereip-editor-token";

let projectRequestToken: string | null = null;

export function setProjectRequestToken(token: unknown): void {
  projectRequestToken =
    typeof token === "string" && /^[a-f0-9]{64}$/i.test(token)
      ? token
      : null;
}

export function getProjectRequestToken(): string | null {
  return projectRequestToken;
}
