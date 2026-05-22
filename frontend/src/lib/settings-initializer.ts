export async function initializeSettings(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const theme = window.localStorage.getItem("theme");
  if (theme) {
    document.documentElement.dataset.theme = theme;
  }
}
