# Auto Publish to npm – Setup

The **Publish to npm** workflow runs when a PR is **merged** into `master` and publishes the package to npm if the PR has a version label.

## 1. npm authentication (choose one)

### Option A: OIDC trusted publishing (recommended)

If you’ve already linked this repo in **npm → Package → Settings → Trusted publishing** (OpenID Connect):

- **You do not need to add any secrets.** The workflow uses OIDC; no `NPM_TOKEN` is required.
- Ensure the **workflow filename** in npm matches exactly: `publish.yml` (in `.github/workflows/`).
- The workflow already has `id-token: write` and uses Node 22 as required by npm OIDC.

### Option B: Token-based (legacy)

If you are not using trusted publishing:

1. Go to [npmjs.com/settings/tokens](https://www.npmjs.com/settings/tokens) and create a token with **Publish** permission.
2. In the repo: **Settings → Secrets and variables → Actions** → **New repository secret**.
3. Name: `NPM_TOKEN`, Value: the token.

Then add this to the **Publish to npm** step in `.github/workflows/publish.yml`:

```yaml
env:
  NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

And in **Bump version**, add:

```yaml
env:
  npm_config_//registry.npmjs.org/:_authToken: ${{ secrets.NPM_TOKEN }}
```

(If you use OIDC, leave those env blocks out.)

## 2. Create PR labels (required)

Create these labels in the repo (**Issues → Labels**, or **Labels** in the repo bar):

| Label   | Use case                    | Example bump   |
|--------|-----------------------------|----------------|
| `patch` | Bug fixes, docs, small tweaks | 2.0.1 → 2.0.2 |
| `minor` | New features, backwards-compatible | 2.0.1 → 2.1.0 |
| `major` | Breaking changes            | 2.0.1 → 3.0.0 |

- Add **one** of these labels to a PR before merging if you want a release.
- No version label → no publish.
- If several are present, **major** wins, then **minor**, then **patch**.

## 3. Branch protection (optional)

If `master` is protected and requires status checks, either allow the **Publish to npm** workflow to push, or use a PAT with `contents: write` for the checkout/push steps (see plan).

## Troubleshooting

- **404 Not Found / Access token expired or revoked** when publishing:
  - If using OIDC: ensure the **workflow filename** in npm Trusted publishing is exactly `publish.yml` and the repo URL matches. OIDC only works on GitHub-hosted runners.
  - If the package has never been published: the first publish may need to be done once from your machine (`npm login` then `npm publish`) to create the package on npm; after that, CI can publish new versions.
  - If the package name is taken by another user: use a scoped name (e.g. `@yourusername/te.js`) in `package.json` and publish that instead.
