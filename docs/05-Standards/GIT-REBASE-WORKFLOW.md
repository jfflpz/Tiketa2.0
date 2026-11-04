# Git and review policy

Feature branches start from fetched `origin/develop`; all PRs target `develop`.
Only Jefferson Lopez may merge. Never commit or push directly to main or develop.
Use Conventional Commits and dependency-sized commits. Verify repository-local
user.name/user.email before committing; do not change global identity.

Before publishing, fetch and inspect divergence. Rebase unpublished work onto
origin/develop if needed. Do not rewrite a published branch or force-push without
separate authorization. Do not merge, promote a release, or deploy production
without authorization. Preserve other contributors' uncommitted work.
