/**
 * Pull a numeric Instagram user id out of a profile HTML document.
 * Visiting instagram.com/{username}/ works even when web_profile_info is 429'd;
 * the page still embeds profilePage_{id} / username+id JSON the same way.
 */

export function extractUserIdFromProfileHtml(html: string, username: string): string | null {
  if (!html || !username) {
    return null;
  }

  const profilePage = html.match(/profilePage_(\d{5,})/);
  if (profilePage) {
    return profilePage[1];
  }

  const escaped = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const nearbyId = new RegExp(
    `"username"\\s*:\\s*"${escaped}"[\\s\\S]{0,500}?"(?:id|pk|pk_id)"\\s*:\\s*"?(\\d{5,})"`,
    'i',
  );
  const nearbyIdReverse = new RegExp(
    `"(?:id|pk|pk_id)"\\s*:\\s*"?(\\d{5,})"?[\\s\\S]{0,500}?"username"\\s*:\\s*"${escaped}"`,
    'i',
  );

  return html.match(nearbyId)?.[1] ?? html.match(nearbyIdReverse)?.[1] ?? null;
}
