// api/quote.js
// Yahoo Finance quote 프록시 (crumb 인증 포함)
// 사용: /api/quote?symbols=MC.PA,RMS.PA,...
//
// Yahoo가 quote 엔드포인트에 crumb 인증을 요구하므로,
// 1) 쿠키 획득 → 2) crumb 토큰 획득 → 3) 쿠키+crumb로 quote 호출
// crumb/쿠키는 함수 인스턴스 메모리에 캐시해서 매번 새로 안 받게 함.

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

let cachedCrumb = null;
let cachedCookie = null;
let crumbFetchedAt = 0;
const CRUMB_TTL = 30 * 60 * 1000; // 30분

async function getCrumbAndCookie() {
  const now = Date.now();
  if (cachedCrumb && cachedCookie && (now - crumbFetchedAt) < CRUMB_TTL) {
    return { crumb: cachedCrumb, cookie: cachedCookie };
  }

  // 1) 쿠키 획득
  let cookie = '';
  const cookieRes = await fetch('https://fc.yahoo.com/', {
    headers: { 'User-Agent': UA, 'Accept': 'text/html' },
  });
  const setCookie = cookieRes.headers.get('set-cookie');
  if (setCookie) {
    cookie = setCookie.split(',').map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');
  }

  if (!cookie) {
    const alt = await fetch('https://finance.yahoo.com/', {
      headers: { 'User-Agent': UA, 'Accept': 'text/html' },
    });
    const sc = alt.headers.get('set-cookie');
    if (sc) cookie = sc.split(',').map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');
  }

  // 2) crumb 토큰 획득
  const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/plain',
      ...(cookie ? { 'Cookie': cookie } : {}),
    },
  });
  const crumb = (await crumbRes.text()).trim();

  if (!crumb || crumb.includes('<') || crumb.length > 30) {
    throw new Error('crumb 획득 실패');
  }

  cachedCrumb = crumb;
  cachedCookie = cookie;
  crumbFetchedAt = now;
  return { crumb, cookie };
}

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

  try {
    let { crumb, cookie } = await getCrumbAndCookie();

    const buildUrl = (cr) =>
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&crumb=${encodeURIComponent(cr)}`;

    const doFetch = (cr, ck) => fetch(buildUrl(cr), {
      headers: {
        'User-Agent': UA,
        'Accept': 'application/json',
        ...(ck ? { 'Cookie': ck } : {}),
      },
    });

    let r = await doFetch(crumb, cookie);

    // crumb 만료 시 1회 재발급 후 재시도
    if (r.status === 401 || r.status === 403) {
      cachedCrumb = null;
      ({ crumb, cookie } = await getCrumbAndCookie());
      r = await doFetch(crumb, cookie);
    }

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
