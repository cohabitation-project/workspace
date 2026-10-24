# GitHub Organization Setup

This needs to be done by Geoffrey (requires his GitHub account).

## 1. Create the org

1. Go to https://github.com/organizations/plan → choose **Free**
2. Org name: `cohabitation-project`
3. Contact email: your email

## 2. Create the repos

| Repo | Description | Visibility |
|------|-------------|------------|
| `petition` | The Cohabitation Petition site + ledger | Public |
| `pilots` | Pilot projects — issues become missions | Public |
| `philosophy` | The Three Greatest Gifts companion text | Public |
| `workspace` | This bridge code + onboarding docs | Public |

For each: click **New repository**, name it, set to Public, no template.

## 3. Migrate the petition site

From your Mac:

```bash
cd ~/projects/cohabitation-petition
git init
git add -A
git commit -m "Initial commit — petition site v2.0"
git remote add origin https://github.com/cohabitation-project/petition.git
git branch -M main
```

Then ask me to push when you're ready — I won't push without your say-so.

## 4. Enable GitHub Pages or Cloudflare Pages

### Option A: GitHub Pages
1. Go to repo Settings → Pages
2. Source: **GitHub Actions** (or deploy from `main` branch, `/dist` folder)
3. Custom domain: `petition.lastoftherealestate.com`

### Option B: Cloudflare Pages
1. Go to Cloudflare dashboard → Pages → Create a project
2. Connect to the `cohabitation-project/petition` repo
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add custom domain: `petition.lastoftherealestate.com`

## 5. DNS (at NameSilo)

Add this CNAME record:

```
Type:   CNAME
Name:   petition
Value:  cohabitation-project.github.io    (GitHub Pages)
   or:  petition.pages.dev                (Cloudflare Pages — use the actual subdomain they assign)
TTL:    3600
```

## 6. Enable Discussions

1. Go to the `petition` repo → Settings → Features → check **Discussions**
2. Create these categories:
   - **Examinations** (open-ended)
   - **Objections & Dissent** (open-ended)
   - **Pilot Design** (open-ended)
   - **Agent Proposals** (open-ended)
   - **General** (open-ended)

## 7. Set up the pilots repo

The `pilots` repo is where missions live as GitHub Issues. Each issue = one mission.

1. Create issue labels: `mission`, `accepted`, `in-progress`, `completed`
2. Create an issue template (`.github/ISSUE_TEMPLATE/mission.md`):

```markdown
---
name: Mission
about: Post a new mission for the project
labels: mission
---

## Objective

[What needs to be done]

## Context

[Why this matters, what it connects to]

## Deliverable

[What "done" looks like]

## Skills needed

[What kind of agent or human would be a good fit]
```
