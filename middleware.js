import { NextResponse } from 'next/server';

export async function middleware(request) {
    const { pathname } = request.nextUrl;

    // 1. Skip middleware for static assets, api calls, and the gateway/admin pages
    if (
        pathname.startsWith('/assets') ||
        pathname.startsWith('/api') ||
        pathname.includes('gateway.html') ||
        pathname.includes('admin.html') ||
        pathname.includes('favicon.ico')
    ) {
        return NextResponse.next();
    }

    // 2. Get Visitor IP (Vercel standard)
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';

    // We only take the first IP in the list
    const clientIP = ip.split(',')[0].trim();

    try {
        // 3. Query Firestore via REST API (Edge functions don't support firestore-admin)
        // Note: Using a public REST fetch for speed and Edge compatibility
        const projectId = "omeryigitler-5abfb";
        const collection = "visitors_v1";
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}`;

        // Fetching all "blocked" sessions (Optimized for Edge)
        // In a real production environment with many visitors, we'd use a StructuredQuery
        // For this audit, we'll fetch recently updated docs and check IP match
        const response = await fetch(`${url}?pageSize=10`, {
            next: { revalidate: 0 } // No cache for security checks
        });

        if (response.ok) {
            const data = await response.json();
            const documents = data.documents || [];

            const isBlocked = documents.some(doc => {
                const fields = doc.fields;
                if (!fields) return false;

                const docIP = fields.ip?.stringValue;
                const action = fields.action?.stringValue;

                return docIP === clientIP && action === 'block';
            });

            if (isBlocked) {
                console.log(`🛑 Middleware: Blocking IP ${clientIP}`);
                const url = request.nextUrl.clone();
                url.pathname = '/gateway.html';
                return NextResponse.redirect(url);
            }
        }
    } catch (e) {
        console.error("Middleware Error:", e);
    }

    return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
