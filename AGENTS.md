# DhakaFlix — Project Instructions

## 1. Project Identity

DhakaFlix is a standalone Windows desktop media catalogue and streaming application.

### Primary objectives
- Discover and catalogue ISP-provided media servers.
- Organize movies, TV series, episodes and supported media categories.
- Provide a modern cinematic desktop experience.
- Stream media directly from ISP servers.
- Support seeking, subtitles and audio-track selection.
- Maintain playback progress, resume and Continue Watching.
- Store application data locally.
- Support incremental catalogue scanning.
- Support automatic OTA application updates.
- Provide a standalone Windows installer.

### Scope
- Windows desktop is the only current target.
- Mobile applications are explicitly out of scope.
- No mandatory always-on external backend.
- The installer must work on compatible Windows PCs without Node.js, VS Code or OpenCode.

Do not expand the scope without user approval.

## 2. Source of Truth

The file `\Local\DhakaFlix Build Guide.md` is the primary functional requirements source.

Rules:
- Read the guide before making substantial architectural or implementation decisions.
- Preserve its functional requirements.
- Adapt Android-specific implementation details to Windows equivalents.
- Never silently discard requirements.
- Identify contradictions, ambiguities and technically unsuitable requirements.
- Maintain traceability between source requirements and implementation.
- If the source document is unavailable, report the limitation rather than inventing its contents.

Approved project documentation and explicit user decisions supplement the source guide.

## 3. AI Team and Responsibilities

The global OpenCode agents are the project's specialist team.

- `tech-lead`: coordination, delegation and integration.
- `planner`: requirements, planning and milestones.
- `architect`: architecture and technical decisions.
- `ui-ux-designer`: desktop UX and visual design.
- `senior-engineer`: implementation.
- `qa-engineer`: independent testing.
- `code-reviewer`: independent code review.
- `security-reviewer`: application security.

Rules:
- Tech Lead coordinates substantial tasks.
- Specialists must work within their responsibilities.
- Relevant installed skills must be loaded before substantial work.
- Never claim an agent was invoked or a skill was loaded unless it actually happened.
- Report unavailable agents or skills honestly.
- Do not delegate trivial tasks unnecessarily.
- Reconcile conflicting recommendations before presenting decisions.

## 4. User Approval and Change Control

The user owns final project decisions.

Never independently:
- Make major architecture changes.
- Install dependencies when not authorized.
- Initialize or restructure the project when not authorized.
- Delete or overwrite user data.
- Perform destructive Git operations.
- Run irreversible database migrations.
- Change credentials or provider configurations.
- Deploy or publish releases.
- Incur paid service costs.

For substantial changes, present:
1. Objective.
2. Proposed approach.
3. Affected files.
4. Dependencies.
5. Risks.
6. Verification plan.

Wait for approval when required.

A planning-only instruction authorizes inspection and analysis, not file modifications.

## 5. Engineering Principles

- Prefer simple, maintainable architecture.
- Avoid unnecessary abstraction and overengineering.
- Keep resource usage reasonable for ordinary Windows PCs.
- Preserve existing working behavior.
- Validate external input.
- Handle network failures and malformed server responses safely.
- Keep Electron renderer privileges restricted.
- Use typed IPC contracts.
- Never expose unrestricted Node.js access to the renderer.
- Keep application data separate from application installation files.
- Document important architectural decisions.

Do not assume Chromium supports every media format. Playback compatibility must be tested using real media samples.

## 6. ISP Discovery and Crawler Rules

- Support different directory listing implementations.
- Consider h5ai, nginx autoindex and Apache autoindex.
- Do not assume all ISP servers share one layout.
- Start crawler concurrency at a maximum of four.
- Respect server performance and avoid aggressive scanning.
- Prefer incremental scanning where supported.
- Handle inaccessible folders and incomplete listings safely.
- Do not delete catalogue records merely because a temporary network error occurred.
- Preserve the distinction between a failed scan and a successful scan.

## 7. Database and Local Data Safety

- Use local persistent storage.
- Maintain a clear database migration strategy.
- Preserve playback history, settings and catalogue data across application updates.
- Back up or protect important data before migrations.
- Avoid destructive migrations without explicit approval.
- Test migration and recovery behavior.
- Keep runtime user data outside the installation directory.

## 8. Playback Requirements

Investigate and verify:
- Supported containers and codecs.
- Audio track selection.
- Subtitle support.
- HTTP range requests.
- Seeking behavior.
- Hardware acceleration.
- Fullscreen and keyboard controls.
- Playback progress persistence.
- Resume and Continue Watching.
- Episode progression and auto-advance.

Never claim compatibility without evidence.

## 9. OTA Updates and Releases

- Application updates must be independent of catalogue scanning.
- Preserve user data during updates.
- Verify update authenticity and integrity.
- Never force an update during active playback.
- Provide appropriate update failure and recovery behavior.
- Test the installer on a clean Windows environment.
- Do not publish or release without user approval.

## 10. Git and Changelog Protocol

Maintain a root-level `CHANGELOG.md` using the Keep a Changelog format.

Use an `Unreleased` section for changes not assigned to a release.

Organize entries under applicable categories:
- Added
- Changed
- Fixed
- Removed
- Security

Before every commit:
1. Inspect staged and unstaged changes.
2. Determine whether a changelog entry is required.
3. Update the changelog for meaningful features, fixes, improvements and maintenance changes.
4. Ensure entries accurately describe the actual changes.
5. Do not invent entries or duplicate existing ones.
6. Do not assign a release version merely because a commit was created.
7. Verify the changelog is included when required.

For trivial changes that do not warrant a changelog entry, explain why.

Use clear and consistent commit messages.

Never stage unrelated user changes or claim a commit succeeded without verification.

## 11. Documentation Structure

Maintain project documentation under `docs/`.

Proposed organization:

docs/
├── planning/
├── requirements/
├── architecture/
├── decisions/
├── development/
├── screenshots/
└── testing/

Responsibilities:

- `planning/`: roadmap, milestones and project plans.
- `requirements/`: functional and non-functional requirements.
- `architecture/`: system architecture, module design and diagrams.
- `decisions/`: Architecture Decision Records.
- `development/`: setup, workflows and implementation notes.
- `testing/`: QA strategy, test cases and acceptance criteria.

Keep documentation consistent with the actual implementation.

Do not create unnecessary documents or duplicate information.

## 12. Testing and Quality Assurance

- Define acceptance criteria before substantial implementation.
- Add tests for new functionality.
- Run relevant tests after changes.
- Perform regression testing for affected functionality.
- Request independent QA for substantial features.
- Request code review before completing significant changes.
- Perform security review for security-sensitive functionality.
- Report passed, failed, skipped and untested checks separately.

Never weaken tests merely to hide defects.

## 13. Work Reporting

For substantial tasks, report:

1. Objective.
2. Agents actually consulted.
3. Skills actually loaded.
4. Files inspected or changed.
5. Work completed.
6. Tests and verification performed.
7. Risks and unresolved questions.
8. Recommended next step.

Clearly distinguish:
- Proposed
- Approved
- In progress
- Completed
- Blocked
- Unverified

Never report planned actions as completed actions.

## 14. Project Discipline

The project must progress through controlled stages:

1. Discovery and requirements.
2. Architecture and planning.
3. User approval.
4. Project foundation.
5. Incremental implementation.
6. Testing and review.
7. Packaging and release.

Do not skip approval gates or move into implementation simply because planning is complete.

The user's explicit instructions take priority over assumptions and recommendations.