
export interface Person {
  id: string;
  name: string;
  address: string;
  phone?: string;
  isCompleted: boolean;
  notes?: string;
}

export interface Stats {
  total: number;
  completed: number;
  pending: number;
}
