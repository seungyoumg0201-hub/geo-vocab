# 지리 임용 핵심 단어장

중등 지리교사 임용 대비 플래시카드·퀴즈 웹앱 (단일 HTML, 오프라인 동작).

## 채널

| 채널 | 주소 | 용도 |
|---|---|---|
| **안정판 (stable)** | https://seungyoumg0201-hub.github.io/geo-vocab/ | 실제 공부용. **동결됨** |
| **베타 (beta)** | https://seungyoumg0201-hub.github.io/geo-vocab/beta/ | 새 기능 시험용. 밤샘(nightly) 작업은 여기에만 배포 |

### 안정판 동결 규칙
- 현재 안정판: **v6-r81**, git 태그 **`stable-v6-r81`** (이전: `stable-v6-r79`)
- 변경 이력: r81(2026-10-24, 사용자 승인 승격) — 베타 v6-r81b 검증 후 승격. 기출 누락 보강 인출 n197–n217(2022 개정 지리 선택과목 포함), 단어장 동결 유지
- r79(2026-10-23, 사용자 승인 치명적 수정) — 로그인 기기에서 최신 크롬이 `requestIdleCallback(fn, 1)`을 거부해 초기화가 app9에서 멈추던 문제 수정
- 안정판 주소(저장소 루트의 `index.html`·`app.js`·`sw.js`)에는 **사용자가 승인한 치명적 수정만** 배포한다.
- 밤샘/자동 작업은 루트 파일을 절대 바꾸지 않는다. `beta/` 폴더만 바꾼다.
- 안정판은 베타 코드·원격 코드에 의존하지 않는다(외부 스크립트는 Firebase SDK뿐, 베타 폴더를 읽지 않음).

### 베타 격리 방식 (같은 출처, 하위 경로)
- **저장소**: 베타 페이지의 `localStorage`는 첫 스크립트가 감싸서 `gvbeta:` 접두사 키만 읽고 쓴다. 안정판 `gv_*` 기록은 보이지도, 바뀌지도 않는다.
- **서비스워커**: 베타는 `/geo-vocab/beta/` 범위의 별도 SW, 캐시 이름 `gvb-*`(`gvb-meta`, `gvb-audio-v1`). 안정판 SW(r78~)는 `/beta/` 요청을 아예 처리하지 않고, 안정판의 복구 스크립트는 베타 SW·캐시를 지우지 않는다(반대도 같음).
- **Firebase 경로**: 베타는 Firestore `beta_users`·`beta_leaderboard`, Realtime DB `beta/review/…`·`beta/status/…`를 쓴다. (Firebase 보안 규칙이 이 경로를 허용하지 않으면 베타 클라우드 동기화만 실패하고 안정판에는 영향 없음.)
- 로그인 상태(Firebase Auth의 IndexedDB)는 같은 출처라 공유된다. 계정 정보만 공유되고 학습 데이터는 공유되지 않는다.
- 오디오(`audio/`)는 안정판 폴더 파일을 읽기만 한다. 그림(`img/`)·아이콘은 베타 폴더에 사본/상대 경로.

### 베타 배포 절차 (nightly용)
```
cd /workspace/geo-vocab
python3 build.py            # 소스 → index.html/app.js/sw.js (안정판 형식, 배포하지 않음)
python3 build_beta.py       # → beta/ (격리 변환, 실패 시 중단)
cd /tmp/pub && git pull
cp /workspace/geo-vocab/beta/* beta/      # 루트 파일은 복사하지 않음!
git add beta && git commit -m "beta vX" && git push
curl -s "https://seungyoumg0201-hub.github.io/geo-vocab/beta/sw.js?nc=$RANDOM" | head -c 23
```
베타 격리 테스트: `/workspace/t/tbeta.py` (안정판 기록 불변·SW 범위·캐시 이름 확인)

## 롤백 (안정판)
안정판이 깨졌을 때, 학습 기록은 기기 localStorage·클라우드에 있으므로 파일만 되돌리면 된다(기록은 지워지지 않음).

1. 마지막 정상 태그 확인: `git tag -l 'stable-*'`
2. 루트 앱 파일만 되돌리기:
   ```
   cd /tmp/pub && git pull
   git checkout stable-v6-r79 -- index.html app.js sw.js   # 직전 정상 태그(r81 이전)
   git commit -m "rollback to stable-v6-r79" && git push
   ```
3. 확인: `curl -s "https://seungyoumg0201-hub.github.io/geo-vocab/sw.js?nc=$RANDOM" | head -c 22` 가 `const VER='v6-r79';con`
   - GitHub Pages가 빌드를 안 하면 빈 커밋으로 다시 트리거: `git commit --allow-empty -m rebuild && git push`
4. 사용자 기기: 앱을 한 번 열면 SW가 새 파일을 받아 자동으로 다시 열림(r75~). 안 되면 `?nc=1`을 붙여 새로고침. **앱 삭제·데이터 삭제는 권하지 않는다**(동기화 확인 전).
5. 주의: 되돌린 버전의 `sw.js` VER가 현재와 같으면 브라우저가 갱신을 모를 수 있다. 그럴 땐 `sw.js` 맨 끝에 주석 한 줄(`// rollback`)을 더해 바이트를 바꿔 배포한다.

## 테스트
`/workspace/t/`: `tall.py`(크로미움·웹킷 × 390/1024/1280/1920 전체 클릭), `t55.py`(7일 코스), `t76.py`(코스 계산 시간·메뉴 경로), `t77.py`(헷갈려요), `tbeta.py`(베타 격리).
