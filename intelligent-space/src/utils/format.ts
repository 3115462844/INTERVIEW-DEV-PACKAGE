/** 格式化楼层显示：正数展示 "B1-8F"，负数展示 "B1-B1" */
export function formatFloor(buildingId: string, floor: number): string {
  if (floor < 0) return `${buildingId}-B${Math.abs(floor)}`;
  return `${buildingId}-${floor}F`;
}

/** 将 ISO 时间戳格式化为 "YYYY-MM-DD HH:mm" */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
