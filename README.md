# 급식 컨트롤러

인천과학고등학교의 **급식**과 **반 시간표**를 자동으로 가져와 클로드 바탕화면으로
그려 적용하는 Windows/macOS 데스크탑 앱. Electron + React + TypeScript.

교실 앞 컴퓨터에 깔아두고 켜 두는 것을 전제로 만들었다. 화면은 빔프로젝터를 거쳐
칠판에 비치고, 조작은 트레이에 상주하는 작은 컨트롤러 창으로 한다.

## 기능

- **급식**: NEIS 교육정보 개방포털 급식 API에서 아침/점심/저녁을 가져온다(API 키 불필요).
  당일 조회 → 앞뒤 3일 주간 조회 → 마지막 캐시 순으로 물러선다.
- **시간표**: 컴시간알리미에서 선택한 학년·반의 오늘 시간표를 가져온다. 주말이면
  다가오는 월요일치를 보여준다. 서버의 자료 키가 주기적으로 바뀌므로 매번 스크립트에서
  동적으로 추출한다. 설정에 교사 이름을 입력하면 마스킹된 마지막 글자를 자동으로 복원한다.
  조회가 막히면 캐시 → 설정에 직접 넣어둔 수동 시간표 순으로 물러선다.
- **바탕화면**: 숨은 창에 1920×1080 기준으로 짠 화면을 그린 뒤 모니터 해상도에 맞춰
  통째로 스케일해 캡처한다. 왼쪽 일정 비율(기본 15%)은 바탕화면 아이콘 자리로 비워 둔다.
- **클로드 테마**: 흑백 말풍선 안에 급식·시간표를 담고 픽셀 캐릭터를 배치한다.
- **컨트롤러 창**: 닌텐도 스위치 홈 화면의 어법을 빌린 타일 UI. 학년·반, 테마,
  갱신 주기, 아이콘 여백, 교사 이름, 수동 시간표를 여기서 다룬다.
- **트레이**: 창을 닫아도 앱은 트레이에 남는다. 메뉴 — 새로고침 / 설정 / 종료.
  툴팁에 마지막 갱신 시각이 붙는다.
- **자동 실행**: Windows는 레지스트리 Run 키, macOS는 사용자 LaunchAgent.
- **백그라운드 자동 갱신** (`src/main/scheduler.ts`)
  - 날짜가 바뀌면 갱신 — 주기를 '끔'으로 둬도 동작한다. 어제 급식이 그대로 남는 것을
    막는 최소 동작이다.
  - 절전에서 깨어나면 갱신. 벽시계 공백으로 감지하므로 OS별 API가 필요 없다.
  - 설정한 주기(끔 / 30분 / 1시간 / 3시간)마다 갱신.
  - 실패하면 1 → 2 → 4 → 8 → 15분 간격으로 재시도.
  - 매 tick 설정을 다시 읽는다. 주기를 바꿔도 앱을 재시작할 필요가 없다.

## 빔프로젝터라는 제약

이 앱이 그리는 그림은 모니터가 아니라 **칠판에 비친 빛**으로 읽힌다. 이 한 가지가
테마 디자인의 규칙을 거의 전부 결정한다.

| 제약 | 테마가 지켜야 하는 것 |
|---|---|
| 어두운 색은 칠판에서 그냥 사라진다 | 밝은 바탕이 기본. 어두운 바탕은 의도적으로 밝은 획만 남기는 테마에 한정한다 |
| 중간 톤은 회색 덩어리로 뭉친다 | 한 테마의 색은 4단계 이하. 고채도 원색과 검정만 남긴다 |
| 그림자·흐림은 초점이 나간 것처럼 보인다 | `box-shadow` · `text-shadow` · `filter` · `blur()` 금지. 전부 평면 2D |
| 가는 선은 뒷자리에서 안 보인다 | 테두리는 렌더 기준 3px 이상 |
| 교실 뒤까지 읽혀야 한다 | 본문 글자는 1920 기준 34px 이상 |
| 해상도가 제각각이다 | 테마 안의 길이는 전부 `rem`. 1rem = 1920 기준 1px 이며 실제 폭에 맞춰 스케일된다 |

배경 질감으로 쓰는 `repeating-linear-gradient` / `repeating-radial-gradient`는 예외로
허용한다. 평면 패턴이라 깊이감을 만들지 않고, 칠판에서도 무늬가 무늬로 보인다.

레이아웃(아이콘 여백, 헤더 줄, 두 칼럼, 스케일)은 `WallpaperFrame` 하나가 전담한다.
테마는 그 슬롯 안의 색·활자·질감·테두리만 책임진다.

### 테마

| id | 이름 | 성격 |
|---|---|---|
| `pixel-speech` | 클로드 | 흑백 말풍선 안의 급식·시간표와 오른쪽 아래 픽셀 캐릭터 |
| `damim-teacher` | 담임쌤 | 같은 말풍선 레이아웃에 오른쪽 아래 담임 선생님 라인아트 |

## 저장소 구조

