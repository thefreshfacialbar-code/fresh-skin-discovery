export function getSelectedExperience(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage.getItem("skinDiscoveryExperience");
}

export function getBrandLogoPath(): string {
  return getSelectedExperience() === "gentlemens-corner" ? "/CGC-Logo.png" : "/ffb-logo.png";
}

export function getBrandLogoAlt(): string {
  return getSelectedExperience() === "gentlemens-corner"
    ? "Curated Gentlemen's Corner"
    : "Fresh Facial Bar & Lash Lounge";
}
