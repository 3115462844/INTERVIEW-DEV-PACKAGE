import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchBuildings, fetchDevices } from '../api';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('fetchBuildings', () => {
  it('returns building list on success', async () => {
    const mockData = [
      { id: 'B1', name: 'B1 栋', floors: 20, deviceCount: 32 },
    ];
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response);

    const result = await fetchBuildings();
    expect(result).toEqual(mockData);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/buildings',
      expect.objectContaining({ headers: { 'Content-Type': 'application/json' } })
    );
  });

  it('throws error when response is not ok', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ message: 'Server error' }),
    } as Response);

    await expect(fetchBuildings()).rejects.toThrow('Server error');
  });

  it('throws error for 404', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ message: 'Not found' }),
    } as Response);

    await expect(fetchBuildings()).rejects.toThrow('Not found');
  });
});

describe('fetchDevices', () => {
  it('sends query parameters correctly', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    } as Response);

    await fetchDevices({ buildingId: 'B1', status: 'fault' });

    const calledUrl = (globalThis.fetch as any).mock.calls[0][0];
    expect(calledUrl).toContain('buildingId=B1');
    expect(calledUrl).toContain('status=fault');
  });

  it('omits undefined parameters from query', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    } as Response);

    await fetchDevices({ buildingId: 'B1' });

    const calledUrl = (globalThis.fetch as any).mock.calls[0][0];
    expect(calledUrl).toContain('buildingId=B1');
    expect(calledUrl).not.toContain('status');
  });
});
