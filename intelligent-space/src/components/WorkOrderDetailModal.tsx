import { useEffect, useState } from 'react';
import { Modal, Descriptions, Tag, Button, message, Steps, Typography } from 'antd';
import type { WorkOrder } from '../types';
import { updateWorkOrderStatus } from '../api';
import { formatDateTime } from '../utils/format';

const { Text } = Typography;

const STATUS_FLOW = ['pending', 'assigned', 'in_progress', 'completed'] as const;

const statusInfo: Record<string, { title: string; color: string }> = {
  pending: { title: '待派单', color: 'default' },
  assigned: { title: '已派单', color: 'processing' },
  in_progress: { title: '处理中', color: 'warning' },
  completed: { title: '已完成', color: 'success' },
};

const priorityInfo: Record<string, { title: string; color: string }> = {
  high: { title: '高', color: 'red' },
  medium: { title: '中', color: 'orange' },
  low: { title: '低', color: 'blue' },
};

interface WorkOrderDetailModalProps {
  order: WorkOrder | null;
  open: boolean;
  onClose: () => void;
  onStatusChanged: () => void;
}

export default function WorkOrderDetailModal({
  order,
  open,
  onClose,
  onStatusChanged,
}: WorkOrderDetailModalProps) {
  const [localOrder, setLocalOrder] = useState<WorkOrder | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  // 每次打开弹窗或切换工单时，同步本地数据
  useEffect(() => {
    if (order) {
      setLocalOrder({ ...order });
    }
  }, [order]);

  if (!localOrder) return null;

  const currentIdx = STATUS_FLOW.indexOf(localOrder.status as typeof STATUS_FLOW[number]);
  const nextStatus = currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;
  const isCompleted = localOrder.status === 'completed';

  const handleAdvance = async () => {
    if (!nextStatus) return;
    setTransitioning(true);
    try {
      const updated = await updateWorkOrderStatus(localOrder.id, nextStatus as WorkOrder['status']);
      setLocalOrder(updated);
      message.success(`工单已推进到「${statusInfo[updated.status].title}」`);
      onStatusChanged();
    } catch (err: any) {
      message.error('状态推进失败: ' + err.message);
    } finally {
      setTransitioning(false);
    }
  };

  return (
    <Modal
      title={`${localOrder.id} · ${localOrder.title}`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={520}
      destroyOnHidden
    >
      {/* 基本信息 */}
      <Descriptions column={1} size="small" style={{ marginBottom: 24 }}>
        <Descriptions.Item label="状态">
          <Tag color={statusInfo[localOrder.status]?.color}>{statusInfo[localOrder.status]?.title}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="优先级">
          <Tag color={priorityInfo[localOrder.priority]?.color}>{priorityInfo[localOrder.priority]?.title}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="关联设备">{localOrder.deviceName}</Descriptions.Item>
        <Descriptions.Item label="创建时间">
          {formatDateTime(localOrder.createdAt)}
        </Descriptions.Item>
        <Descriptions.Item label="更新时间">
          {formatDateTime(localOrder.updatedAt)}
        </Descriptions.Item>
      </Descriptions>

      {/* 描述 */}
      <Text strong style={{ display: 'block', marginBottom: 8 }}>
        描述
      </Text>
      <div
        style={{
          padding: 12,
          background: '#fafafa',
          borderRadius: 6,
          marginBottom: 24,
          color: '#666',
          lineHeight: 1.6,
        }}
      >
        {localOrder.description || '暂无描述'}
      </div>

      {/* 状态流转 */}
      <Text strong style={{ display: 'block', marginBottom: 16 }}>
        状态流转
      </Text>
      <Steps
        current={currentIdx}
        size="small"
        items={STATUS_FLOW.map((s) => ({
          title: statusInfo[s].title,
          status: isCompleted
            ? 'finish'
            : s === localOrder.status
              ? 'process'
              : currentIdx > STATUS_FLOW.indexOf(s)
                ? 'finish'
                : 'wait',
        }))}
        style={{ marginBottom: 24 }}
      />

      {/* 推进按钮 */}
      {!isCompleted && nextStatus && (
        <div style={{ textAlign: 'center' }}>
          <Button
            type="primary"
            loading={transitioning}
            onClick={handleAdvance}
          >
            推进到「{statusInfo[nextStatus].title}」
          </Button>
        </div>
      )}
    </Modal>
  );
}
