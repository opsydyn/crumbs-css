import { expect, test } from 'bun:test';
import { initialContainerScenario, updateContainerScenario } from '../src/components/container-conditions/container-model';
test('container controls constrain one owner without altering its sibling', () => { const start = initialContainerScenario(); expect(start).toEqual({ a: { width: 176, mounted: true, key: 0 }, b: { width: 288 }, nested: false, height: 120, portal: 'closed' }); let next = start; for (const [action, width] of [['same-bucket', 200], ['wide', 288], ['boundary', 240], ['narrow', 176]] as const) {
    next = updateContainerScenario(next, action);
    expect(next.a.width).toBe(width);
    expect(next.b).toBe(start.b);
} next = updateContainerScenario(next, 'unmount'); expect(next.a.mounted).toBe(false); next = updateContainerScenario(next, 'remount'); expect(next.a).toEqual({ width: 176, mounted: true, key: 1 }); expect(next.b).toBe(start.b); expect(updateContainerScenario(next, 'height-tall').height).toBe(180); expect(updateContainerScenario(next, 'height-short').height).toBe(120); expect(updateContainerScenario(next, 'toggle-nested').nested).toBe(true); for (const [action, portal] of [['open-source-portal', 'source'], ['open-destination-portal', 'destination'], ['close-portal', 'closed']] as const)
    expect(updateContainerScenario(next, action).portal).toBe(portal); expect(start.a.width).toBe(176); });
