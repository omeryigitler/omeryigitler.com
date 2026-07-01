export default async function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // 1. Skip middleware for static assets, api calls, and specific pages
  if (
    pathname.startsWith('/assets') ||
    pathname.startsWith('/api') ||
    pathname.includes('gateway.html') ||
    pathname.includes('admin.html') ||
    pathname.includes('favicon.ico') ||
    pathname.includes('.php')
  ) {
    return;
  }

  // The previous anonymous Firestore query was denied by the production rules
  // on every public request. Keep the edge blocklist explicitly disabled until
  // it is backed by an authenticated, hashed lookup service.
  if (process.env.EDGE_BLOCKLIST_ENABLED !== 'true') return;

  // 2. Get Visitor IP (Vercel standard)
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const clientIP = ip.split(',')[0].trim();

  try {
    // 3. Query Firestore via REST API (Edge Compatible)
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!projectId || !apiKey) return;
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;

    // ✅ filters dizisi düzeltildi — her fieldFilter { } içine sarıldı
    // ✅ limit: 1 doğru yere (structuredQuery altına) taşındı
    const query = {
      structuredQuery: {
        from: [{ collectionId: "visitors_v1" }],
        where: {
          compositeFilter: {
            op: "AND",
            filters: [
              {
                fieldFilter: {
                  field: { fieldPath: "ip" },
                  op: "EQUAL",
                  value: { stringValue: clientIP }
                }
              },
              {
                fieldFilter: {
                  field: { fieldPath: "action" },
                  op: "EQUAL",
                  value: { stringValue: "block" }
                }
              }
            ]
          }
        },
        limit: 1
      }
    };

    const response = await fetch(firestoreUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
      cache: 'no-store'
    });

    if (response.ok) {
      const results = await response.json();
      const isBlocked = results && results.length > 0 && results[0].document;

      if (isBlocked) {
        console.warn('Middleware blocked a configured visitor.');
        return Response.redirect(new URL('/gateway.html', request.url));
      }
    } else {
      console.warn("Firestore blocklist lookup unavailable:", response.status);
    }

  } catch (e) {
    console.warn("Middleware blocklist check failed.");
  }

  return;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
