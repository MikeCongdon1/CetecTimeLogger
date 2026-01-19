export interface Order {
  id: string;
  orderNumber: string;
  clientName: string;
  service: string;
  location: string;
  status: 'pending' | 'in_progress' | 'completed';
  elapsedTime?: {
    hours: number;
    minutes: number;
    seconds: number;
  };
  isActive?: boolean;
}

export type OrderStatus = Order['status'];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
};
