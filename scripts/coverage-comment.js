import { readFile } from 'node:fs/promises';

const marker = '<!-- leftblank-coverage -->';

function percentage(value) {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error('Invalid coverage percentage');
  }
  return `${value.toFixed(2)}%`;
}

export function report(javascript, python, { sha, url }) {
  if (
    !/^[a-f0-9]{40}$/.test(sha) ||
    !/^https:\/\/github.com\/[\w.-]+\/[\w.-]+\/actions\/runs\/\d+$/.test(url)
  ) {
    throw new Error('Invalid workflow identity');
  }
  const metrics = ['statements', 'branches', 'functions', 'lines'];
  const rows = metrics.map(
    (metric) =>
      `| ${metric} | ${percentage(javascript.total[metric].pct)} | 80% per file |`,
  );
  const pythonResult =
    python === null
      ? 'Python checker: no report was produced because CI did not complete this scope.'
      : `Python checker (lines + branches): **${percentage(python.totals.percent_covered)}**; required **80%**.`;
  return `${marker}\nCoverage for \`${sha.slice(0, 7)}\`\n\n| JavaScript | Coverage | Required |\n| --- | ---: | ---: |\n${rows.join('\n')}\n\n${pythonResult}\n\n[CI run and downloadable HTML coverage reports](${url})\n\nCoverage thresholds are enforced by the test runners; a below-threshold run fails CI.`;
}

export default async function publish({ github, context, core }) {
  const run = context.payload.workflow_run;
  const { owner, repo } = context.repo;
  const pulls = await github.paginate(
    github.rest.repos.listPullRequestsAssociatedWithCommit,
    { owner, repo, commit_sha: run.head_sha },
  );
  const candidate = pulls.find((pull) => pull.head.sha === run.head_sha);
  if (!candidate) {
    core.info('No matching PR for this commit; skipping stale coverage.');
    return;
  }
  const { data: current } = await github.rest.pulls.get({
    owner,
    repo,
    pull_number: candidate.number,
  });
  if (
    current.head.sha !== run.head_sha ||
    (current.state === 'closed' && !current.merged)
  ) {
    core.info('A newer commit is present; skipping stale coverage.');
    return;
  }
  const javascript = JSON.parse(
    await readFile('reports/coverage-summary.json', 'utf8'),
  );
  const python = JSON.parse(
    await readFile('reports/python.json', 'utf8').catch((error) => {
      if (error.code === 'ENOENT') {
        return 'null';
      }
      throw error;
    }),
  );
  const body = report(javascript, python, {
    sha: run.head_sha,
    url: run.html_url,
  });
  const comments = await github.paginate(github.rest.issues.listComments, {
    owner,
    repo,
    issue_number: candidate.number,
  });
  const existing = comments.find(
    (comment) =>
      comment.user.login === 'github-actions[bot]' &&
      comment.body.startsWith(marker),
  );
  if (existing) {
    await github.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existing.id,
      body,
    });
  } else {
    await github.rest.issues.createComment({
      owner,
      repo,
      issue_number: candidate.number,
      body,
    });
  }
}
