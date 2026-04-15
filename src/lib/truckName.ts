export function normalizeTruckName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export function truckNameKey(name: string) {
  return normalizeTruckName(name).toLocaleLowerCase();
}
