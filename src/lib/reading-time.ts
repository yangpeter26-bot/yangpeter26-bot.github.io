/** Estimate Chinese prose and English/code tokens without discarding code blocks. */
export function getReadingTimeMinutes(body = ''): number {
  const content = body.replace(/^[\t ]*(?:`{3,}|~{3,}).*$/gm, '');
  const chineseCharacters = content.match(/\p{Script=Han}/gu)?.length ?? 0;
  const otherText = content.replace(/\p{Script=Han}/gu, ' ');
  const words = otherText.match(/[\p{L}\p{N}_]+(?:['’.-][\p{L}\p{N}_]+)*/gu)?.length ?? 0;

  // Chinese: 300 characters/minute; English and code: 200 tokens/minute.
  return Math.max(1, Math.ceil(chineseCharacters / 300 + words / 200));
}
