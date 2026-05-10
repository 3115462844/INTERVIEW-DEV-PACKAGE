import { useEffect, useState, useMemo } from 'react';
import { Typography, Card, Table, Tag, Select, Space, Spin, Empty, Button } from 'antd';
import {
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import type { Device } from '../types';
import { fetchDevices } from '../api';
import DeviceDetailDrawer from '../components/DeviceDetailDrawer';
import CreateWorkOrderModal from '../components/CreateWorkOrderModal';
import { formatFloor } from '../utils/format';

const { Text } = Typography;

interface DashboardProps {
  selectedBuilding: string;
  statusFilter: string;
}

const statusConfig: Record<
  string,
  { color: string; icon: React.ReactNode; text: string }
> = {
  normal: { color: '#52c41a', icon: <CheckCircleOutlined />, text: '正常' },
  warning: { color: '#faad14', icon: <WarningOutlined />, text: '告警' },
  fault: { color: '#ff4d4f', icon: <CloseCircleOutlined />, text: '故障' },
  offline: { color: '#d9d9d9', icon: <MinusCircleOutlined />, text: '离线' },
};

const columns = [
  { title: '设备名称', dataIndex: 'name', key: 'name' },
  {
    title: '楼栋/楼层',
    dataIndex: 'floor',
    key: 'floor',
    render: (v: number, record: { buildingId: string }) => formatFloor(record.buildingId, v),
  },
  { title: '类型', dataIndex: 'typeName', key: 'typeName' },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    render: (s: string) => {
      const cfg = statusConfig[s];
      return cfg ? (
        <Tag icon={cfg.icon} color={cfg.color}>
          {cfg.text}
        </Tag>
      ) : (
        <Tag>{s}</Tag>
      );
    },
  },
];

export default function Dashboard({ selectedBuilding, statusFilter }: DashboardProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [preselectedDeviceId, setPreselectedDeviceId] = useState<string | undefined>();

  // 根据选中的楼栋 + 状态筛选从 API 拉取数据
  useEffect(() => {
    if (!selectedBuilding) return;

    setLoading(true);
    setLoadError(null);
    setDevices([]);
    fetchDevices({
      buildingId: selectedBuilding,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    })
      .then(setDevices)
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, [selectedBuilding, statusFilter]);

  // 再根据类型筛选做前端过滤
  const filteredDevices = useMemo(() => {
    if (typeFilter === 'all') return devices;
    return devices.filter((d) => d.type === typeFilter);
  }, [devices, typeFilter]);

  // 统计概览：按类型分组 + 各状态分布
  const stats = useMemo(() => {
    const typeMap = new Map<string, Map<string, number>>();

    for (const d of devices) {
      if (!typeMap.has(d.typeName)) {
        typeMap.set(d.typeName, new Map());
      }
      const statusMap = typeMap.get(d.typeName)!;
      statusMap.set(d.status, (statusMap.get(d.status) || 0) + 1);
    }

    return typeMap;
  }, [devices]);

  const statusLabel: Record<string, { text: string; color: string }> = {
    normal: { text: '正常', color: '#52c41a' },
    warning: { text: '告警', color: '#faad14' },
    fault: { text: '故障', color: '#ff4d4f' },
    offline: { text: '离线', color: '#d9d9d9' },
  };

  const typeOrder = ['电梯', '空调', '水泵', '照明', '消防'];

  return (
    <div>
      {/* 统计概览 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space size="large" wrap>
          {typeOrder.map((typeName) => {
            const statusMap = stats.get(typeName);
            const total = statusMap ? [...statusMap.values()].reduce((a, b) => a + b, 0) : 0;
            const allStatuses: Array<keyof typeof statusLabel> = ['normal', 'warning', 'fault', 'offline'];
            return (
              <div key={typeName} style={{ minWidth: 160 }}>
                <Text strong>{typeName}: </Text>
                <Text>{total} 台</Text>
                <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 12px' }}>
                    {allStatuses.map((status) => {
                      const count = statusMap?.get(status) || 0;
                      return (
                        <span key={status}>
                          <span style={{ color: statusLabel[status].color }}>●</span>{' '}
                          {statusLabel[status].text} {count}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </Space>
      </Card>

      {/* 设备列表 */}
      <Card
        title="设备列表"
        styles={{ body: { overflow: 'auto', maxHeight: 'calc(100vh - 300px)' } }}
        extra={
          <Select
            value={typeFilter}
            placeholder="类型筛选"
            style={{ width: 120 }}
            onChange={setTypeFilter}
            options={[
              { label: '全部', value: 'all' },
              { label: '电梯', value: 'elevator' },
              { label: '空调', value: 'hvac' },
              { label: '水泵', value: 'pump' },
              { label: '照明', value: 'lighting' },
              { label: '消防', value: 'fire_pressure' },
            ]}
          />
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Spin size="large" />
          </div>
        ) : loadError ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ color: '#ff4d4f', marginBottom: 8 }}>查询失败</div>
            <div style={{ color: '#999', fontSize: 13, marginBottom: 16 }}>{loadError}</div>
            <Button type="primary" ghost onClick={() => window.location.reload()}>重试</Button>
          </div>
        ) : filteredDevices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Empty description="暂无设备数据" />
          </div>
        ) : (
          <Table
            rowKey="id"
            dataSource={filteredDevices}
            columns={columns}
            pagination={false}
            size="small"
            onRow={(record) => ({
              onClick: () => {
                setSelectedDeviceId(record.id);
                setDetailOpen(true);
              },
              style: { cursor: 'pointer' },
            })}
          />
        )}
      </Card>

      {/* 设备详情抽屉 */}
      <DeviceDetailDrawer
        deviceId={selectedDeviceId}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onCreateWorkOrder={(deviceId) => {
          setDetailOpen(false);
          setPreselectedDeviceId(deviceId);
          setCreateModalOpen(true);
        }}
      />

      {/* 从设备详情跳转过来的创建工单 */}
      <CreateWorkOrderModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={() => setCreateModalOpen(false)}
        preselectedDeviceId={preselectedDeviceId}
      />
    </div>
  );
}
