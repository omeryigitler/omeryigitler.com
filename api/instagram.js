const GRAPH_VERSION = process.env.INSTAGRAM_GRAPH_VERSION || 'v23.0';
const configuredLimit = Number.parseInt(process.env.INSTAGRAM_FEED_LIMIT || '6', 10);
const DEFAULT_LIMIT = Number.isFinite(configuredLimit) ? Math.min(Math.max(configuredLimit, 1), 12) : 6;

function normalizeLimit(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 12) : DEFAULT_LIMIT;
}

function sanitizeMedia(item) {
  if (!item || typeof item !== 'object') return null;
  return {
    id: item.id || null,
    caption: item.caption || '',
    media_type: item.media_type || null,
    media_url: item.media_url || null,
    thumbnail_url: item.thumbnail_url || null,
    permalink: item.permalink || null,
    timestamp: item.timestamp || null
  };
}

function sendJson(res, status, body, cache = 'no-store') {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cache);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const limit = normalizeLimit(req.query.limit);

  if (!token) {
    return sendJson(res, 503, {
      error: 'Instagram feed unavailable',
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
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000)
    });

    const data = await response.json();

    if (!response.ok) {
      console.warn('[instagram] Graph API request failed:', response.status);
      return sendJson(res, response.status, {
        error: 'Instagram request failed',
        data: []
      });
    }

    const cursors = data.paging?.cursors
      ? {
          before: data.paging.cursors.before || null,
          after: data.paging.cursors.after || null
        }
      : null;

    return sendJson(
      res,
      200,
      {
        data: Array.isArray(data.data) ? data.data.map(sanitizeMedia).filter(Boolean) : [],
        // Never return Graph API next/previous URLs; they contain the access token.
        paging: cursors ? { cursors } : null
      },
      's-maxage=3600, stale-while-revalidate=86400'
    );
  } catch (error) {
    console.warn('[instagram] Graph API request unavailable');
    return sendJson(res, 502, {
      error: 'Instagram fetch failed',
      data: []
    });
  }
};

module.exports._test = { normalizeLimit, sanitizeMedia };
