export type QueueRunState = 'open' | 'paused' | 'closed';
export type IntegrationType = 'api' | 'webhook' | 'manual' | 'gateway';

export interface Venue {
  id: string;
  name: string;
  location?: string;
}

export interface Restaurant {
  id: string;
  venueId: string;
  name: string;
  category: string;
  isActive: boolean;
}

export interface QueueStatus {
  restaurantId: string;
  currentNumber: number;
  recentNumbers: number[];
  state: QueueRunState;
  avgSecondsPerTicket?: number;
  updatedAt: string;
}

export interface QueueEvent {
  id: string;
  restaurantId: string;
  type: 'called' | 'skipped' | 'paused' | 'resumed' | 'reset';
  number?: number;
  occurredAt: string;
  source: IntegrationType;
}

export interface IntegrationConfig {
  restaurantId: string;
  type: IntegrationType;
  apiEndpoint?: string;
  webhookUrl?: string;
  pollingIntervalSeconds?: number;
  /** Name/reference only. Never store an actual API key in frontend code. */
  apiKeySecretName?: string;
  gatewayDeviceId?: string;
}

export interface QueueAdapter {
  getStatus(restaurantId: string): Promise<QueueStatus>;
  subscribe?(restaurantId: string, onEvent: (event: QueueEvent) => void): () => void;
}
