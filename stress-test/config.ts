export const CONFIG = {
  // Target app — through nginx reverse proxy
  BASE_URL: process.env.BASE_URL || 'http://localhost:8084',

  // Admin credentials (to create test users)
  ADMIN_USERNAME: 'admin',
  ADMIN_PASSWORD: 'Damage1234@',

  // Test parameters
  AGENT_COUNT: parseInt(process.env.AGENTS || '10', 10),
  TEST_DURATION_MINUTES: parseInt(process.env.DURATION || '30', 10),

  // Agent behaviour — actions per minute per agent
  ACTIONS_PER_MINUTE: 7,

  // Action weights (probability distribution — must sum to 100)
  ACTION_WEIGHTS: {
    CREATE_DAMAGE_REPORT: 25,
    UPLOAD_PHOTOS: 15,
    VIEW_DAMAGE_LIST: 10,
    VIEW_DAMAGE_DETAIL: 10,
    TRANSITION_STATUS: 12,
    ADD_COMMENT: 8,
    SEARCH_CUSTOMERS: 5,
    SEARCH_PRODUCTS: 5,
    VIEW_DASHBOARD: 5,
    BROWSE_LOCATIONS: 3,
    LOGOUT_LOGIN: 2,
  },

  // Photo config
  PHOTOS_PER_UPLOAD_MIN: 1,
  PHOTOS_PER_UPLOAD_MAX: 3,
  PHOTO_WIDTH: 800,
  PHOTO_HEIGHT: 600,

  // Stagger agent start (avoid thundering herd)
  AGENT_STAGGER_SECONDS: 3,

  // Retry config
  MAX_RETRIES: 2,
  RETRY_DELAY_MS: 1000,

  // Rate limiting safety — pause between actions per agent
  MIN_ACTION_DELAY_MS: 2000,
  MAX_ACTION_DELAY_MS: 12000,

  // Thresholds for pass/fail
  MAX_ERROR_RATE_PERCENT: 5,
  MAX_P95_RESPONSE_MS: 3000,
  MAX_P99_RESPONSE_MS: 5000,
};

export type ActionType = keyof typeof CONFIG.ACTION_WEIGHTS;

export interface AgentPersona {
  name: string;
  role: 'WAREHOUSE_USER' | 'MANAGER' | 'ADMIN';
  style: 'fast' | 'normal' | 'slow';
  bias: ActionType;
}

export const AGENT_PERSONAS: AgentPersona[] = [
  { name: 'agent_speed_demon',    role: 'WAREHOUSE_USER', style: 'fast',   bias: 'CREATE_DAMAGE_REPORT' },
  { name: 'agent_photo_happy',    role: 'WAREHOUSE_USER', style: 'normal', bias: 'UPLOAD_PHOTOS' },
  { name: 'agent_browser',        role: 'WAREHOUSE_USER', style: 'slow',   bias: 'VIEW_DAMAGE_LIST' },
  { name: 'agent_commenter',      role: 'WAREHOUSE_USER', style: 'normal', bias: 'ADD_COMMENT' },
  { name: 'agent_forklift_frank', role: 'WAREHOUSE_USER', style: 'fast',   bias: 'CREATE_DAMAGE_REPORT' },
  { name: 'agent_new_starter',    role: 'WAREHOUSE_USER', style: 'slow',   bias: 'VIEW_DASHBOARD' },
  { name: 'agent_supervisor',     role: 'MANAGER',        style: 'normal', bias: 'TRANSITION_STATUS' },
  { name: 'agent_shift_lead',     role: 'MANAGER',        style: 'fast',   bias: 'TRANSITION_STATUS' },
  { name: 'agent_admin_jake',     role: 'ADMIN',          style: 'normal', bias: 'VIEW_DASHBOARD' },
  { name: 'agent_auditor',        role: 'MANAGER',        style: 'slow',   bias: 'VIEW_DAMAGE_DETAIL' },
];
