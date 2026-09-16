export const DRIVER_FEE_EVENT = "raac:driver-fee";
export const DRIVER_FEE_STORAGE_KEY = "raac.driverFeePercent";

export function publishDriverFee(percent: number) {
  try {
    localStorage.setItem(DRIVER_FEE_STORAGE_KEY, String(percent));
  } catch {
    // ignore private-mode storage failures
  }
  window.dispatchEvent(new CustomEvent(DRIVER_FEE_EVENT, { detail: { percent } }));
}
