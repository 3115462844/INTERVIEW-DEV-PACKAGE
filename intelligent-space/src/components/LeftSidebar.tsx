import { Menu, Radio, Space, Typography, Spin } from 'antd';
import { ApartmentOutlined, FilterOutlined } from '@ant-design/icons';
import type { Building } from '../types';

const { Text } = Typography;

const statusOptions = [
  { label: '全部', value: 'all' },
  { label: '正常', value: 'normal' },
  { label: '告警', value: 'warning' },
  { label: '故障', value: 'fault' },
  { label: '离线', value: 'offline' },
] as const;

interface LeftSidebarProps {
  buildings: Building[];
  loading?: boolean;
  selectedBuilding: string;
  onBuildingChange: (id: string) => void;
  statusFilter: string;
  onStatusFilterChange: (filter: string) => void;
}

export default function LeftSidebar({
  buildings,
  loading,
  selectedBuilding,
  onBuildingChange,
  statusFilter,
  onStatusFilterChange,
}: LeftSidebarProps) {
  return (
    <div style={{ padding: '16px 0' }}>
      {/* 楼栋选择 */}
      <div style={{ padding: '0 16px', marginBottom: 8 }}>
        <Text strong style={{ fontSize: 14 }}>
          <ApartmentOutlined style={{ marginRight: 6 }} />
          楼栋选择
        </Text>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin size="small" />
        </div>
      ) : (
        <Menu
          mode="inline"
          selectedKeys={[selectedBuilding]}
          onClick={({ key }) => onBuildingChange(key)}
          items={buildings.map((b) => ({ key: b.id, label: b.name }))}
          style={{ border: 'none' }}
        />
      )}

      {/* 状态筛选 */}
      <div style={{ padding: '0 16px', marginTop: 24, marginBottom: 8 }}>
        <Text strong style={{ fontSize: 14 }}>
          <FilterOutlined style={{ marginRight: 6 }} />
          状态筛选
        </Text>
      </div>
      <div style={{ padding: '0 16px' }}>
        <Radio.Group
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
        >
          <Space orientation="vertical" size="small">
            {statusOptions.map((opt) => (
              <Radio key={opt.value} value={opt.value}>
                {opt.label}
              </Radio>
            ))}
          </Space>
        </Radio.Group>
      </div>
    </div>
  );
}
