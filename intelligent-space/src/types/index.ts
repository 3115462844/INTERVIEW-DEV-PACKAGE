export interface Building {
  id: string;
  name: string;
  floors: number;
  deviceCount: number;
}

export interface Device {
  id: string;
  name: string;
  type: 'elevator' | 'hvac' | 'pump' | 'lighting' | 'fire_pressure';
  typeName: string;
  buildingId: string;
  floor: number;
  status: 'normal' | 'warning' | 'fault' | 'offline';
  lastUpdated: string;
}

export interface DeviceDetail extends Device {
  alerts: Alert[];
}

export interface Alert {
  id: string;
  deviceId: string;
  deviceName: string;
  buildingId: string;
  level: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface WorkOrder {
  id: string;
  title: string;
  description: string;
  deviceId: string;
  deviceName: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
  updatedAt: string;
}

export type DeviceStatus = Device['status'];
export type DeviceType = Device['type'];
export type AlertLevel = Alert['level'];
export type WorkOrderStatus = WorkOrder['status'];
export type WorkOrderPriority = WorkOrder['priority'];
