let twizzleProd = false;

export function setProd(newTwizzleProd: boolean): void {
  console.info("Setting prod flag:", newTwizzleProd);
  twizzleProd = newTwizzleProd;
}

export function prod(): boolean {
  return twizzleProd;
}
