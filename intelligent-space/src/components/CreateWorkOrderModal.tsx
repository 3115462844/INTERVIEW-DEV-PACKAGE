import { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Radio, message, Spin } from 'antd';
import type { Device } from '../types';
import { fetchDevices, createWorkOrder } from '../api';

// 模块级缓存：组件销毁后仍保留，避免重复请求
let cachedDevices: Device[] | null = null;

interface CreateWorkOrderModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  /** 从设备详情传来的预填设备 ID */
  preselectedDeviceId?: string;
}

export default function CreateWorkOrderModal({
  open,
  onClose,
  onCreated,
  preselectedDeviceId,
}: CreateWorkOrderModalProps) {
  const [form] = Form.useForm();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 打开时加载设备列表供下拉选择（首次请求后缓存）
  useEffect(() => {
    if (!open) return;

    const applyDevices = (data: Device[]) => {
      setDevices(data);
      if (preselectedDeviceId) {
        const exists = data.some((d) => d.id === preselectedDeviceId);
        if (exists) {
          form.setFieldValue('deviceId', preselectedDeviceId);
        } else {
          message.warning(`设备 "${preselectedDeviceId}" 不存在或已被删除`);
        }
      }
    };

    if (cachedDevices) {
      applyDevices(cachedDevices);
      return;
    }

    setLoading(true);
    fetchDevices()
      .then((data) => {
        cachedDevices = data;
        applyDevices(data);
      })
      .catch((err) => message.error('加载设备列表失败: ' + err.message))
      .finally(() => setLoading(false));
  }, [open, preselectedDeviceId, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await createWorkOrder({
        title: values.title,
        description: values.description,
        deviceId: values.deviceId,
        priority: values.priority,
      });
      message.success('工单创建成功');
      form.resetFields();
      onCreated();
      onClose();
    } catch (err: any) {
      if (err.errorFields) return; // 表单验证错误，无需额外提示
      message.error('创建工单失败: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="创建工单"
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={submitting}
      okText="提交"
      cancelText="取消"
      destroyOnHidden
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      ) : (
        <Form form={form} layout="vertical" initialValues={{ priority: 'medium' }}>
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入工单标题' }]}
          >
            <Input placeholder="请输入工单标题" maxLength={100} />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="请描述问题详情" maxLength={500} />
          </Form.Item>

          <Form.Item
            name="deviceId"
            label="关联设备"
            rules={[{ required: true, message: '请选择关联设备' }]}
          >
            <Select
              placeholder="请选择设备"
              showSearch
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
              options={devices.map((d) => ({
                label: `${d.name} (${d.buildingId}-${d.floor}F, ${d.typeName})`,
                value: d.id,
              }))}
            />
          </Form.Item>

          <Form.Item name="priority" label="优先级">
            <Radio.Group>
              <Radio value="high">高</Radio>
              <Radio value="medium">中</Radio>
              <Radio value="low">低</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}
