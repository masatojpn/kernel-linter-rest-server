function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export const env = {
  FIGMA_CLIENT_ID: required("FIGMA_CLIENT_ID"),
  FIGMA_CLIENT_SECRET: required("FIGMA_CLIENT_SECRET"),
  FIGMA_OAUTH_REDIRECT_URI: required("FIGMA_OAUTH_REDIRECT_URI"),
  KERNEL_DS_FILE_KEY: required("KERNEL_DS_FILE_KEY"),
  KERNEL_ALLOWED_PAGE_NAME: process.env.KERNEL_ALLOWED_PAGE_NAME || "__allowedComponentList",
  APP_BASE_URL: required("APP_BASE_URL"),
  SESSION_SECRET: required("SESSION_SECRET")
};