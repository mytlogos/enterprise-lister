/**
 * Check if storage is available and enabled.
 *
 * Copied from: https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API
 *
 * @param type storage type
 */
function storageAvailable(type: keyof Window) {
  let storage;
  try {
    storage = window[type];

    if (!storage || typeof storage !== "object" || !("setItem" in storage) || !("removeItem" in storage)) {
      return false;
    }

    const x = "__storage_test__";
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  } catch (e) {
    return (
      e instanceof DOMException &&
      // everything except Firefox
      (e.code === 22 ||
        // Firefox
        e.code === 1014 ||
        // test name field too, because code might not be present
        // everything except Firefox
        e.name === "QuotaExceededError" ||
        // Firefox
        e.name === "NS_ERROR_DOM_QUOTA_REACHED") &&
      // acknowledge QuotaExceededError only if there's something already stored
      storage &&
      typeof storage === "object" &&
      "length" in storage &&
      storage.length !== 0
    );
  }
}

export function set(key: string, value: unknown): void {
  if (!storageAvailable("localStorage")) {
    return;
  }
  localStorage.setItem(key, JSON.stringify(value));
}

export function get(key: string): any {
  if (!storageAvailable("localStorage")) {
    return;
  }
  return JSON.parse(localStorage.getItem(key) || "null");
}

export function remove(key: string): void {
  if (!storageAvailable("localStorage")) {
    return;
  }
  localStorage.removeItem(key);
}
