export const BASE_PATH_ENV = "MODELS_DEV_BASE_PATH";

const normalizeAppPath = (value: string) => {
  if (!value) {
    return "/";
  }

  return value.startsWith("/") ? value : `/${value}`;
};

export const normalizeBasePath = (value?: string | null) => {
  const trimmedValue = value?.trim();

  if (!trimmedValue || trimmedValue === "/") {
    return "/";
  }

  const cleanedValue = trimmedValue.replace(/^\/+|\/+$/g, "");

  return cleanedValue ? `/${cleanedValue}` : "/";
};

export const getBasePath = (value?: string | null) => {
  return normalizeBasePath(value);
};

export const withBasePath = (value: string, basePath = "/") => {
  const normalizedPath = normalizeAppPath(value);

  if (basePath === "/") {
    return normalizedPath;
  }

  return normalizedPath === "/" ? `${basePath}/` : `${basePath}${normalizedPath}`;
};

export const stripBasePath = (value: string, basePath = "/") => {
  const normalizedPath = normalizeAppPath(value);

  if (basePath === "/") {
    return normalizedPath;
  }

  if (normalizedPath === basePath) {
    return "/";
  }

  if (!normalizedPath.startsWith(`${basePath}/`)) {
    return null;
  }

  return normalizedPath.slice(basePath.length) || "/";
};
