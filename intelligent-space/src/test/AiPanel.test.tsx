import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AiPanel from '../components/AiPanel';

// Mock the API module
const mockSendChatMessage = vi.fn();
const mockFetchDevices = vi.fn();

vi.mock('../api', () => ({
  sendChatMessage: (...args: any[]) => mockSendChatMessage(...args),
  fetchDevices: (...args: any[]) => mockFetchDevices(...args),
  fetchAlerts: vi.fn(),
  createWorkOrder: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AiPanel', () => {
  it('shows loading state on mount, then displays greeting', async () => {
    // Make the initial greeting API resolve with a delay
    mockSendChatMessage.mockResolvedValueOnce({
      role: 'assistant',
      content: '你好！我是智慧空间 AI 助手',
    });

    render(<AiPanel onClose={vi.fn()} />); // 常见虚拟的DOM环境，模拟浏览器

    // Should show loading initially
    expect(screen.getByText('连接中...')).toBeInTheDocument();

    // After API resolves, greeting should appear
    await waitFor(() => {
      expect(screen.getByText('你好！我是智慧空间 AI 助手')).toBeInTheDocument();
    });
  });

  it('sends user message and displays it in the chat', async () => {
    // Initial greeting
    mockSendChatMessage.mockResolvedValueOnce({
      role: 'assistant',
      content: '你好！',
    });

    render(<AiPanel onClose={vi.fn()} />);

    // Wait for greeting to load
    await waitFor(() => {
      expect(screen.getByText('你好！')).toBeInTheDocument();
    });

    // Mock the response for the user's message (direct text reply)
    mockSendChatMessage.mockResolvedValueOnce({
      role: 'assistant',
      content: 'B3栋有 3 台设备',
    });

    // Type and send a message
    const input = screen.getByPlaceholderText('请输入问题...');
    fireEvent.change(input, { target: { value: 'B3栋有哪些设备？' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    // Also click the send button
    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);

    // User message should appear
    await waitFor(() => {
      expect(screen.getByText('B3栋有哪些设备？')).toBeInTheDocument();
    });

    // Assistant reply should appear
    await waitFor(() => {
      expect(screen.getByText('B3栋有 3 台设备')).toBeInTheDocument();
    });
  });

  it('shows error message when API call fails', async () => {
    // Initial greeting
    mockSendChatMessage.mockResolvedValueOnce({
      role: 'assistant',
      content: '你好！',
    });

    render(<AiPanel onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('你好！')).toBeInTheDocument();
    });

    // Mock API failure
    mockSendChatMessage.mockRejectedValueOnce(new Error('Network error'));

    // Send a message
    const input = screen.getByPlaceholderText('请输入问题...');
    fireEvent.change(input, { target: { value: '查询设备' } });
    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);

    // Error message should appear
    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });
});
