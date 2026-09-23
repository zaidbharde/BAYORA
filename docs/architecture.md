# BAYORA Architecture Notes

## Phase 1.1 Intent

This repository currently provides a small but strict TypeScript foundation. It avoids real security infrastructure while reserving module boundaries for future replacements.

## Backend Boundaries

- `routes/` owns HTTP route registration.
- `config/` owns environment parsing.
- `modules/tests` will own test run orchestration.
- `modules/red-team` will own adversarial simulation logic.
- `modules/blue-team` will own defensive response logic.
- `modules/llm` will own mock and real LLM adapters.
- `modules/security` will own detection and event logic.
- `modules/audit` will own audit log recording.

## Frontend Boundaries

- `services/` owns API communication.
- `hooks/` adapts service state for React views.
- `layouts/` owns application frame/navigation.
- `pages/` owns route-level screens.
- `components/` owns reusable UI pieces.

Business and security logic should stay out of presentational components.

