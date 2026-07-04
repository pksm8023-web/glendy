// api/quote.js
// Yahoo Finance quote 프록시 (시가총액 등)
// 사용: /api/quote?symbols=MC.PA,RMS.PA,...

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { symbols } = req.query;
  if (!symbols) {
    return res.status(400).json({ error: 'symbols 파라미터가 필요합니다' });
  }

  if (!/^[A-Za-z0-9.\-=^,]{1,800}$/.test(symbols)) {
    return res.status(400).json({ error: '잘못된 symbols 형식' });
  }

  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`;

  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept': 'application/json',
      },
    });
    if (!r.ok) {
      return res.status(r.status).json({ error: `Yahoo HTTP ${r.status}` });
    }
    const json = await r.json();
    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');
    return res.status(200).json(json);
  } catch (e) {
    return res.status(502).json({ error: '프록시 오류: ' + (e.message || 'unknown') });
  }
}
