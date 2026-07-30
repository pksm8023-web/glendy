// api/stock.js
// Yahoo Finance 차트 프록시 (전일 종가 기준, 최근 20년 일봉)
// range=max로 요청하면 상장 기간이 아주 긴 종목(대형 지수·오래된 대형주)에 한해
// Yahoo가 응답 크기를 줄이려고 interval=1d를 요청해도 실제로는 성긴 데이터를 내려주는 경우가 있어
// 명시적인 숫자 range(20y)로 고정해 일봉 데이터를 보장한다.
// 사용: /api/stock?code=MC.PA

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: 'code 파라미터가 필요합니다' });
  }

  // 심볼 화이트리스트 검증 (임의 URL 프록시 방지)
  if (!/^[A-Za-z0-9.\-=^]{1,20}$/.test(code)) {
    return res.status(400).json({ error: '잘못된 코드 형식' });
  }

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(code)}?range=20y&interval=1d&events=div,splits`;

  try {
    const r = await fetch(url, {
      headers: {
        // Yahoo가 봇 차단할 때가 있어 브라우저 UA를 붙임
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept': 'application/json',
      },
    });

    if (!r.ok) {
      return res.status(r.status).json({ error: `Yahoo HTTP ${r.status}`, code });
    }

    const json = await r.json();
    // CDN 캐시: 전일 종가 기준이므로 하루(6시간 캐시 + 하루 stale) 유지
    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');
    return res.status(200).json(json);
  } catch (e) {
    return res.status(502).json({ error: '프록시 오류: ' + (e.message || 'unknown'), code });
  }
}
