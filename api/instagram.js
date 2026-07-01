const { verifyAgentRequest, handleCommand, listPendingApprovals, decideApproval } = require('../lib/agent');

const GRAPH_VERSION = process.env.INSTAGRAM_GRAPH_VERSION || 'v23.0';
const DEFAULT_LIMIT = Number(process.env.INSTAGRAM_FEED_LIMIT || 6);

function sendJson(res, status, body, cache = 'no-store') {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cache);
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw);
}

function methodNotAllowed(res, allowedMethods) {
  res.setHeader('Allow', allowedMethods.join(', '));
  return sendJson(res, 405, { ok: false, error: 'Method not allowed', allowedMethods });
}

function errorResponse(error) {
  const status = Number(error?.statusCode || error?.status || 500);
  return {
    status,
    body: {
      error: status >= 500 ? 'Internal server error' : error.message || 'Request failed'
    }
  };
}

async function handleAgentRoute(req, res) {
  const action = String(req.query?.agent || '').toLowerCase();

  try {
    const actor = await verifyAgentRequest(req);

    if (action === 'status') {
      if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
      const approvals = await listPendingApprovals();
      return sendJson(res, 200, { ok: true, approvals });
    }

    if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
    const body = await readJson(req);

    if (action === 'approve') {
      const result = await decideApproval({
        approvalId: body.approvalId,
        decision: body.decision,
        actor
      });
      return sendJson(res, 200, { ok: true, ...result });
    }

    const result = await handleCommand({
      text: body.text || body.command,
      source: body.source || 'admin_panel',
      actor
    });
    return sendJson(res, 200, { ok: true, ...result });
  } catch (error) {
    const { status, body } = errorResponse(error);
    return sendJson(res, status, { ok: false, ...body });
  }
}

module.exports = async function handler(req, res) {
  if (req.query?.agent) {
    return handleAgentRoute(req, res);
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const limit = Math.min(Math.max(Number(req.query.limit || DEFAULT_LIMIT), 1), 12);

  if (!token) {
    return sendJson(res, 500, {
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
      return sendJson(res, response.status, {
        error: 'Instagram request failed',
        details: data,
        data: []
      });
    }

    return sendJson(
      res,
      200,
      {
        data: Array.isArray(data.data) ? data.data : [],
        paging: data.paging || null
      },
      's-maxage=3600, stale-while-revalidate=86400'
    );
  } catch (error) {
    return sendJson(res, 502, {
      error: 'Instagram fetch failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      data: []
    });
  }
};
