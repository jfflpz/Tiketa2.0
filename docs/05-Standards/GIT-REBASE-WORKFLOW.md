# Git Rebase & Engineering Standards

**Project**: Tiketa 2.0  
**Branch Protection**: `main` is protected (direct commits blocked)

---

## 1. Linear Git History (Rebase Protocol)

Never use merge commits (`Merge branch '...' into main`). All feature integration must follow the linear rebase protocol:

```bash
# 1. Fetch latest main
git fetch origin main

# 2. Rebase feature branch on top of main
git checkout feat/your-feature
git rebase origin/main

# 3. Resolve any conflicts, then push
git push origin feat/your-feature --force-with-lease
```

---

## 2. Conventional Commit Standards

Every commit message must follow the Conventional Commits specification:
- `feat(scope)`: New user-facing capability or API endpoint.
- `fix(scope)`: Bug fix in frontend or backend logic.
- `docs(scope)`: Markdown documentation, architecture updates, or sitemaps.
- `chore(scope)`: Dependency updates, Docker configurations, or tooling.
- `test(scope)`: Pytest suites, component tests, or CI configurations.

Examples:
- `feat(frontend): scaffold strict typescript vite app with tailwind tokens`
- `fix(frontend): resolve tsconfig baseUrl deprecation and vite client ambient types`
- `docs(sprint): initialize sprint board and architecture specs in docs/`
