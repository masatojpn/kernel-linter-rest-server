export type SessionRecord = {
  sessionToken: string;
  figmaUserId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
  createdAt: number;
  updatedAt: number;
};

export type OAuthStateRecord = {
  state: string;
  createdAt: number;
};

export type FigmaTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id: string;
};

export type AllowedComponentsResponse = {
  ok: true;
  fileKey: string;
  pageName: string;
  allowedKeys: string[];
};

export type ErrorResponse = {
  ok: false;
  error: string;
};

export type AllowedSource = {
  fileKey: string;
  pageName: string;
};

export type AllowedComponentsRequest = {
  sources: AllowedSource[];
};