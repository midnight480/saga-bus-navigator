import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFirstLastBus, type GetFirstLastBusResponse } from './get-first-last-bus.js';
import { apiClient } from '../api-client.js';

// API Clientをモック化
vi.mock('../api-client.js', () => ({
  apiClient: {
    get: vi.fn()
  }
}));

describe('getFirstLastBus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return first and last bus information for a stop', async () => {
    const mockResponse: GetFirstLastBusResponse = {
      data: {
        stop_name: '佐賀駅バスセンター',
        first_bus: {
          time: '06:00',
          route_name: '1号線',
          destination: '市役所前'
        },
        last_bus: {
          time: '22:30',
          route_name: '1号線',
          destination: '市役所前'
        },
        weekday_type: 'weekday'
      }
    };

    vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

    const result = await getFirstLastBus({ stop: '佐賀駅バスセンター' });

    expect(apiClient.get).toHaveBeenCalledWith('/stops/first-last', {
      stop: '佐賀駅バスセンター',
      to: undefined,
      weekday: undefined
    });

    expect(result).toEqual({
      content: [{
        type: 'text',
        text: JSON.stringify(mockResponse, null, 2)
      }]
    });
  });

  it('should pass destination parameter when provided', async () => {
    const mockResponse: GetFirstLastBusResponse = {
      data: {
        stop_name: '佐賀駅バスセンター',
        destination: '市役所前',
        first_bus: {
          time: '06:00',
          route_name: '1号線',
          destination: '市役所前'
        },
        last_bus: {
          time: '22:30',
          route_name: '1号線',
          destination: '市役所前'
        },
        weekday_type: 'weekday'
      }
    };

    vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

    await getFirstLastBus({
      stop: '佐賀駅バスセンター',
      to: '市役所前'
    });

    expect(apiClient.get).toHaveBeenCalledWith('/stops/first-last', {
      stop: '佐賀駅バスセンター',
      to: '市役所前',
      weekday: undefined
    });
  });

  it('should pass weekday parameter when provided', async () => {
    const mockResponse: GetFirstLastBusResponse = {
      data: {
        stop_name: '佐賀駅バスセンター',
        first_bus: {
          time: '07:00',
          route_name: '1号線',
          destination: '市役所前'
        },
        last_bus: {
          time: '21:00',
          route_name: '1号線',
          destination: '市役所前'
        },
        weekday_type: 'holiday'
      }
    };

    vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

    await getFirstLastBus({
      stop: '佐賀駅バスセンター',
      weekday: 'holiday'
    });

    expect(apiClient.get).toHaveBeenCalledWith('/stops/first-last', {
      stop: '佐賀駅バスセンター',
      to: undefined,
      weekday: 'holiday'
    });
  });

  it('should pass all parameters when provided', async () => {
    const mockResponse: GetFirstLastBusResponse = {
      data: {
        stop_name: '佐賀駅バスセンター',
        destination: '市役所前',
        first_bus: {
          time: '08:00',
          route_name: '1号線',
          destination: '市役所前'
        },
        last_bus: {
          time: '20:00',
          route_name: '1号線',
          destination: '市役所前'
        },
        weekday_type: 'saturday'
      }
    };

    vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

    await getFirstLastBus({
      stop: '佐賀駅バスセンター',
      to: '市役所前',
      weekday: 'saturday'
    });

    expect(apiClient.get).toHaveBeenCalledWith('/stops/first-last', {
      stop: '佐賀駅バスセンター',
      to: '市役所前',
      weekday: 'saturday'
    });
  });

  it('should throw descriptive error when API call fails', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('Network error'));

    await expect(getFirstLastBus({ stop: '佐賀駅バスセンター' }))
      .rejects
      .toThrow('始発・終電情報の取得に失敗しました: Network error');
  });

  it('should handle non-Error exceptions', async () => {
    vi.mocked(apiClient.get).mockRejectedValue('Unknown error');

    await expect(getFirstLastBus({ stop: '佐賀駅バスセンター' }))
      .rejects
      .toThrow('始発・終電情報の取得に失敗しました: Unknown error');
  });
});
