# Question Bank Lock

## Status

The question bank, exam pools, migrations, seed scripts, and generated question content are considered complete.

Do not spend time or tokens re-reading, re-parsing, rebuilding, normalizing, or refactoring the database question bank unless the user explicitly asks for it by name.

## Locked Scope

Avoid touching these areas during normal frontend, UI, routing, marketing, deployment, or comparison work:

- `database/content/**`
- `database/migrations/014_question_bank.sql`
- `database/migrations/015_exam_structure.sql`
- `database/scripts/build-bank.py`
- `database/scripts/seed-bank.mjs`
- `database/scripts/verify-assembly.mjs`
- `backend/src/entities/bank-question.entity.ts`
- `backend/src/entities/license-question-pool.entity.ts`
- `backend/src/entities/license-exam-structure.entity.ts`
- `backend/src/modules/exams/exam-assembly.service.ts`

## Rule

Treat the official question bank as done. For future work, focus on frontend, UI, product flow, auth, enrollment, payments, deployment, and user experience unless the user specifically requests question-bank changes.
