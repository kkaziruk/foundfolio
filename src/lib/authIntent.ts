export type StaffIntent =
  | { mode: "building_manager"; campus: string; building_id: string }
  | { mode: "campus_admin"; campus: string }

const KEY = "ff_staff_intent";

export function setStaffIntent(intent: StaffIntent) {
  sessionStorage.setItem(KEY, JSON.stringify(intent));
}

export function getStaffIntent(): StaffIntent | null {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StaffIntent;
  } catch {
    return null;
  }
}

export function clearStaffIntent() {
  sessionStorage.removeItem(KEY);
}

const ERR_KEY = "ff_auth_error";
export function setAuthError(msg: string) {
  sessionStorage.setItem(ERR_KEY, msg);
}
export function popAuthError(): string {
  const msg = sessionStorage.getItem(ERR_KEY) ?? "";
  sessionStorage.removeItem(ERR_KEY);
  return msg;
}

const RETURN_TO_KEY = "ff_return_to";

export function setReturnTo(path: string) {
  if (!path || !path.startsWith("/")) return;
  sessionStorage.setItem(RETURN_TO_KEY, path);
}

export function popReturnTo(): string {
  const value = sessionStorage.getItem(RETURN_TO_KEY) ?? "";
  sessionStorage.removeItem(RETURN_TO_KEY);
  return value;
}
