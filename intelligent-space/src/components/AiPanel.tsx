import { useState, useRef, useEffect } from 'react';
import { Typography, Button, Input, Spin } from 'antd';
import {
  CloseOutlined,
  SendOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { sendChatMessage, fetchDevices, fetchAlerts, createWorkOrder } from '../api';
import type { ChatMessage } from '../api';

const { Text } = Typography;

interface AiPanelProps {
  onClose: () => void;
}

// ============ UI 消息类型（仅用于渲染） ============

interface UIMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool-call' | 'error';
  content: string;
  toolName?: string;
  toolArgs?: Record<string, string>;
  toolStatus?: 'running' | 'done';
  resultCount?: number;
  toolResult?: string;
}

const toolRunningLabels: Record<string, string> = {
  query_devices: '正在查询设备',
  query_alerts: '正在查询告警',
  create_work_order: '正在创建工单',
};

// ============ 工具执行映射 ============

const toolRunners: Record<string, (args: any) => Promise<any>> = {
  query_devices: (args) => fetchDevices(args),
  query_alerts: (args) => fetchAlerts(args),
  create_work_order: async (args) => {
    const result = await createWorkOrder(args);
    window.dispatchEvent(new CustomEvent('work-order-created'));
    return result;
  },
};

export default function AiPanel({ onClose }: AiPanelProps) {
  const [uiMessages, setUiMessages] = useState<UIMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [initialGreeting, setInitialGreeting] = useState(false);
  const msgIdCounter = useRef(0);
  const nextId = () => `msg_${++msgIdCounter.current}`;
  const bottomRef = useRef<HTMLDivElement>(null);
  const historyMessages = useRef<ChatMessage[]>([]); // 保存所有交互消息

  // 挂载时向 server 获取欢迎语
  useEffect(() => {
    sendChatMessage([])
      .then((res) => {
        const msg: ChatMessage = { role: 'assistant', content: res.content || '' };
        historyMessages.current.push(msg);
        setUiMessages([{ id: nextId(), role: 'assistant', content: res.content || '' }]);
      })
      .catch(() => {
        const fallback = '\n· 查询设备状态\n· 查看告警信息\n· 创建维修工单';
        setUiMessages([{ id: nextId(), role: 'assistant', content: fallback }]);
      })
      .finally(() => {
        setInitialGreeting(true);
      });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [uiMessages]);

  /**
   * 完整的 Tool Calling 循环（对应 API Spec 的 3 步流程）：
   *
   * 步骤1 — 发送 messages 给 LLM，可能返回 tool_calls
   * 步骤2 — 如果有 tool_calls，执行工具并将结果追加到 messages
   * 步骤3 — 再次发送完整 messages，获得最终文本回复
   */
  const executeChatLoop = async (messages: ChatMessage[]): Promise<void> => {
    // 步骤1：发送请求
    historyMessages.current.push(...messages);
    let res: any;
    try {
      res = await sendChatMessage(messages);
    } catch (err: any) {
      const errId = nextId();
      setUiMessages((prev) => [
        ...prev,
        { id: errId, role: 'error', content: '请求失败: ' + err.message },
      ]);
      return;
    }

    // 无 tool_calls → 直接文本回复，流程结束
    if (!res.tool_calls || res.tool_calls.length === 0) {
      const id = nextId();
      const reply: ChatMessage = { role: 'assistant', content: res.content || '' };
      messages.push(reply);
      historyMessages.current.push(reply);
      setUiMessages((prev) => [
        ...prev,
        { id, role: 'assistant', content: res.content || '' },
      ]);
      return;
    }

    // 步骤2：遍历所有 tool_calls，逐个执行
    for (const tc of res.tool_calls) {
      const fn = tc.function;
      const toolName = fn.name;
      const args = JSON.parse(fn.arguments);

      // 2a. 在 UI 上展示工具调用中间状态卡片
      const toolCardId = nextId();
      setUiMessages((prev) => [
        ...prev,
        {
          id: toolCardId,
          role: 'tool-call',
          content: '',
          toolName,
          toolArgs: args,
          toolStatus: 'running',
        },
      ]);

      // 2b. 将 assistant(tool_calls) 追加到消息历史
      messages.push({
        role: 'assistant',
        content: null,
        tool_calls: [tc],
      });
      historyMessages.current.push(messages[messages.length - 1]);

      // 2c. 执行工具（根据 function.name 调用对应 API）
      const runner = toolRunners[toolName];
      if (!runner) {
        const errMsg = `未知工具: ${toolName}`;
        const errId = nextId();
        setUiMessages((prev) => [
          ...prev,
          { id: errId, role: 'error', content: errMsg },
        ]);
        messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify({ error: errMsg }) });
        historyMessages.current.push(messages[messages.length - 1]);
        continue;
      }

      let toolResult: any;
      try {
        toolResult = await runner(args); // 在此处调用api
      } catch (err: any) {
        const errMsg = `工具调用失败: ${err.message}`;
        const errId = nextId();
        setUiMessages((prev) => [
          ...prev,
          { id: errId, role: 'error', content: errMsg },
        ]);
        toolResult = { error: err.message };
      }

      // 2d. 将 tool 结果追加到消息历史
      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify(toolResult),
      });
      historyMessages.current.push(messages[messages.length - 1]);

      // 2e. 更新 UI 上的工具调用卡片为完成状态
      const resultSummary = toolResult?.id
        ? `工单 ${toolResult.id} 已创建`
        : Array.isArray(toolResult)
          ? `找到 ${toolResult.length} 条结果`
          : `执行完成`;
      setUiMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last.role === 'tool-call') {
          copy[copy.length - 1] = {
            ...last,
            toolStatus: 'done',
            resultCount: Array.isArray(toolResult) ? toolResult.length : 1,
            toolResult: resultSummary,
          };
        }
        return copy;
      });
    }

    // 步骤3：携带完整消息历史再次请求 LLM，获取最终回复
    try {
      const finalRes = await sendChatMessage(messages);
      const finalReply: ChatMessage = { role: 'assistant', content: finalRes.content || '' };
      messages.push(finalReply);
      historyMessages.current.push(finalReply);
      const finalId = nextId();
      setUiMessages((prev) => [
        ...prev,
        { id: finalId, role: 'assistant', content: finalRes.content || '' },
      ]);
    } catch (err: any) {
      const errId = nextId();
      setUiMessages((prev) => [
        ...prev,
        { id: errId, role: 'error', content: '获取最终回复失败: ' + err.message },
      ]);
      return;
    }
  };

  const handleSend = async (value: string) => {
    if (!value.trim() || sending) return;

    const userText = value.trim();
    setInputValue('');
    setSending(true);

    // 添加用户消息到 UI
    const userMsg: UIMessage = { id: nextId(), role: 'user', content: userText };
    setUiMessages((prev) => [...prev, userMsg]);

    try {
      // 仅发送当前用户输入，不携带历史消息
      const apiMessages: ChatMessage[] = [{ role: 'user', content: userText }];
      await executeChatLoop(apiMessages);
      // 请求结束后，将本次完整会话保存到历史记录
    } catch (err: any) {
      const errId = nextId();
      setUiMessages((prev) => [
        ...prev,
        { id: errId, role: 'error', content: '请求失败: ' + err.message },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
      }}
    >
      {/* 标题栏 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <Text strong style={{ fontSize: 15 }}>
          🤖 AI 助手
        </Text>
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          onClick={onClose}
        />
      </div>

      {/* 聊天内容区 */}
      <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
        {/* 加载欢迎语中 */}
        {!initialGreeting && uiMessages.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
            <Spin size="small" style={{ marginRight: 6 }} />
            连接中...
          </div>
        )}

        {/* 消息列表 */}
        {uiMessages.map((msg) => {
          if (msg.role === 'tool-call') {
            return (
              <div
                key={msg.id}
                style={{
                  border: '1px solid #e8e8e8',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                  background: '#fafafa',
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 6 }}>
                  {msg.toolStatus === 'running' ? '🔧 调用工具' : '✅ 调用工具'}
                </div>
                <div style={{ color: '#1677ff', marginBottom: 4, fontFamily: 'monospace' }}>
                  {msg.toolName}
                </div>
                {msg.toolArgs && (
                  <div style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>
                    {Object.entries(msg.toolArgs).map(([k, v]) => (
                      <div key={k}>
                        {k}: <span style={{ color: '#333' }}>"{String(v)}"</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ borderTop: '1px solid #e8e8e8', margin: '8px 0 4px' }} />
                {msg.toolStatus === 'running' ? (
                  <div style={{ color: '#999' }}>
                    <Spin size="small" style={{ marginRight: 6 }} />
                    {toolRunningLabels[msg.toolName || ''] || '执行中'}...
                  </div>
                ) : (
                  <div style={{ color: '#52c41a' }}>
                    ✅ {msg.toolResult || `返回 ${msg.resultCount} 条结果`}
                  </div>
                )}
              </div>
            );
          }

          if (msg.role === 'error') {
            return (
              <div
                key={msg.id}
                style={{
                  padding: '10px 14px',
                  marginBottom: 12,
                  background: '#fff2f0',
                  border: '1px solid #ffccc7',
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#ff4d4f',
                }}
              >
                <WarningOutlined style={{ marginRight: 6 }} />
                {msg.content}
              </div>
            );
          }

          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: isUser ? '#1677ff' : '#f6f8fa',
                  color: isUser ? '#fff' : '#333',
                  fontSize: 13,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 输入框 */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0' }}>
        <Input.Search
          value={inputValue}
          placeholder="请输入问题..."
          enterButton={<SendOutlined />}
          onChange={(e) => setInputValue(e.target.value)}
          onSearch={handleSend}
          disabled={sending}
        />
      </div>
    </div>
  );
}
