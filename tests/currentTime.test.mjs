import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computed, effectScope, nextTick } from 'vue';
import { DateTime } from 'luxon';

test('today follows midnight and refreshes when returning to the calendar', async (t) => {
  globalThis.window = new EventTarget();
  globalThis.document = new EventTarget();
  t.after(() => {
    delete globalThis.window;
    delete globalThis.document;
  });

  const beforeMidnight = new Date(2026, 10, 11, 23, 59, 59);
  t.mock.timers.enable({ apis: ['Date', 'setInterval'], now: beforeMidnight.getTime() });
  const { useCurrentTime } = await import('../src/composables/useCurrentTime.ts');
  const scope = effectScope();
  t.after(() => scope.stop());
  const now = scope.run(() => useCurrentTime());
  const previousDay = DateTime.fromJSDate(beforeMidnight).startOf('day');
  const nextDay = previousDay.plus({ days: 1 });
  const previousHighlighted = computed(() => previousDay.hasSame(now.value, 'day'));
  const nextHighlighted = computed(() => nextDay.hasSame(now.value, 'day'));
  await nextTick();

  assert.equal(previousHighlighted.value, true);
  assert.equal(nextHighlighted.value, false);
  t.mock.timers.tick(1_000);
  assert.equal(previousHighlighted.value, false);
  assert.equal(nextHighlighted.value, true);

  for (const [target, event] of [[window, 'focus'], [document, 'visibilitychange']]) {
    t.mock.timers.setTime(Date.now() + 86_400_000);
    target.dispatchEvent(new Event(event));
    assert.equal(now.value.toMillis(), Date.now());
  }

  const lastUpdate = now.value.toMillis();
  scope.stop();
  t.mock.timers.tick(1_000);
  window.dispatchEvent(new Event('focus'));
  assert.equal(now.value.toMillis(), lastUpdate);
});
