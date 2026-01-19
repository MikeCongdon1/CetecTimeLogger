/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { OrderCard } from '../src/components/OrderCard';
import { Order } from '../src/types';

const mockOrder: Order = {
  id: '1',
  orderNumber: '4029',
  clientName: 'Test Client',
  service: 'Test Service',
  location: 'Test Location',
  status: 'in_progress',
  isActive: true,
};

test('OrderCard renders with order data', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<OrderCard order={mockOrder} />);
  });
});

test('OrderCard handles different order statuses', async () => {
  const statuses = ['pending', 'in_progress', 'completed'] as const;

  for (const status of statuses) {
    const order = { ...mockOrder, status };
    await ReactTestRenderer.act(() => {
      ReactTestRenderer.create(<OrderCard order={order} />);
    });
  }
});
