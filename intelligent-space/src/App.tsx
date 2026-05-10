import { useState, useEffect, lazy, Suspense } from 'react';
import { Layout, Button, ConfigProvider, message, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import HeaderBar from './components/HeaderBar';
import type { TabKey } from './components/HeaderBar';
import LeftSidebar from './components/LeftSidebar';
import { fetchBuildings } from './api';
import type { Building } from './types';
import './App.css';

const { Header, Sider, Content } = Layout;

// 按需加载页面组件
const Dashboard = lazy(() => import('./pages/Dashboard'));
const WorkOrders = lazy(() => import('./pages/WorkOrders'));
const AiPanel = lazy(() => import('./components/AiPanel'));


export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingsLoading, setBuildingsLoading] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [aiOpen, setAiOpen] = useState(false);

  // 初始加载楼栋列表
  useEffect(() => {
    setBuildingsLoading(true);
    fetchBuildings()
      .then((data) => {
        setBuildings(data);
        if (data.length > 0) {
          setSelectedBuilding(data[0].id);
        }
      })
      .catch((err) => {
        message.error('加载楼栋数据失败: ' + err.message);
      })
      .finally(() => {
        setBuildingsLoading(false);
      });
  }, []);

  return (
    <ConfigProvider locale={zhCN}>
      <Layout className="app-layout">
        {/* 顶部导航栏：标题 + Tab + 用户头像 */}
        <Header className="app-header">
          <HeaderBar activeTab={activeTab} onTabChange={setActiveTab} />
        </Header>

        {/* 主体区域：左侧边栏 | 内容区 | AI面板 */}
        <Layout style={{ flex: 1, overflow: 'hidden' }}>
          {/* 左侧边栏：仅在设备看板时显示 */}
          {activeTab === 'dashboard' && (
            <Sider width={200} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
              <LeftSidebar
                buildings={buildings}
                loading={buildingsLoading}
                selectedBuilding={selectedBuilding}
                onBuildingChange={setSelectedBuilding}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
              />
            </Sider>
          )}

          {/* 主内容区 */}
          <Content style={{ padding: 24, background: '#f5f5f5' }}>
            <Suspense fallback={<div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>}>
              {activeTab === 'dashboard' ? (
                <Dashboard selectedBuilding={selectedBuilding} statusFilter={statusFilter} />
              ) : (
                <WorkOrders />
              )}
            </Suspense>
          </Content>

          {/* AI 助手侧栏（默认收起） */}
          {aiOpen && (
            <Sider
              width={360}
              theme="light"
              style={{ borderLeft: '1px solid #f0f0f0', height: '100%' }}
            >
              <Suspense fallback={<div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>}>
                <AiPanel onClose={() => setAiOpen(false)} />
              </Suspense>
            </Sider>
          )}
        </Layout>

        {/* 底部 AI 助手唤起按钮（仅在 AI 面板关闭时显示） */}
        {!aiOpen && (
          <div className="app-bottom-bar">
            <Button type="primary" ghost onClick={() => setAiOpen(true)}>
              🤖 AI 助手
            </Button>
          </div>
        )}
      </Layout>
    </ConfigProvider>
  );
}
