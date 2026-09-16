export const DRIVER_FEE_EVENT = "raac:driver-fee";
export const DRIVER_FEE_STORAGE_KEY = "raac.driverFeePercent";
export const STATE_PAYOUT_STORAGE_KEY = "raac.stateDriverPayout";

export function publishDriverFee(percent: number, stateDriverPayout?: number) {
  try {
    localStorage.setItem(DRIVER_FEE_STORAGE_KEY, String(percent));
    if (typeof stateDriverPayout === "number") {
      localStorage.setItem(STATE_PAYOUT_STORAGE_KEY, String(stateDriverPayout));
    }
  } catch {
    // ignore private-mode storage failures
  }
  window.dispatchEvent(
    new CustomEvent(DRIVER_FEE_EVENT, { detail: { percent, stateDriverPayout } })
  );
}

export function publishStatePayout(payout: number, percent?: number) {
  try {
    localStorage.setItem(STATE_PAYOUT_STORAGE_KEY, String(payout));
    if (typeof percent === "number") {
      localStorage.setItem(DRIVER_FEE_STORAGE_KEY, String(percent));
    }
  } catch {
    // ignore private-mode storage failures
  }
  window.dispatchEvent(
    new CustomEvent(DRIVER_FEE_EVENT, { detail: { percent, stateDriverPayout: payout } })
  );
}
