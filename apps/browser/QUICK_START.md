# 빠른 시작 가이드

## 🚀 지금 바로 시작하기

### 1. Developer ID Application 인증서 발급

**5분 소요**

1. https://developer.apple.com/account/resources/certificates/list
2. "+" 버튼 → "Developer ID Application" 선택
3. CSR 파일 업로드 (아래 방법으로 생성)
4. 다운로드 후 더블클릭하여 설치

**CSR 생성 방법:**
```
키체인 접근 앱 → 메뉴 → 키체인 접근 → 인증서 지원 → 인증 기관에서 인증서 요청...
→ 이메일 입력 → "디스크에 저장됨" 선택 → 저장
```

### 2. App-Specific Password 생성

**2분 소요**

1. https://appleid.apple.com/account/manage
2. 보안 → 앱 암호 → "+" 버튼
3. 이름 입력 (예: "aka-browser") → 생성
4. **암호 복사** (다시 볼 수 없음!)

### 3. Team ID 확인

**1분 소요**

1. https://developer.apple.com/account
2. Membership Details → Team ID 복사 (예: `AB12CD34EF`)

### 4. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일 생성:

```bash
# /Users/hm/Documents/GitHub/aka-browser/apps/browser/.env.local
APPLE_ID=your-apple-id@example.com
APPLE_APP_SPECIFIC_PASSWORD=abcd-efgh-ijkl-mnop
APPLE_TEAM_ID=AB12CD34EF
```

**또는** 터미널에서 직접 실행:

```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="abcd-efgh-ijkl-mnop"
export APPLE_TEAM_ID="AB12CD34EF"
```

### 5. 빌드 및 공증

```bash
cd /Users/hm/Documents/GitHub/aka-browser/apps/browser
pnpm run package
```

**빌드 과정 (약 5-10분):**
1. ✅ 앱 빌드
2. ✅ EVS 서명 (Widevine)
3. ✅ 코드 서명
4. ✅ 공증 (Apple 서버 업로드)
5. ✅ DMG 생성

### 6. 완료!

생성된 파일: `release/aka-browser-0.1.0-arm64.dmg`

이제 이 파일을 인터넷에 업로드하여 배포할 수 있습니다. 
사용자가 다운로드해도 **"손상되었다"는 메시지가 나타나지 않습니다!** ✨

---

## 🔍 공증 확인

```bash
spctl -a -vv -t install release/mac-arm64/aka-browser.app
```

성공 시:
```
accepted
source=Notarized Developer ID
```

---

## ❓ 문제 해결

### 인증서를 찾을 수 없음
```bash
security find-identity -v -p codesigning
```
→ "Developer ID Application" 인증서가 있는지 확인

### 공증 실패
- Apple ID, Password, Team ID가 정확한지 확인
- 2단계 인증이 활성화되어 있는지 확인

---

**자세한 설명**: `CODESIGN_SETUP.md` 참고
