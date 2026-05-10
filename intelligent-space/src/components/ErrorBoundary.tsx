import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Button, Typography } from 'antd';

const { Title, Text } = Typography;

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            padding: 24,
            textAlign: 'center',
            background: '#f5f5f5',
          }}
        >
          <Title level={3} style={{ color: '#ff4d4f' }}>
            页面出现错误
          </Title>
          <Text type="secondary" style={{ marginBottom: 24, maxWidth: 500 }}>
            {this.state.error?.message || '应用发生了意外错误'}
          </Text>
          <Button type="primary" onClick={this.handleReset}>
            重新加载
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
