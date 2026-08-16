export type QueueRunState = 'open' | 'paused' | 'closed';
export type IntegrationType = 'api' | 'webhook' | 'manual' | 'gateway';
export type QueueEventType = 'called' | 'skipped' | 'paused' | 'resumed' | 'reset';
export type NotificationLead = 1 | 3 | 5 | 10;

export interface Venue {
  id: string;
  name: string;
  location?: string;
  timezone: string;
  capacityTarget?: number;
}

export interface Restaurant {
  id: string;
  venueId: string;
  name: string;
  category: string;
  floor?: string;
  zone?: string;
  isActive: boolean;
  searchAliases?: string[];
}

/** Distinguishes repeated ticket numbers across breakfast/lunch/dinner or daily resets. */
export interface QueueSession {
  id: string;
  restaurantId: string;
  businessDate: string;
  label?: string;
  startedAt: string;
  endedAt?: string;
}

export interface QueueStatus {
  restaurantId: string;
  queueSessionId: string;
  currentNumber: number;
  recentNumbers: number[];
  state: QueueRunState;
  avgSecondsPerTicket?: number;
  updatedAt: string;
  source: IntegrationType;
}

export interface QueueEvent {
  id: string;
  restaurantId: string;
  queueSessionId: string;
  type: QueueEventType;
  number?: number;
  occurredAt: string;
  source: IntegrationType;
  sequence: number;
}

export interface IntegrationConfig {
  restaurantId: string;
  type: IntegrationType;
  apiEndpoint?: string;
  webhookUrl?: string;
  pollingIntervalSeconds?: number;
  /** Reference only. Never store the actual secret in browser code. */
  apiKeySecretName?: string;
  gatewayDeviceId?: string;
  enabled: boolean;
}

/** Anonymous by default. Can later be upgraded to an authenticated account. */
export interface VisitorSession {
  id: string;
  venueId: string;
  createdAt: string;
  lastSeenAt: string;
  lastRoute?: string;
  deviceLabel?: string;
}

export interface TrackedOrder {
  id: string;
  visitorSessionId: string;
  restaurantId: string;
  queueSessionId: string;
  ticketNumber: number;
  orderToken?: string;
  notificationLead: NotificationLead;
  notificationsEnabled: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface QueueEstimate {
  groupsAhead: number;
  estimatedSeconds: number;
  status: 'waiting' | 'soon' | 'called' | 'possibly-missed';
}

export interface SearchFilters {
  query: string;
  category?: string;
  openOnly?: boolean;
  sortBy?: 'relevance' | 'wait' | 'name';
}

export interface QueueAdapter {
  getStatus(restaurantId: string): Promise<QueueStatus>;
  subscribe?(restaurantId: string, onEvent: (event: QueueEvent) => void): () => void;
}
