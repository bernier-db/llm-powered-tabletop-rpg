import { describe, it, expect, beforeEach } from 'vitest';
import { HealthTracker } from './health-tracker.js';

describe('HealthTracker', () => {
  let tracker: HealthTracker;

  beforeEach(() => {
    tracker = new HealthTracker();
  });

  it('reports initial state as down', () => {
    const status = tracker.getStatus('db');
    expect(status.status).toBe('down');
    expect(status.lastSuccess).toBeNull();
    expect(status.lastError).toBeNull();
    expect(status.errorCountSinceSuccess).toBe(0);
  });

  it('transitions to healthy on success', () => {
    tracker.recordSuccess('db');
    const status = tracker.getStatus('db');
    expect(status.status).toBe('healthy');
    expect(status.lastSuccess).toBeInstanceOf(Date);
    expect(status.errorCountSinceSuccess).toBe(0);
  });

  it('transitions to degraded on error after success', () => {
    tracker.recordSuccess('db');
    tracker.recordError('db', new Error('connection lost'));
    const status = tracker.getStatus('db');
    expect(status.status).toBe('degraded');
    expect(status.lastError).toBeInstanceOf(Date);
    expect(status.errorCountSinceSuccess).toBe(1);
  });

  it('stays down on error with no prior success', () => {
    tracker.recordError('db', new Error('unreachable'));
    const status = tracker.getStatus('db');
    expect(status.status).toBe('down');
    expect(status.errorCountSinceSuccess).toBe(1);
  });

  it('increments error count across multiple errors', () => {
    tracker.recordSuccess('db');
    tracker.recordError('db', new Error('err1'));
    tracker.recordError('db', new Error('err2'));
    tracker.recordError('db', new Error('err3'));
    const status = tracker.getStatus('db');
    expect(status.errorCountSinceSuccess).toBe(3);
    expect(status.status).toBe('degraded');
  });

  it('resets error count on subsequent success', () => {
    tracker.recordSuccess('db');
    tracker.recordError('db', new Error('err'));
    tracker.recordSuccess('db');
    const status = tracker.getStatus('db');
    expect(status.errorCountSinceSuccess).toBe(0);
    expect(status.status).toBe('healthy');
  });

  it('tracks multiple components independently', () => {
    tracker.recordSuccess('db');
    tracker.recordError('llm', new Error('timeout'));

    expect(tracker.getStatus('db').status).toBe('healthy');
    expect(tracker.getStatus('llm').status).toBe('down');
  });

  it('getAllStatuses returns all tracked components', () => {
    tracker.recordSuccess('db');
    tracker.recordError('llm', new Error('timeout'));
    tracker.recordSuccess('embedding');

    const all = tracker.getAllStatuses();
    expect(all.size).toBe(3);
    expect(all.get('db')?.status).toBe('healthy');
    expect(all.get('llm')?.status).toBe('down');
    expect(all.get('embedding')?.status).toBe('healthy');
  });
});
