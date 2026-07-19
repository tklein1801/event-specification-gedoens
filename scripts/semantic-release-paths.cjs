'use strict';

const { execFileSync } = require('node:child_process');
const commitAnalyzer = require('@semantic-release/commit-analyzer');
const notesGenerator = require('@semantic-release/release-notes-generator');

function filesForCommit(hash) {
  return execFileSync(
    'git',
    ['show', '--format=', '--name-only', '--no-renames', hash],
    { encoding: 'utf8' },
  )
    .split(/\r?\n/)
    .map((file) => file.trim())
    .filter(Boolean);
}

function isRelevantCommit(commit, paths) {
  if (!commit.hash) return false;
  return filesForCommit(commit.hash).some((file) =>
    paths.some((path) => file === path || file.startsWith(`${path}/`)),
  );
}

function relevantContext(pluginConfig, context) {
  const paths = pluginConfig.paths ?? [];
  return {
    ...context,
    commits: context.commits.filter((commit) => isRelevantCommit(commit, paths)),
  };
}

module.exports = {
  analyzeCommits: (pluginConfig, context) =>
    commitAnalyzer.analyzeCommits(pluginConfig, relevantContext(pluginConfig, context)),
  generateNotes: (pluginConfig, context) =>
    notesGenerator.generateNotes(pluginConfig, relevantContext(pluginConfig, context)),
};