| 경로 | 역할 |
|---|---|
| `src/main/index.ts` | 진입점. 설정·자료·상태를 한 곳에서 들고 나머지를 엮는다 |
| `src/main/config.ts` | 설정·캐시 파일 입출력, 경로 계산, 값 정규화 |
| `src/main/logger.ts` | 크기 제한이 걸린 로그 파일 |
| `src/main/scheduler.ts` | 자동 갱신 판단(순수 함수 `decide`)과 tick 루프 |
| `src/main/capture.ts` | 숨은 창에 바탕화면을 그려 PNG로 찍어낸다 |
| `src/main/preview.ts` | 미리보기 모드에서 렌더를 브라우저 탭으로 내보내는 로컬 서버 |
| `src/main/wallpaper.ts` | Windows/macOS 바탕화면 적용 |
| `src/main/autostart.ts` | Windows Run 키 / macOS LaunchAgent 등록 |
| `src/main/tray.ts` | 트레이 아이콘과 메뉴 |
| `src/main/ipc.ts` | renderer ↔ main 채널. 판단은 두지 않고 콜백으로만 흘린다 |
| `src/main/fetch/meal.ts` | NEIS 급식 API + 주간 조회 fallback |
| `src/main/fetch/timetable.ts` | 컴시간알리미 비공식 API 동적 파싱(EUC-KR) |
| `src/preload/index.ts` | `window.api` 하나만 노출하는 contextBridge |
| `src/shared/types.ts` | 프로세스를 건너다니는 모든 자료 형태 |
| `src/shared/theme.ts` | 테마 계약, 렌더 기준 크기, 패널 props 분해 |
| `src/shared/fixtures.ts` | 오프라인 개발용 표본 자료 |
| `src/renderer/controller/` | 컨트롤러 창 UI |
| `src/renderer/wallpaper/WallpaperFrame.tsx` | 테마의 레이아웃 뼈대 |
| `src/renderer/wallpaper/themes/` | 바탕화면 테마와 등록표 |
| `resources/fonts/` | 번들 폰트 10종 |
| `resources/icons/` | `app_icon.ico`(Windows), `app_icon.icns`(macOS), 1024 PNG |

설정·캐시·로그 위치: Windows `%APPDATA%\급식컨트롤러\`,
macOS `~/Library/Application Support/급식컨트롤러/`.

## 개발

```bash
npm install
npm run dev        # 컨트롤러 창 + vite dev 서버
npm run typecheck  # main/preload 와 renderer 를 각각 검사
npm run build      # typecheck 후 out/ 에 번들
```

`electron-vite dev` 로 띄운 뒤 브라우저로 `/wallpaper.html` 을 직접 열면 표본 자료로
바탕화면 한 장이 그려진다. 쿼리 없이 열었을 때만 표본을 쓰므로 테마 작업에 편하다.

실제 자료로 테마를 볼 때는 미리보기 모드로 띄운다. 바탕화면 대신 브라우저 탭으로 렌더가 간다.

```bash
GEUPSIK_PREVIEW=4319 npm run dev
```

`http://127.0.0.1:4319/` 를 열어 두면 갱신될 때마다 탭이 스스로 새 그림으로 바뀐다.
이 모드에서는 바탕화면 적용도, 로그인 항목 등록도 하지 않는다.

## 빌드 (Windows)

```bash
npm install
npm run pack:win
```

`release\` 에 두 가지가 나온다.

- `급식컨트롤러-설치-0.1.0.exe` — NSIS 설치 관리자. 설치 위치를 고를 수 있다.
- `급식컨트롤러-포터블-0.1.0.exe` — 설치 없이 그대로 실행하는 단일 파일.

실행 파일 아이콘은 `resources/icons/app_icon.ico` 를 쓴다. 폰트와 아이콘은
`extraResources` 로 앱 옆에 복사되므로 설치본에서도 트레이 아이콘이 뜬다.

## 빌드 (macOS)

```bash
npm install
npm run pack:mac
```

`release/급식컨트롤러-0.1.0.dmg` 가 나온다. 앱 아이콘은 `resources/icons/app_icon.icns`.
macOS 는 바탕화면 적용에 `System Events` 를 쓰므로 처음 실행할 때 자동화 권한 확인이 뜬다.

## 참고

- 학교 공식 홈페이지는 JS 렌더링이라 단순 스크래핑이 불가능해서 급식은 NEIS 를 쓴다.
  NEIS 가 공식 급식 데이터 제공처이므로 값은 같다.
- 컴시간알리미는 응답이 EUC-KR 이고 자료 키가 주기적으로 바뀐다. 부트스트랩 스크립트에서
  매번 키를 다시 뽑아내는 이유다.
- NEIS 학교코드는 한 번 알아내면 바뀌지 않으므로 앱 데이터 폴더의 `school.json` 에 남긴다.

# Windows 릴리스

`v`로 시작하는 SemVer 태그를 push하면 GitHub Actions가 Windows 설치본과 portable 빌드를
GitHub Releases에 게시한다. 설치본으로 설치한 앱은 시작 10초 뒤와 이후 6시간마다 새
릴리스를 확인하고, 다운로드가 끝나면 재시작 설치를 안내한다.

```bash
git tag v0.2.0
git push origin v0.2.0
```

태그의 버전이 배포 버전이 되므로 `package.json` 버전을 먼저 직접 바꿀 필요는 없다.
