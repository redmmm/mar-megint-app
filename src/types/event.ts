export interface SkatemapEvent {
  id: string;
  title: string;
  message: string;
  icon?: string;
  link_url?: string;
  link_text?: string;
  start_at: string;
  end_at: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateEventInput {
  title: string;
  message: string;
  icon?: string;
  link_url?: string;
  link_text?: string;
  start_at: string;
  end_at: string;
  is_active?: boolean;
}

export interface UpdateEventInput {
  title?: string;
  message?: string;
  icon?: string;
  link_url?: string;
  link_text?: string;
  start_at?: string;
  end_at?: string;
  is_active?: boolean;
}
