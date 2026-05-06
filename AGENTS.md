# 에이전트 개발 규칙

이 문서는 AI 에이전트가 `aka-browser` 에서 코드를 작성하고 기여할 때 따라야 하는 규칙과 가이드라인을 정의합니다.

## 목차

- [프로젝트 개요](#프로젝트-개요)
- [코드 작성 규칙](#코드-작성-규칙)
- [커밋 규칙](#커밋-규칙)
- [보안 및 개인정보](#보안-및-개인정보)
- [파일 구조](#파일-구조)
- [코드 스타일](#코드-스타일)
- [문서화](#문서화)
- [테스트](#테스트)
- [DRM 및 코드 서명](#drm-및-코드-서명)

---

## 프로젝트 개요

`aka-browser` 는 PC 용 always-on-top 사이드 브라우저입니다. Netflix·Twitter·Twitch 등을 작은 창으로 화면 위에 떠 있게 두기 위한 보조 브라우저이며, Castlabs Electron 빌드를 사용해 Widevine DRM 콘텐츠를 재생할 수 있습니다.

- `apps/browser` — Electron 앱 진입점 (메인 + 렌더러 + preload)

기술 스택: Electron Castlabs / React 18 / TypeScript / Vite / TailwindCSS / Turborepo + pnpm.

---

## 코드 작성 규칙

### 파일 크기 제한

**모든 코드 파일은 450줄 이하로 작성되어야 합니다.**

- **최대 줄 수**: 450줄
- **권장 줄 수**: 300-400줄
- **초과 시 조치**: 파일이 450줄을 초과하면 기능별로 분리하여 모듈화
- **예외**: 자동 생성 파일(예: 빌드 산출물) 은 예외로 둘 수 있음

### 코드 품질

- **명확성**: 코드는 명확하고 이해하기 쉽게 작성
- **재사용성**: 중복 코드를 최소화하고 공통 로직은 함수로 추출
- **타입 안정성**: TypeScript 의 타입 시스템을 적극 활용 (strict 모드 유지)
- **에러 핸들링**: 모든 비동기 작업·IPC 호출·외부 API 호출에 적절한 에러 처리 구현
- **메인·렌더러 분리**: Electron 의 메인 프로세스와 렌더러 프로세스 책임을 명확히 구분하고, IPC 채널을 통해서만 통신합니다.

---

## 커밋 규칙

### 커밋 빈도

- **주기적인 커밋**: 논리적인 작업 단위마다 커밋
- **작은 단위**: 한 번에 하나의 기능이나 수정사항만 포함
- **완성된 코드**: 빌드 실패나 런타임 에러가 없는 상태에서만 커밋

### 커밋 메시지 형식 (Conventional Commits)

```
<type>: <설명>
```

- `feat` — 신규 기능 / `fix` — 버그 수정 / `docs` — 문서 / `chore` — 빌드·의존성 / `refactor` — 구조 개선 / `remove` — 삭제 / `style` — 스타일 / `test` — 테스트

#### 예시

```
feat: add multi-tab visual switcher
fix: persist always-on-top state across restarts
chore: bump electron-castlabs to 38.x
```

---

## 보안 및 개인정보

- 비밀키·토큰·자격증명을 코드·테스트·문서에 포함하지 않습니다.
- DRM 우회 시도(Widevine 키 추출, EME 우회 등) 를 코드에 절대 포함하지 않습니다.
- 사용자 시청·검색 기록을 외부로 송출하는 텔레메트리를 무단 추가하지 않습니다.

---

## 파일 구조

```
aka-browser/
├── apps/
│   └── browser/
│       ├── src/
│       │   ├── main/      (Electron 메인 프로세스)
│       │   ├── renderer/  (React UI)
│       │   └── preload/   (IPC bridge)
│       ├── public/
│       └── package.json
├── package.json           (root, workspaces)
├── pnpm-workspace.yaml
├── turbo.json
└── AGENTS.md / CLAUDE.md
```

---

## 코드 스타일

- **포매터**: prettier (`pnpm format`)
- **린터**: turbo 위임 (`pnpm lint`)
- **타입 체크**: `pnpm check-types`
- **빌드**: `pnpm build`

PR 제출 전 위 4개 모두 통과 + Electron 앱이 로컬에서 실제로 띄워지는지 확인합니다.

---

## 문서화

- 영어 `README.md` 를 우선 유지합니다.
- 외부 기술 문서 `deepwiki.com/hmmhmmhm/aka-browser` 와의 동기화는 사람이 결정합니다.
- 신규 기능 추가 시 README 의 Features 섹션을 갱신합니다.

---

## 테스트

- IPC 채널·preload bridge 의 단위 테스트를 우선합니다.
- 시각 회귀는 수동 검증을 기본으로 합니다.
- DRM 콘텐츠 재생 검증은 Castlabs EVS signed 빌드에서만 가능합니다.

---

## DRM 및 코드 서명

- **Castlabs Electron 버전 변경 금지 (자율)**: `castlabs/electron-releases` 에 의존하므로, 표준 Electron 으로의 교체나 임의 버전 변경은 자율 작업이 절대 시도하지 않습니다. 변경이 필요하면 issue 로만 환기.
- **macOS 공증(notarization) 흐름 보호**: `.env` 의 Apple 자격증명·EVS 키 관련 코드를 변경할 때는 사람 검토 필수.
- **Widevine 의존성**: Widevine CDM 통합 코드 영역은 PR 시 명시적 검토 라벨을 답니다.
