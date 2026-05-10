import { useEffect, useState, useCallback } from 'react';
import { Drawer, Descriptions, Tag, Spin, Button, Typography } from 'antd';
import {
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
  FileAddOutlined,
} from '@ant-design/icons';
import type { DeviceDetail } from '../types';
import { fetchDeviceDetail } from '../api';

import { formatDateTime, formatFloor } from '../utils/format';

const { Text } = Typography;

const statusConfig: Record<string, { color: string; icon: React.ReactNode; text: string }> = {
  normal: { color: '#52c41a', icon: <CheckCircleOutlined />, text: '正常' },
  warning: { color: '#faad14', icon: <WarningOutlined />, text: '告警' },
  fault: { color: '#ff4d4f', icon: <CloseCircleOutlined />, text: '故障' },
  offline: { color: '#d9d9d9', icon: <MinusCircleOutlined />, text: '离线' },
};

const alertLevelConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  critical: { color: '#ff4d4f', icon: <CloseCircleOutlined /> },
  warning: { color: '#faad14', icon: <WarningOutlined /> },
  info: { color: '#1890ff', icon: <CheckCircleOutlined /> },
};

interface DeviceDetailDrawerProps {
  deviceId: string | null;
  open: boolean;
  onClose: () => void;
  onCreateWorkOrder?: (deviceId: string, deviceName: string) => void;
}

export default function DeviceDetailDrawer({
  deviceId,
  open,
  onClose,
  onCreateWorkOrder,
}: DeviceDetailDrawerProps) {
  const [detail, setDetail] = useState<DeviceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    setError(null);
    setDetail(null);
    try {
      const data = await fetchDeviceDetail(deviceId);
      setDetail(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    if (!deviceId || !open) return;
    loadDetail();
  }, [deviceId, open, loadDetail]);

  return (
    <Drawer
      title={
        detail
          ? `${detail.name} · ${formatFloor(detail.buildingId, detail.floor)}`
          : '设备详情'
      }
      open={open}
      onClose={onClose}
      size="default"
      destroyOnHidden
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ color: '#ff4d4f', marginBottom: 16 }}>加载失败: {error}</div>
          <Button type="primary" onClick={loadDetail}>重新加载</Button>
        </div>
      ) : !detail ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          {/* 基本信息 */}
          <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="类型">{detail.typeName}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag
                icon={statusConfig[detail.status]?.icon}
                color={statusConfig[detail.status]?.color}
              >
                {statusConfig[detail.status]?.text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="最后更新">
              {formatDateTime(detail.lastUpdated)}
            </Descriptions.Item>
          </Descriptions>

          {/* 最近告警 */}
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            最近告警
          </Text>
          {detail.alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>暂无告警记录</div>
          ) : (
            <div>
              {detail.alerts.map((alert) => {
                const cfg = alertLevelConfig[alert.level];
                return (
                  <div
                    key={alert.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: '8px 0',
                      opacity: alert.acknowledged ? 0.5 : 1,
                      borderBottom: '1px solid #f5f5f5',
                    }}
                  >
                    {cfg && (
                      <span style={{ color: cfg.color, fontSize: 16, marginTop: 2 }}>{cfg.icon}</span>
                    )}
                    <div style={{ flex: 1 }}>
                      <div>
                        <span style={{ fontSize: 13 }}>{alert.message}</span>
                        {alert.acknowledged && (
                          <Tag style={{ marginLeft: 8 }} color="default">
                            已确认
                          </Tag>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                        {formatDateTime(alert.timestamp)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 创建工单按钮 — 正常设备无需创建工单 */}
          {detail.status !== 'normal' && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Button
                type="primary"
                icon={<FileAddOutlined />}
                onClick={() => {
                  onCreateWorkOrder?.(detail.id, detail.name);
                  onClose();
                }}
              >
                创建工单
              </Button>
            </div>
          )}
        </>
      )}
    </Drawer>
  );
}
