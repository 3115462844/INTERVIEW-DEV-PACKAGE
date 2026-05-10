import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LeftSidebar from '../components/LeftSidebar';
import type { Building } from '../types';

const mockBuildings: Building[] = [
  { id: 'B1', name: 'B1 栋', floors: 20, deviceCount: 32 },
  { id: 'B2', name: 'B2 栋', floors: 15, deviceCount: 28 },
];

describe('LeftSidebar', () => {
  it('renders building list', () => {
    render(
      <LeftSidebar
        buildings={mockBuildings}
        selectedBuilding="B1"
        onBuildingChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
      />
    );

    expect(screen.getByText('B1 栋')).toBeInTheDocument();
    expect(screen.getByText('B2 栋')).toBeInTheDocument();
    expect(screen.getByText('楼栋选择')).toBeInTheDocument();
  });

  it('calls onBuildingChange when a building is clicked', () => {
    const onBuildingChange = vi.fn();
    render(
      <LeftSidebar
        buildings={mockBuildings}
        selectedBuilding="B1"
        onBuildingChange={onBuildingChange}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('B2 栋'));
    expect(onBuildingChange).toHaveBeenCalledWith('B2');
  });

  it('calls onStatusFilterChange when a status is selected', () => {
    const onStatusFilterChange = vi.fn();
    render(
      <LeftSidebar
        buildings={mockBuildings}
        selectedBuilding="B1"
        onBuildingChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={onStatusFilterChange}
      />
    );

    fireEvent.click(screen.getByText('故障'));
    expect(onStatusFilterChange).toHaveBeenCalledWith('fault');
  });

  it('shows loading spinner when loading is true', () => {
    render(
      <LeftSidebar
        buildings={[]}
        loading={true}
        selectedBuilding=""
        onBuildingChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
      />
    );

    expect(screen.getByText('楼栋选择')).toBeInTheDocument();
    expect(screen.queryByText('B1 栋')).not.toBeInTheDocument();
  });
});
