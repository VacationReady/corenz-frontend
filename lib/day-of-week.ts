export function toMondayStartDayIndexFromJs(jsDay: number): number {
  return (jsDay + 6) % 7;
}

export function toJsDayFromMondayStart(mondayStartDayIndex: number): number {
  return (mondayStartDayIndex + 1) % 7;
}
