const GRAPH_VERSION = process.env.INSTAGRAM_GRAPH_VERSION || 'v23.0';
const DEFAULT_LIMIT = Number(process.env.INSTAGRAM_FEED_LIMIT || 6);

function json(res, status, body, cache = 'no-store') {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cache);
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const limit = Math.min(Math.max(Number(req.query.limit || DEFAULT_LIMIT), 1), 12);

  if (!token) {
    return json(res, 500, {
      error: 'Missing INSTAGRAM_ACCESS_TOKEN',
      data: []
    });
  }

  const fields = [
    'id',
    'caption',
    'media_type',
    'media_url',
    'thumbnail_url',
    'permalink',
    'timestamp'
  ].join(',');

  const endpoint = new URL(`https://graph.instagram.com/${GRAPH_VERSION}/me/media`);
  endpoint.searchParams.set('fields', fields);
  endpoint.searchParams.set('limit', String(limit));
  endpoint.searchParams.set('access_token', token);

  try {
    const response = await fetch(endpoint.toString(), {
      headers: { Accept: 'application/json' }
    });

    const data = await response.json();

    if (!response.ok) {
      return json(res, response.status, {
        error: 'Instagram request failed',
        details: data,
        data: []
      });
    }

    return json(
      res,
      200,
      {
        data: Array.isArray(data.data) ? data.data : [],
        paging: data.paging || null
      },
      's-maxage=3600, stale-while-revalidate=86400'
    );
  } catch (error) {
    return json(res, 502, {
      error: 'Instagram fetch failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      data: []
    });
  }
}
