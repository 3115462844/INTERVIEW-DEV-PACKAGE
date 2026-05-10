import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Tag, Button, Select, Spin, Empty, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { WorkOrder } from '../types';
import { fetchWorkOrders } from '../api';
import { formatDateTime } from '../utils/format';
import WorkOrderDetailModal from '../components/WorkOrderDetailModal';
import CreateWorkOrderModal from '../components/CreateWorkOrderModal';

const statusMap: Record<string, { color: string; text: string }> = {
  pending: { color: 'default', text: '待派单' },
  assigned: { color: 'processing', text: '已派单' },
  in_progress: { color: 'warning', text: '处理中' },
  completed: { color: 'success', text: '已完成' },
};

const priorityMap: Record<string, { color: string; text: string }> = {
  high: { color: 'red', text: '高' },
  medium: { color: 'orange', text: '中' },
  low: { color: 'blue', text: '低' },
};

const statusFilterOptions = [
  { label: '全部', value: 'all' },
  { label: '待派单', value: 'pending' },
  { label: '已派单', value: 'assigned' },
  { label: '处理中', value: 'in_progress' },
  { label: '已完成', value: 'completed' },
];

const columns = [
  { title: '编号', dataIndex: 'id', key: 'id', width: 90 },
  { title: '标题', dataIndex: 'title', key: 'title' },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    render: (s: string) => {
      const m = statusMap[s];
      return m ? <Tag color={m.color}>{m.text}</Tag> : <Tag>{s}</Tag>;
    },
  },
  {
    title: '优先级',
    dataIndex: 'priority',
    key: 'priority',
    width: 80,
    render: (p: string) => {
      const m = priorityMap[p];
      return m ? <Tag color={m.color}>{m.text}</Tag> : <Tag>{p}</Tag>;
    },
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 150,
    render: (v: string) => formatDateTime(v),
  },
];

export default function WorkOrders() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  // 工单详情抽屉
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 创建工单弹窗
  const [createOpen, setCreateOpen] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWorkOrders(
        statusFilter !== 'all' ? { status: statusFilter } : undefined
      );
      setOrders(data);
    } catch (err: any) {
      message.error('加载工单数据失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // AI 助手创建工单后自动刷新列表
  useEffect(() => {
    const handler = () => loadOrders();
    window.addEventListener('work-order-created', handler);
    return () => window.removeEventListener('work-order-created', handler);
  }, [loadOrders]);

  const handleRowClick = (record: WorkOrder) => {
    setSelectedOrder(record);
    setDrawerOpen(true);
  };

  return (
    <>
      <Card
        title="工单列表"
        styles={{ body: { overflow: 'auto', maxHeight: 'calc(100vh - 200px)' } }}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateOpen(true)}
          >
            创建工单
          </Button>
        }
      >
        {/* 状态筛选 */}
        <div style={{ marginBottom: 12 }}>
          <span style={{ marginRight: 8 }}>状态：</span>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 120 }}
            options={statusFilterOptions}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Spin size="large" />
          </div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Empty description="暂无工单" />
          </div>
        ) : (
          <Table
            rowKey="id"
            dataSource={orders}
            columns={columns}
            pagination={false}
            size="small"
            onRow={(record) => ({
              onClick: () => handleRowClick(record),
              style: { cursor: 'pointer' },
            })}
          />
        )}
      </Card>

      {/* 工单详情抽屉 */}
      <WorkOrderDetailModal
        order={selectedOrder}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onStatusChanged={loadOrders}
      />

      {/* 创建工单弹窗 */}
      <CreateWorkOrderModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={loadOrders}
      />
    </>
  );
}
