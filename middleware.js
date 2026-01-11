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
        pathname.includes('.php') // Common bot probes
    ) {
        return;
    }

    // 2. Get Visitor IP (Vercel standard)
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const clientIP = ip.split(',')[0].trim();

    try {
        // 3. Query Firestore via REST API (Edge Compatible)
        const projectId = "omeryigitler-5abfb";
        const apiKey = "AIzaSyC0DAIT0cVPD4WFpfgqrn0lfb-kyFRsnWM";
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;

        // Structured Query for "where IP == clientIP AND action == 'block'"
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
            // Firestore runQuery returns an array. If not empty and has a document, it's blocked.
            const isBlocked = results && results.length > 0 && results[0].document;

            if (isBlocked) {
                console.log(`🛑 Middleware: Blocking IP ${clientIP}`);
                return Response.redirect(new URL('/gateway.html', request.url));
            }
        } else {
            const err = await response.text();
            console.error("Firestore REST Error:", response.status, err);
        }
    } catch (e) {
        console.error("Middleware Runtime Error:", e);
    }

    return;
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
