# 코드 서명 및 공증 설정 가이드

이 문서는 macOS에서 aka-browser를 배포하기 위한 코드 서명 및 공증 설정 방법을 설명합니다.

## 1. Developer ID Application 인증서 생성

### 1-1. CSR (Certificate Signing Request) 생성

1. **키체인 접근** 앱 실행
2. 메뉴: **키체인 접근 > 인증서 지원 > 인증 기관에서 인증서 요청...**
3. 다음 정보 입력:
   - 사용자 이메일 주소: Apple Developer 계정 이메일
   - 일반 이름: 본인 이름
   - CA 이메일 주소: 비워두기
   - **"디스크에 저장됨"** 선택
   - **"본인이 키 쌍 정보 지정"** 체크
4. 저장 위치 선택 (예: `~/Desktop/CertificateSigningRequest.certSigningRequest`)
5. 키 크기: **2048 비트**, 알고리즘: **RSA**
6. **계속** 클릭

### 1-2. Apple Developer 사이트에서 인증서 발급

1. https://developer.apple.com/account/resources/certificates/list 접속
2. **"+"** 버튼 클릭
3. **"Developer ID Application"** 선택 (Mac App Store 외부 배포용)
4. **Continue** 클릭
5. 위에서 생성한 CSR 파일 업로드
6. **Continue** 클릭
7. 인증서 다운로드 (`.cer` 파일)
8. 다운로드한 파일을 **더블클릭**하여 키체인에 설치

### 1-3. 인증서 확인

터미널에서 다음 명령어로 인증서가 설치되었는지 확인:

```bash
security find-identity -v -p codesigning
```

다음과 같은 출력이 나와야 합니다:
```
1) XXXXXX "Developer ID Application: Your Name (TEAM_ID)"
```

## 2. App-Specific Password 생성

공증(Notarization)을 위해 App-Specific Password가 필요합니다.

1. https://appleid.apple.com/account/manage 접속
2. **로그인** (2단계 인증 필요)
3. **보안** 섹션에서 **앱 암호** 클릭
4. **"+"** 버튼 클릭
5. 이름 입력 (예: "aka-browser notarization")
6. 생성된 암호 복사 (예: `abcd-efgh-ijkl-mnop`)
7. **안전한 곳에 저장** (다시 볼 수 없음)

## 3. Team ID 확인

1. https://developer.apple.com/account 접속
2. **Membership Details** 섹션에서 **Team ID** 확인 (예: `AB12CD34EF`)

## 4. 환경 변수 설정

### 4-1. 방법 1: .env 파일 (권장)

프로젝트 루트에 `.env.local` 파일 생성:

```bash
# /Users/hm/Documents/GitHub/aka-browser/apps/browser/.env.local
APPLE_ID=your-apple-id@example.com
APPLE_APP_SPECIFIC_PASSWORD=abcd-efgh-ijkl-mnop
APPLE_TEAM_ID=AB12CD34EF
```

**주의**: `.env.local`은 `.gitignore`에 추가하여 Git에 커밋하지 마세요!

### 4-2. 방법 2: 시스템 환경 변수

`~/.zshrc` 또는 `~/.bash_profile`에 추가:

```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="abcd-efgh-ijkl-mnop"
export APPLE_TEAM_ID="AB12CD34EF"
```

저장 후:
```bash
source ~/.zshrc
```

### 4-3. 방법 3: 빌드 시 직접 지정

```bash
APPLE_ID="your@email.com" \
APPLE_APP_SPECIFIC_PASSWORD="abcd-efgh-ijkl-mnop" \
APPLE_TEAM_ID="AB12CD34EF" \
pnpm run package
```

## 5. 빌드 및 공증

### 5-1. 의존성 설치

```bash
cd /Users/hm/Documents/GitHub/aka-browser/apps/browser
pnpm install
```

### 5-2. 빌드 스크립트 컴파일

```bash
pnpm run build:scripts
```

### 5-3. 앱 빌드 및 공증

```bash
pnpm run package
```

빌드 과정:
1. ✅ 앱 빌드
2. ✅ EVS 서명 (Widevine CDM)
3. ✅ 코드 서명 (Developer ID Application)
4. ✅ 공증 (Apple 서버에 업로드)
5. ✅ DMG 생성

### 5-4. 공증 확인

빌드가 완료되면 다음 명령어로 공증 상태 확인:

```bash
spctl -a -vv -t install release/mac-arm64/aka-browser.app
```

성공 시 출력:
```
release/mac-arm64/aka-browser.app: accepted
source=Notarized Developer ID
```

## 6. 문제 해결

### 인증서를 찾을 수 없음

```
Error: Cannot find identity matching "Developer ID Application"
```

**해결**:
1. 인증서가 키체인에 설치되었는지 확인
2. 인증서가 만료되지 않았는지 확인
3. `security find-identity -v -p codesigning` 실행하여 확인

### 공증 실패

```
Error: Notarization failed
```

**해결**:
1. Apple ID, App-Specific Password, Team ID가 정확한지 확인
2. 2단계 인증이 활성화되어 있는지 확인
3. App-Specific Password가 유효한지 확인 (만료되었을 수 있음)

### 공증 로그 확인

```bash
xcrun notarytool log --apple-id "your@email.com" \
  --password "abcd-efgh-ijkl-mnop" \
  --team-id "AB12CD34EF" \
  <submission-id>
```

## 7. 배포

공증이 완료된 DMG 파일은 `release/` 디렉토리에 생성됩니다:

- `release/aka-browser-0.1.0-arm64.dmg` (Apple Silicon)
- `release/aka-browser-0.1.0-x64.dmg` (Intel)
- `release/aka-browser-0.1.0-universal.dmg` (Universal)

이 파일들을 인터넷에 업로드하여 배포할 수 있습니다. 사용자가 다운로드하여 설치할 때 "손상되었다"는 메시지가 나타나지 않습니다.

## 8. 보안 주의사항

- ❌ **절대 Git에 커밋하지 마세요**:
  - App-Specific Password
  - `.env.local` 파일
  - 인증서 파일 (`.p12`, `.cer`)

- ✅ **안전하게 보관하세요**:
  - 1Password, Bitwarden 등 비밀번호 관리자 사용
  - 팀원과 공유 시 암호화된 채널 사용

## 9. CI/CD 설정 (GitHub Actions)

GitHub Secrets에 다음 변수 추가:

- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`
- `APPLE_TEAM_ID`
- `CSC_LINK` (인증서 `.p12` 파일을 base64로 인코딩)
- `CSC_KEY_PASSWORD` (인증서 비밀번호)

자세한 설정은 electron-builder 문서 참고:
https://www.electron.build/code-signing

---

**문의**: 문제가 발생하면 이슈를 생성해주세요.
