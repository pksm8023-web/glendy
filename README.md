# Global Trend Study Watchlist

글로벌 소비재·트렌드 관심종목 현황판. Yahoo Finance 데이터 기반, 전일 종가 기준.

## 구조

```
├── index.html        # 프론트엔드 (단일 파일)
├── api/
│   ├── stock.js      # 주가·차트 프록시 (/api/stock?code=MC.PA)
│   └── quote.js      # 시가총액 프록시 (/api/quote?symbols=A,B,C)
├── package.json
└── vercel.json
```

## 데이터 소스

- 종목 목록: Google Sheets (published CSV)
- 주가·차트·시총·환율: Yahoo Finance (비공식 엔드포인트, 서버 프록시 경유)
- 기준: 전일 종가 (당일 값 제외)

## 배포 (GitHub → Vercel)

1. 이 폴더를 GitHub 레포에 push
2. Vercel에서 New Project → 레포 선택 → Deploy
3. 끝. `api/` 하위 파일이 자동으로 서버리스 함수가 됨

## 로컬 개발

- `index.html`을 file://로 열면 자동으로 공개 프록시(corsproxy.io) fallback 사용
- 또는 `npx vercel dev`로 API 함수까지 로컬 실행

## 종목 추가·삭제

Google Sheets에서 행을 추가/삭제하면 됨 (재배포 불필요).
컬럼: 섹터 | 종목명 | Yahoo코드 | 통화 | 투자포인트 | 브랜드
