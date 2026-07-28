import { absoluteUrl, getProductIdentity } from "../config/product-identity";

export function canonicalForPath(path: string): string {
  return absoluteUrl(path === "" ? "/" : path);
}

export function organizationId(): string {
  const identity = getProductIdentity();
  return `${identity.canonicalOrigin}${identity.schemaIdPath}`;
}
