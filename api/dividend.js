export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { code } = req.query;
  if (!code || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: '6자리 종목코드를 입력하세요' });
  }

  const headers = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Referer': 'https://m.stock.naver.com/',
    'Accept': 'application/json',
    'Accept-Language': 'ko-KR,ko;q=0.9'
  };

  try {
    const r = await fetch(
      `https://m.stock.naver.com/api/stock/${code}/etfDividend`,
      { headers }
    );

    if (!r.ok) throw new Error(`네이버 API 오류: ${r.status}`);

    const json = await r.json();

    const rawList =
      json?.etfDividendList ??
      json?.dividendList ??
      json?.list ??
      [];

    const distributions = rawList
      .map(item => {
        const date = String(
          item.dividendDate || item.exDividendDate || item.date || ''
        );
        const year  = parseInt(date.slice(0, 4));
        const month = parseInt(date.slice(5, 7) || date.slice(4, 6));
        const amount = parseFloat(
          String(item.dividend || item.amount || item.dividendAmt || '0')
            .replace(/[^0-9.]/g, '')
        );
        return { year, month, amount };
      })
      .filter(d => d.year >= 2023 && d.month >= 1 && d.month <= 12 && d.amount > 0);

    res.json({ code, count: distributions.length, distributions });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
