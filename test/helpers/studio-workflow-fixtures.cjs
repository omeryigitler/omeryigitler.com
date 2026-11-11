const assert = require('node:assert/strict');
function database(seed = {}) {
  const data = new Map(Object.entries(seed));
  let sequence = 0, queue = Promise.resolve();
  const snap = ref => ({ id: ref.id, exists: data.has(ref.key), data: () => structuredClone(data.get(ref.key)) });
  function batch() {
    const writes = [];
    return {
      set(ref, value, options) { writes.push(() => data.set(ref.key, options?.merge ? { ...data.get(ref.key), ...structuredClone(value) } : structuredClone(value))); },
      async commit() { writes.forEach(fn => fn()); }
    };
  }
  const db = {
    data, batch,
    collection(name) {
      return {
        doc(id = `audit-${++sequence}`) {
          const ref = { key: `${name}/${id}`, id };
          return { ...ref, get: async () => snap(ref) };
        },
        orderBy() {
          return {
            limit(n) {
              return {
                async get() {
                  const docs = [...data].filter(([key]) => key.startsWith(`${name}/`)).slice(0,n).map(([key]) => snap({ key, id: key.split('/')[1] }));
                  return { docs };
                }
              };
            }
          };
        }
      };
    },
    runTransaction(fn) {
      const work = queue.then(async () => {
        let writing = false;
        const b = batch();
        const result = await fn({
          get: async ref => { assert.equal(writing, false, 'Firestore reads must precede all writes'); return snap(ref); },
          set: (...args) => { writing = true; b.set(...args); }
        });
        await b.commit();
        return result;
      });
      queue = work.catch(() => {});
      return work;
    }
  };
  return db;
}
const ID = 'a'.repeat(32), NOW = Date.parse('2026-11-11T16:00Z'), actor = { id: 'test-owner' };
const company = { name: 'Fixture Harbour Salon', country: 'MT', location: 'Valletta', industry: 'Beauty', website: 'https://example.com/', source: 'https://www.openstreetmap.org/node/1' };
const research = { summary: 'A salon serving the harbour area.', facts: [{ text: 'Hair appointments are available.', source: 0 }], sources: [{ title: 'Official site', url: 'https://example.com/' }], opportunities: ['Clarify booking'], unknowns: ['Opening times'], contacts: [{ email: 'hello@example.com', source: 'https://example.com/contact' }], fit: 'high', direction: 'Calm editorial salon' };
const proposal = { subject: 'A clearer booking journey', body: 'I reviewed your salon site and prepared a booking-focused proposal.', summary: 'Booking-focused salon website', pages: ['Home','Services','Book'], deliverables: ['Responsive custom design','Appointment enquiry'], exclusions: ['Booking platform fees'], rationale: 'Help visitors find the booking route.', scope: { siteType: 'CORPORATE', hasSeo: true, hasUx: true } };
const concept = { subject: 'Your salon concept', body: 'Here is the private salon concept for review.', rationale: 'Service-led editorial composition.', theme: { background: '#f5f1e8', foreground: '#252925', accent: '#674c3c', surface: '#ece5d7', layout: 'editorial', type: 'serif', radius: 'square' }, eyebrow: 'Harbour hair studio', headline: 'A quieter moment for your hair.', intro: 'Explore services and request an appointment.', cta: 'Request a visit', sections: [{ title: 'Services', body: 'Explore the salon offering.', items: ['Appointment enquiry'] },{ title: 'Visit', body: 'Plan your next appointment.', items: [] }] };
const contact = { email: 'hello@example.com', source: 'https://example.com/contact', basis: 'first_contact', verified: true };
module.exports={database,ID,NOW,actor,company,research,proposal,concept,contact};

