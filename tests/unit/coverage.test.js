import { afterAll, beforeEach, expect, test, vi } from 'vitest';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { report } from '../../scripts/coverage-comment.js';

const summary = {
  total: Object.fromEntries(
    ['statements', 'branches', 'functions', 'lines'].map((metric) => [
      metric,
      { pct: 85.5 },
    ]),
  ),
};
const identity = {
  sha: 'a'.repeat(40),
  url: 'https://github.com/leftblank-app/website/actions/runs/123',
};

beforeEach(async () => {
  await rm('reports', { recursive: true, force: true });
  await mkdir('reports', { recursive: true });
  await writeFile('reports/coverage-summary.json', JSON.stringify(summary));
  await writeFile(
    'reports/python.json',
    JSON.stringify({ totals: { percent_covered: 90 } }),
  );
});
afterAll(async () => {
  await rm('reports', { recursive: true, force: true });
});

test('renders both coverage scopes with their actual thresholds', () => {
  const body = report(summary, { totals: { percent_covered: 90 } }, identity);
  expect(body).toContain('| branches | 85.50% | 80% per file |');
  expect(body).toContain('**90.00%**');
  expect(body).toContain('aaaaaaa');
});

test.each([-1, 101, NaN, '80'])('rejects invalid metrics: %s', (value) => {
  expect(() =>
    report(summary, { totals: { percent_covered: value } }, identity),
  ).toThrow('Invalid coverage');
});

test.each([
  { ...identity, sha: 'injected' },
  { ...identity, url: 'https://untrusted.test/' },
])('rejects untrusted identity fields', (value) => {
  expect(() =>
    report(summary, { totals: { percent_covered: 90 } }, value),
  ).toThrow('Invalid workflow identity');
});

function api({
  pulls = [{ number: 4, state: 'open', head: { sha: identity.sha } }],
  currentSha = identity.sha,
  currentState = 'open',
  merged = false,
  comments = [],
} = {}) {
  const associated = vi.fn();
  const listComments = vi.fn();
  const github = {
    paginate: vi.fn((method) =>
      Promise.resolve(method === associated ? pulls : comments),
    ),
    rest: {
      repos: { listPullRequestsAssociatedWithCommit: associated },
      pulls: {
        get: vi.fn(async () => ({
          data: { head: { sha: currentSha }, state: currentState, merged },
        })),
      },
      issues: { listComments, createComment: vi.fn(), updateComment: vi.fn() },
    },
  };
  return {
    github,
    context: {
      repo: { owner: 'leftblank-app', repo: 'website' },
      payload: {
        workflow_run: { head_sha: identity.sha, html_url: identity.url },
      },
    },
    core: { info: vi.fn() },
  };
}

test('creates a comment and ignores markers posted by users', async () => {
  const state = api({
    comments: [
      { user: { login: 'someone' }, body: '<!-- leftblank-coverage -->' },
    ],
  });
  const { default: publish } =
    await import('../../scripts/coverage-comment.js');
  await publish(state);
  expect(state.github.rest.issues.createComment).toHaveBeenCalledWith(
    expect.objectContaining({
      issue_number: 4,
      body: expect.stringContaining('85.50%'),
    }),
  );
});

test('updates the bot comment instead of creating duplicates', async () => {
  const state = api({
    comments: [
      {
        id: 12,
        user: { login: 'github-actions[bot]' },
        body: '<!-- leftblank-coverage -->',
      },
    ],
  });
  const { default: publish } =
    await import('../../scripts/coverage-comment.js');
  await publish(state);
  expect(state.github.rest.issues.updateComment).toHaveBeenCalledWith(
    expect.objectContaining({ comment_id: 12 }),
  );
  expect(state.github.rest.issues.createComment).not.toHaveBeenCalled();
});

test.each([
  { pulls: [] },
  { currentSha: 'b'.repeat(40) },
  { currentState: 'closed' },
])('skips stale or closed PRs', async (options) => {
  const state = api(options);
  const { default: publish } =
    await import('../../scripts/coverage-comment.js');
  await publish(state);
  expect(state.github.rest.issues.createComment).not.toHaveBeenCalled();
  expect(state.core.info).toHaveBeenCalled();
});

test('can report on a merged PR after a manual retry', async () => {
  const state = api({ currentState: 'closed', merged: true });
  const { default: publish } =
    await import('../../scripts/coverage-comment.js');
  await publish(state);
  expect(state.github.rest.issues.createComment).toHaveBeenCalledOnce();
});

test('reports JavaScript even if Python was skipped after an earlier failure', async () => {
  await rm('reports/python.json');
  const state = api();
  const { default: publish } =
    await import('../../scripts/coverage-comment.js');
  await publish(state);
  expect(state.github.rest.issues.createComment).toHaveBeenCalledWith(
    expect.objectContaining({
      body: expect.stringContaining('no report was produced'),
    }),
  );
});

test('does not hide other artifact read errors', async () => {
  await rm('reports/python.json');
  await mkdir('reports/python.json');
  const { default: publish } =
    await import('../../scripts/coverage-comment.js');
  await expect(publish(api())).rejects.toThrow();
});
