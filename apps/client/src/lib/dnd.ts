export const SNAP_DISTANCE = 20;
export const SNAP_ANGLE = 5;

let zCounter = 100;

export function nextZ(): number {
  return ++zCounter;
}

export function resetZ(): void {
  zCounter = 100;
}