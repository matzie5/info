export enum UserRole {
  FACILITATOR = 'FACILITATOR',
  RED_TEAM = 'RED_TEAM',
  BLUE_TEAM = 'BLUE_TEAM',
  OBSERVER = 'OBSERVER'
}

export enum SessionStatus {
  LOBBY = 'LOBBY',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED'
}

export enum SessionPhase {
  LEARNING = 'LEARNING',
  TESTING = 'TESTING',
  COMPLETED = 'COMPLETED'
}

export enum DemographicCluster {
  HYPER_PARTISAN_A = 'Hyper-Partisan A',
  HYPER_PARTISAN_B = 'Hyper-Partisan B',
  INSTITUTIONAL_SKEPTICS = 'Institutional Skeptics',
  SUSCEPTIBLE_NEUTRALS = 'Susceptible Neutrals',
  APOLITICAL_YOUTH = 'Apolitical Youth'
}

export enum ActionType {
  DEPLOY_BOT_SWARM = 'DEPLOY_BOT_SWARM',
  AI_DEEPFAKE_ARTICLE = 'AI_DEEPFAKE_ARTICLE',
  MICROTARGET_CLUSTER = 'MICROTARGET_CLUSTER',
  ASTROTURF_COMMENTS = 'ASTROTURF_COMMENTS',
  PREBUNK_CAMPAIGN = 'PREBUNK_CAMPAIGN',
  EVIDENCE_DEBUNK = 'EVIDENCE_DEBUNK',
  VELOCITY_FRICTION = 'VELOCITY_FRICTION',
  PUBLIC_ADVISORY = 'PUBLIC_ADVISORY',
  CRISIS_INJECT = 'CRISIS_INJECT'
}

export interface SimulationMetrics {
  virality_index: number;
  polarization_score: number;
  institutional_trust: number;
  disinformation_reach: number;
  debunk_effectiveness: number;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd_estimated: number;
  budget_limit_tokens: number;
  is_throttled: boolean;
  is_circuit_breaker_tripped: boolean;
  requests_count: number;
}

export interface TeamBudgets {
  red_team_capital: number;
  blue_team_bandwidth: number;
  red_cooldowns: Record<string, number>;
  blue_cooldowns: Record<string, number>;
}

export interface PlayerPresence {
  user_id: string;
  role: UserRole;
  handle: string;
  last_heartbeat: number;
  is_active: boolean;
}

export interface Comment {
  id: string;
  author_name: string;
  author_handle: string;
  author_avatar?: string;
  content: string;
  timestamp?: number;
  is_bot: boolean;
  likes_count: number;
}

export interface FeedItem {
  id: string;
  session_id: string;
  author_name: string;
  author_handle: string;
  author_avatar?: string;
  is_verified: boolean;
  headline?: string;
  content: string;
  media_url?: string;
  created_at_tick: number;
  likes_count: number;
  shares_count: number;
  comments_count: number;
  is_amplified: boolean;
  is_debunked: boolean;
  debunk_friction: number;
  fact_check_label?: string;
  prebunk_shield_active: boolean;
  outrage_score: number;
  bias_score: number;
  virality_velocity: number;
  targeted_clusters: string[];
  comments: Comment[];
}

export interface Session {
  id: string;
  title: string;
  scenario_id: string;
  status: SessionStatus;
  phase?: SessionPhase;
  phase_timer_seconds?: number;
  phase_timer_running?: boolean;
  phase_started_at?: number;
  learning_duration_minutes?: number;
  testing_duration_minutes?: number;
  current_tick: number;
  max_ticks: number;
  language: string;
  metrics: SimulationMetrics;
  token_usage: TokenUsage;
  budgets: TeamBudgets;
  players: Record<string, PlayerPresence>;
  history_metrics: any[];
}

export interface PlayerAction {
  id: string;
  session_id: string;
  user_id: string;
  team: UserRole;
  action_type: ActionType;
  target_post_id?: string;
  target_cluster?: string;
  headline?: string;
  content?: string;
  resource_cost?: number;
  tick?: number;
  timestamp?: number;
  is_processed?: boolean;
}

