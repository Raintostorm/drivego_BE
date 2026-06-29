# Push both remotes after fixes

After a fix is completed, built, and committed, push the same branch to both project remotes:

```bash
git push frontend main
git push origin main
```

Current remote mapping:

- `frontend`: `https://github.com/Raintostorm/drivego_FE.git`
- `origin`: `https://github.com/Raintostorm/drivego_BE.git`

Do not include local environment files, internal notes, spreadsheets, or question-bank/database files in these commits unless explicitly requested.
