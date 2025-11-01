/**
 * تأخير غير متزامن
 * @param ms عدد المللي ثانية للانتظار
 * @returns وعد يتم تحقيقه بعد التأخير
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
