import type { Building, Device, DeviceDetail, Alert, WorkOrder } from '../types';

const BASE_URL = '/api';

async function fetchJSON<T>(url: string, options?: RequestInit & { timeout?: number }): Promise<T> {
  const { timeout = 10000, ...fetchOptions } = options || {};

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${BASE_URL}${url}`, {
      headers: { 'Content-Type': 'application/json' },
      ...fetchOptions,
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `HTTP ${res.status}`);
    }

    return res.json();
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`请求超时 (${timeout}ms): ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============ 楼栋 ============

export function fetchBuildings(): Promise<Building[]> {
  return fetchJSON('/buildings');
}

// ============ 设备 ============

export function fetchDevices(params?: {
  buildingId?: string;
  status?: string;
  type?: string;
}): Promise<Device[]> {
  const query = new URLSearchParams();
  if (params?.buildingId) query.set('buildingId', params.buildingId);
  if (params?.status) query.set('status', params.status);
  if (params?.type) query.set('type', params.type);
  const qs = query.toString();
  return fetchJSON(`/devices${qs ? `?${qs}` : ''}`);
}

export function fetchDeviceDetail(id: string): Promise<DeviceDetail> {
  return fetchJSON(`/devices/${id}`);
}

// ============ 告警 ============

export function fetchAlerts(params?: {
  buildingId?: string;
  level?: string;
  acknowledged?: boolean;
}): Promise<Alert[]> {
  const query = new URLSearchParams();
  if (params?.buildingId) query.set('buildingId', params.buildingId);
  if (params?.level) query.set('level', params.level);
  if (params?.acknowledged !== undefined) query.set('acknowledged', String(params.acknowledged));
  const qs = query.toString();
  return fetchJSON(`/alerts${qs ? `?${qs}` : ''}`);
}

export function acknowledgeAlert(id: string): Promise<{ id: string; acknowledged: true }> {
  return fetchJSON(`/alerts/${id}/ack`, { method: 'POST' });
}

// ============ 工单 ============

export function fetchWorkOrders(params?: { status?: string }): Promise<WorkOrder[]> {
  const query = params?.status ? `?status=${params.status}` : '';
  return fetchJSON(`/work-orders${query}`);
}

export function createWorkOrder(data: {
  title: string;
  description: string;
  deviceId: string;
  priority: string;
}): Promise<WorkOrder> {
  return fetchJSON('/work-orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateWorkOrderStatus(
  id: string,
  status: WorkOrder['status']
): Promise<WorkOrder> {
  return fetchJSON(`/work-orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// ============ Chat ============

export interface ChatMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
}

export interface ChatResponse {
  role: 'assistant';
  content: string | null;
  tool_calls?: ChatMessage['tool_calls'];
}

export function sendChatMessage(messages: ChatMessage[]): Promise<ChatResponse> {
  return fetchJSON('/chat', {
    method: 'POST',
    body: JSON.stringify({ messages }),
  });
}

// ============ 用户 ============

export interface UserProfile {
  id: string;
  name: string;
  avatar: string; // 头像 URL
}