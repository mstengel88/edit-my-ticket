export function normalizeTruckName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export function truckNameKey(name: string) {
  return normalizeTruckName(name).toLocaleLowerCase();
}

export function isStandardTruckName(name: string) {
  return /^GREENHILLS-[A-Za-z0-9-]+$/.test(normalizeTruckName(name));
}
