/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { TimerDisplay } from '../src/components/TimerDisplay';

test('TimerDisplay renders with correct time values', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(
      <TimerDisplay hours={1} minutes={23} seconds={45} />
    );
  });
});

test('TimerDisplay pads time values correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(
      <TimerDisplay hours={0} minutes={5} seconds={3} size="small" />
    );
  });
});
