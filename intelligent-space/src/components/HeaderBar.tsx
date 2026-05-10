import { Segmented, Image } from 'antd';
import userAvatar from '../assets/欧萌.svg';

export type TabKey = 'dashboard' | 'workorders';

interface HeaderBarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

const tabOptions = [
  { value: 'dashboard' as const, label: '设备看板' },
  { value: 'workorders' as const, label: '工单管理' },
];

export default function HeaderBar({ activeTab, onTabChange }: HeaderBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        justifyContent: 'space-between',
      }}
    >
      {/* 左侧标题 */}
      <div style={{ fontSize: 18, fontWeight: 700, color: '#1677ff', whiteSpace: 'nowrap' }}>
        🏢 星汇智慧空间
      </div>

      {/* 中间 Tab 切换 */}
      <Segmented
        value={activeTab}
        onChange={(value) => onTabChange(value as TabKey)}
        options={tabOptions}
        style={{ margin: '0 24px' }}
      />

      {/* 右侧用户头像（点击可查看大图） */}
      <Image
        src={userAvatar}
        width={32}
        height={32}
        style={{ borderRadius: '50%', cursor: 'pointer', marginTop: -29 }}
        preview={{ mask: null }}
      />
    </div>
  );
}
