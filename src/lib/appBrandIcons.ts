export const appBrandIconFiles: Record<string, string> = {
  google_calendar: "google-calendar",
  gmail: "gmail",
  google_sheets: "google-sheets",
  google_docs: "google-docs",
  google_drive: "google-drive",
  mercado_livre: "mercado-livre",
  shopee: "shopee",
  olx: "olx",
  whatsapp_business: "whatsapp",
  instagram: "instagram",
  facebook_messenger: "facebook-messenger",
  discord: "discord",
  slack: "slack",
  notion: "notion",
  hubspot: "hubspot",
  pipedrive: "pipedrive",
  rd_station: "rd-station",
  trello: "trello",
  asana: "asana",
  zapier: "zapier",
  make: "make",
  chatwoot: "chatwoot",
  webhook: "webhook",
};

export function getAppBrandIcon(slug: string, ext: "png" | "svg" = "png"): string {
  const filename = appBrandIconFiles[slug] ?? "webhook";
  return `/app-icons/${filename}.${ext}`;
}
