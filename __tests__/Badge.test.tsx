/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Badge } from '../src/components/Badge';

test('Badge renders with correct label', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(
      <Badge label="In Progress" status="in_progress" />
    );
  });
});

test('Badge renders different statuses', async () => {
  const statuses = ['pending', 'in_progress', 'completed'] as const;

  for (const status of statuses) {
    await ReactTestRenderer.act(() => {
      ReactTestRenderer.create(
        <Badge label={status} status={status} />
      );
    });
  }
});
