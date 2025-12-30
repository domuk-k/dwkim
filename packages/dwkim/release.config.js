/**
 * Semantic Release Configuration for dwkim CLI
 *
 * Conventional Commits → Automatic Versioning:
 * - fix: → patch (1.0.x)
 * - feat: → minor (1.x.0)
 * - feat!: or BREAKING CHANGE: → major (x.0.0)
 */
export default {
  branches: ['main'],
  tagFormat: 'dwkim-v${version}',
  plugins: [
    // 1. Analyze commits to determine version bump
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
        releaseRules: [
          { type: 'feat', scope: 'dwkim', release: 'minor' },
          { type: 'fix', scope: 'dwkim', release: 'patch' },
          { type: 'perf', scope: 'dwkim', release: 'patch' },
          { type: 'refactor', scope: 'dwkim', release: 'patch' },
          // Global scope rules (fallback)
          { type: 'feat', release: 'minor' },
          { type: 'fix', release: 'patch' },
        ],
      },
    ],
    // 2. Generate release notes
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
        presetConfig: {
          types: [
            { type: 'feat', section: 'Features' },
            { type: 'fix', section: 'Bug Fixes' },
            { type: 'perf', section: 'Performance' },
            { type: 'refactor', section: 'Refactoring' },
          ],
        },
      },
    ],
    // 3. Update CHANGELOG.md
    '@semantic-release/changelog',
    // 4. Publish to npm with provenance (OIDC) - pnpm monorepo compatible
    '@anolilab/semantic-release-pnpm',
    // 5. Commit version bump and changelog
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json'],
        message: 'chore(dwkim): release ${nextRelease.version} [skip ci]',
      },
    ],
    // 6. Create GitHub release
    '@semantic-release/github',
  ],
};
