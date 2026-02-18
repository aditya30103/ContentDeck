import type { Bookmark, TagArea, StatusHistoryEntry, BookmarkTag, BookmarkContent } from '../types';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

const SAMPLE_CONTENT: BookmarkContent = {
  text: `A well-structured monolith is easier to split into services later than a poorly structured microservice architecture. The key insight is that module boundaries within a monolith can be just as strong as service boundaries — the difference is that they're enforced by code conventions rather than network boundaries.

The argument for microservices has always been about organizational scaling: Conway's Law tells us that software architecture mirrors the communication structure of the teams building it. But for most teams, a modular monolith provides 80% of the benefits with 20% of the operational overhead.

What makes a modular monolith successful is strict adherence to module boundaries in code. Each module owns its data — no module reaches into another module's database tables. Cross-module communication goes through defined interfaces, not direct function calls into implementation details.

The failure mode of the monolith is not the monolith itself, but the big ball of mud: an unmodularized codebase where everything depends on everything else. This is what gives monoliths a bad reputation, and what makes them hard to split later.

The failure mode of microservices is distributed systems complexity introduced before you actually need it: network failures, eventual consistency, distributed transactions, service discovery, and the cascade of operational concerns that come with running dozens of independent services.

The pragmatic path: start with a well-modularized monolith. Define clear module boundaries from day one. When — and only when — a specific module needs to scale independently or be owned by a separate team, extract it into a service. The boundaries you defined in the monolith become your service contracts.

This approach also means your deployment story stays simple early in a project's life, when you have the least certainty about the right boundaries. It's much easier to refine module boundaries within a codebase than to change service contracts across independently deployed systems.

Teams that succeed with this approach treat the module boundary as seriously as a service boundary: no shared mutable state, explicit interfaces, separate test suites per module, and module-scoped database schemas (even if they share a single database instance).

The key metrics to watch: if a single module accounts for more than 30% of your deployment risk, or if a module's team has grown to the point where they're stepping on each other's work, those are signals it's time to extract. Not the size of the codebase alone.`,
  author: 'Martin Fowler',
  word_count: 5100,
  reading_time: 20,
  excerpt:
    'Finding the sweet spot between monolith and microservices — a practical guide to modular architecture.',
  extracted_at: daysAgo(2),
  method: 'readability',
};

const DEMO_CONTENT_USEEFFECT: BookmarkContent = {
  text: `useEffect is one of the most misunderstood hooks in React. Many developers reach for it as a catch-all for "I need to do something after render" — but that framing leads to bugs, infinite loops, and code that's hard to reason about.

The mental model that actually works: useEffect lets you synchronize your component with something outside React. That "something" might be a browser API, a network request, a subscription, or a third-party library. If you're not synchronizing with something external, you probably don't need useEffect.

The cleanup function is not optional. Every effect that sets up a subscription, starts an interval, or registers an event listener must return a cleanup function. React runs cleanup before re-running the effect and when the component unmounts. Forgetting this is the number one source of memory leaks and stale closure bugs.

The dependency array is a contract, not a performance optimization. Every value from the component scope that the effect reads must be in the dependency array. If you find yourself adding a comment like "// eslint-disable-next-line" to suppress the exhaustive-deps warning, that's a signal your effect design needs rethinking, not that the linter is wrong.

Common patterns and their correct implementations:

Data fetching: The most common misuse. Modern React recommends using a data-fetching library like TanStack Query or SWR instead of raw useEffect for fetching. These handle caching, deduplication, loading states, and error states correctly. If you must use useEffect for fetching, always handle the cleanup with an AbortController to cancel in-flight requests when the component unmounts.

Event listeners: Add the listener in the effect, remove it in the cleanup. Pass the handler as a ref if it needs to close over component state to avoid stale closures.

Timers: Create the timer in the effect, clear it in the cleanup. Don't use the timer ID from a ref — let the closure capture it.

Derived state: Never use useEffect to compute derived state from props or other state. Compute it directly during render, or use useMemo for expensive computations.

The rules of hooks exist because React relies on call order stability. Effects are no different — the same number of hook calls, in the same order, every render. Conditional effects are achieved by putting the condition inside the effect, not by conditionally calling useEffect.`,
  author: 'Dan Abramov',
  word_count: 8900,
  reading_time: 35,
  excerpt:
    'A deep dive into the mental model, dependency arrays, cleanup functions, and common pitfalls of useEffect.',
  extracted_at: daysAgo(5),
  method: 'readability',
};

const DEMO_CONTENT_BROWSER_DESIGN: BookmarkContent = {
  text: `Designing directly in the browser sounds counterintuitive if you've spent years in Figma or Sketch. But for components that live in the browser, the browser is the right design tool.

The problem with mockup tools is fidelity loss: you design something that looks pixel-perfect in Figma, then implement it in CSS, and it never quite matches. Text rendering is different. Spacing is different. The way fonts scale at different viewport sizes is different. You spend hours reconciling the mockup with the implementation.

Designing in the browser eliminates that gap entirely. What you see during design is what ships.

The workflow: start with semantic HTML. A heading, some paragraphs, a list. No classes, no styling — just the structure. Then add CSS incrementally, making decisions in the browser where the feedback loop is immediate. Use browser DevTools as your design canvas; toggle properties, try different values, copy the winning CSS back to your editor.

Responsive design becomes natural this way. You can drag the browser window to see how your component behaves at different widths, immediately. In Figma, responsive behavior is a separate artboard. In the browser, it's always there.

The objection is usually about iteration speed: isn't it faster to prototype in Figma? For visual explorations with stakeholders who can't read code, yes. But for a developer designing their own components, the context switch between Figma and the codebase has a cost. Designing in the browser means staying in one context.

Typography decisions reveal themselves differently in the browser. You immediately see how the font renders at the system level — anti-aliasing, subpixel rendering, the way different weights look at small sizes. These details are invisible in mockup tools.

The practical setup: a hot-reloading dev server (Vite is ideal), a minimal component scaffolded with HTML, and a browser window side-by-side with your editor. No extensions required, no special tooling. Just the fundamentals working together.

Start small: try designing your next button component this way. Or a card. The technique scales from atoms to full page layouts, but the best place to start is with something you can complete in an afternoon.`,
  author: 'Jim Nielsen',
  word_count: 1800,
  reading_time: 7,
  excerpt:
    'Skip the mockup tools — designing directly in CSS gives you real typography, real spacing, and real interactions.',
  extracted_at: daysAgo(1),
  method: 'readability',
};

export const DEMO_BOOKMARKS: Bookmark[] = [
  {
    id: 'demo-1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    title: 'The Future of Web Development - 2025 and Beyond',
    image: null,
    excerpt: null,
    source_type: 'youtube',
    status: 'unread',
    is_favorited: true,
    notes: [],
    tags: ['webdev', 'frontend'],
    areas: [],
    metadata: { duration: '18:42', channel: 'Fireship' },
    content: {},
    content_status: 'skipped',
    content_fetched_at: null,
    synced: false,
    created_at: daysAgo(1),
    status_changed_at: daysAgo(1),
    started_reading_at: null,
    finished_at: null,
  },
  {
    id: 'demo-2',
    url: 'https://www.youtube.com/watch?v=abc123demo',
    title: 'React Server Components Explained Simply',
    image: null,
    excerpt: null,
    source_type: 'youtube',
    status: 'reading',
    is_favorited: false,
    notes: [
      {
        type: 'highlight',
        content: 'RSCs run only on the server — zero JS shipped to client for these components.',
        created_at: daysAgo(2),
      },
    ],
    tags: ['react', 'frontend'],
    areas: [],
    metadata: { duration: '24:15', channel: 'Theo' },
    content: {},
    content_status: 'skipped',
    content_fetched_at: null,
    synced: false,
    created_at: daysAgo(3),
    status_changed_at: daysAgo(2),
    started_reading_at: daysAgo(2),
    finished_at: null,
  },
  {
    id: 'demo-3',
    url: 'https://x.com/dan_abramov/status/1234567890',
    title: 'Dan Abramov on the evolution of React mental models',
    image: null,
    excerpt: null,
    source_type: 'twitter',
    status: 'done',
    is_favorited: true,
    notes: [
      {
        type: 'insight',
        content:
          'The shift from lifecycle methods to effects mirrors how we think about synchronization, not sequences.',
        created_at: daysAgo(5),
      },
    ],
    tags: ['react', 'mental-models'],
    areas: [],
    metadata: {},
    content: {},
    content_status: 'skipped',
    content_fetched_at: null,
    synced: true,
    created_at: daysAgo(7),
    status_changed_at: daysAgo(5),
    started_reading_at: daysAgo(6),
    finished_at: daysAgo(5),
  },
  {
    id: 'demo-4',
    url: 'https://x.com/swyx/status/9876543210',
    title: 'swyx: Why every developer should write in public',
    image: null,
    excerpt: null,
    source_type: 'twitter',
    status: 'unread',
    is_favorited: false,
    notes: [],
    tags: ['career', 'writing'],
    areas: [],
    metadata: {},
    content: {},
    content_status: 'skipped',
    content_fetched_at: null,
    synced: false,
    created_at: daysAgo(2),
    status_changed_at: daysAgo(2),
    started_reading_at: null,
    finished_at: null,
  },
  {
    id: 'demo-5',
    url: 'https://www.linkedin.com/posts/guillermo-rauch_vercel-ai-deploy',
    title: 'Guillermo Rauch on the future of AI-powered deployment',
    image: null,
    excerpt: null,
    source_type: 'linkedin',
    status: 'unread',
    is_favorited: false,
    notes: [],
    tags: ['ai', 'devops'],
    areas: [],
    metadata: {},
    content: {},
    content_status: 'pending',
    content_fetched_at: null,
    synced: false,
    created_at: daysAgo(1),
    status_changed_at: daysAgo(1),
    started_reading_at: null,
    finished_at: null,
  },
  {
    id: 'demo-6',
    url: 'https://www.linkedin.com/pulse/engineering-leadership-lessons-2025',
    title: '10 Engineering Leadership Lessons from Scaling to 100 Engineers',
    image: null,
    excerpt: null,
    source_type: 'linkedin',
    status: 'reading',
    is_favorited: false,
    notes: [],
    tags: ['leadership', 'career'],
    areas: [],
    metadata: { word_count: 2400, reading_time: 10 },
    content: {},
    content_status: 'pending',
    content_fetched_at: null,
    synced: false,
    created_at: daysAgo(4),
    status_changed_at: daysAgo(3),
    started_reading_at: daysAgo(3),
    finished_at: null,
  },
  {
    id: 'demo-7',
    url: 'https://newsletter.pragmaticengineer.com/p/measuring-developer-productivity',
    title: 'Measuring Developer Productivity: What Actually Works',
    image: null,
    excerpt:
      'DORA metrics, cycle time, and deployment frequency — the signals that actually predict team health.',
    source_type: 'substack',
    status: 'done',
    is_favorited: true,
    notes: [
      {
        type: 'insight',
        content:
          'DORA metrics work best when teams self-report, not when management enforces them.',
        created_at: daysAgo(4),
      },
      {
        type: 'question',
        content: 'How would this apply to a team of < 5 engineers?',
        created_at: daysAgo(4),
      },
    ],
    tags: ['productivity', 'engineering'],
    areas: [],
    metadata: { word_count: 3200, reading_time: 13 },
    content: {},
    content_status: 'pending',
    content_fetched_at: null,
    synced: false,
    created_at: daysAgo(10),
    status_changed_at: daysAgo(4),
    started_reading_at: daysAgo(6),
    finished_at: daysAgo(4),
  },
  {
    id: 'demo-8',
    url: 'https://lethain.com/elegant-puzzle/',
    title: 'An Elegant Puzzle: Systems of Engineering Management',
    image: null,
    excerpt:
      'Systems thinking applied to engineering management — staffing ratios, team sizing, and technical debt as inventory.',
    source_type: 'blog',
    status: 'unread',
    is_favorited: false,
    notes: [],
    tags: ['leadership', 'systems-thinking'],
    areas: [],
    metadata: { word_count: 4500, reading_time: 18 },
    content: {},
    content_status: 'pending',
    content_fetched_at: null,
    synced: false,
    created_at: daysAgo(2),
    status_changed_at: daysAgo(2),
    started_reading_at: null,
    finished_at: null,
  },
  {
    id: 'demo-9',
    url: 'https://blog.jim-nielsen.com/2025/designing-with-the-browser/',
    title: 'Designing in the Browser: A Practical Guide',
    image: null,
    excerpt:
      'Skip the mockup tools — designing directly in CSS gives you real typography, real spacing, and real interactions.',
    source_type: 'blog',
    status: 'unread',
    is_favorited: false,
    notes: [],
    tags: ['design', 'css'],
    areas: [],
    metadata: { word_count: 1800, reading_time: 7 },
    content: DEMO_CONTENT_BROWSER_DESIGN,
    content_status: 'success',
    content_fetched_at: daysAgo(1),
    synced: false,
    created_at: daysAgo(3),
    status_changed_at: daysAgo(3),
    started_reading_at: null,
    finished_at: null,
  },
  {
    id: 'demo-10',
    url: 'https://martinfowler.com/articles/modular-monolith.html',
    title: 'The Modular Monolith: Finding the Sweet Spot',
    image: null,
    excerpt: null,
    source_type: 'blog',
    status: 'reading',
    is_favorited: false,
    notes: [
      {
        type: 'highlight',
        content:
          'A well-structured monolith is easier to split into services later than a poorly structured microservice architecture.',
        created_at: daysAgo(1),
      },
    ],
    tags: ['architecture', 'engineering'],
    areas: [],
    metadata: { word_count: 5100, reading_time: 20 },
    content: SAMPLE_CONTENT,
    content_status: 'success',
    content_fetched_at: daysAgo(2),
    synced: false,
    created_at: daysAgo(8),
    status_changed_at: daysAgo(2),
    started_reading_at: daysAgo(2),
    finished_at: null,
  },
  {
    id: 'demo-11',
    url: 'https://www.youtube.com/watch?v=xyz789demo',
    title: 'Building a Second Brain — Full Workshop',
    image: null,
    excerpt: null,
    source_type: 'youtube',
    status: 'done',
    is_favorited: false,
    notes: [],
    tags: ['productivity', 'pkm'],
    areas: [],
    metadata: { duration: '1:12:30', channel: 'Tiago Forte' },
    content: {},
    content_status: 'skipped',
    content_fetched_at: null,
    synced: true,
    created_at: daysAgo(14),
    status_changed_at: daysAgo(8),
    started_reading_at: daysAgo(12),
    finished_at: daysAgo(8),
  },
  {
    id: 'demo-12',
    url: 'https://www.goodreads.com/book/show/38986336-atomic-habits',
    title: 'Atomic Habits by James Clear',
    image: null,
    excerpt: null,
    source_type: 'book',
    status: 'reading',
    is_favorited: false,
    notes: [],
    tags: ['productivity', 'habits'],
    areas: [],
    metadata: {},
    content: {},
    content_status: 'pending',
    content_fetched_at: null,
    synced: false,
    created_at: daysAgo(12),
    status_changed_at: daysAgo(5),
    started_reading_at: daysAgo(5),
    finished_at: null,
  },
  {
    id: 'demo-13',
    url: 'https://overreacted.io/a-complete-guide-to-useeffect/',
    title: 'A Complete Guide to useEffect',
    image: null,
    excerpt: null,
    source_type: 'blog',
    status: 'done',
    is_favorited: false,
    notes: [],
    tags: ['react', 'frontend'],
    areas: [],
    metadata: { word_count: 8900, reading_time: 35 },
    content: DEMO_CONTENT_USEEFFECT,
    content_status: 'success',
    content_fetched_at: daysAgo(5),
    synced: true,
    created_at: daysAgo(13),
    status_changed_at: daysAgo(9),
    started_reading_at: daysAgo(11),
    finished_at: daysAgo(9),
  },
  {
    id: 'demo-14',
    url: 'https://kentcdodds.com/blog/aha-programming',
    title: 'AHA Programming — Avoid Hasty Abstractions',
    image: null,
    excerpt: null,
    source_type: 'blog',
    status: 'unread',
    is_favorited: false,
    notes: [],
    tags: [],
    areas: [],
    metadata: { word_count: 1200, reading_time: 5 },
    content: {},
    content_status: 'pending',
    content_fetched_at: null,
    synced: false,
    created_at: daysAgo(1),
    status_changed_at: daysAgo(1),
    started_reading_at: null,
    finished_at: null,
  },
  {
    id: 'demo-15',
    url: 'https://substack.com/@stratechery/p/ai-and-the-big-five',
    title: 'AI and the Big Five — Stratechery',
    image: null,
    excerpt:
      'How Microsoft, Google, Amazon, Apple, and Meta are positioning around large language models and generative AI infrastructure.',
    source_type: 'substack',
    status: 'unread',
    is_favorited: false,
    notes: [],
    tags: [],
    areas: [],
    metadata: { word_count: 3800, reading_time: 15 },
    content: {},
    content_status: 'pending',
    content_fetched_at: null,
    synced: false,
    created_at: daysAgo(0),
    status_changed_at: daysAgo(0),
    started_reading_at: null,
    finished_at: null,
  },
];

export const DEMO_TAG_AREAS: TagArea[] = [
  {
    id: 'area-1',
    name: 'design',
    description: 'UI, UX, and visual design',
    color: '#ec4899',
    emoji: '\uD83C\uDFA8',
    sort_order: 0,
    created_at: daysAgo(30),
  },
  {
    id: 'area-2',
    name: 'engineering',
    description: 'Architecture, patterns, and code',
    color: '#3b82f6',
    emoji: '\u2699\uFE0F',
    sort_order: 1,
    created_at: daysAgo(30),
  },
  {
    id: 'area-3',
    name: 'productivity',
    description: 'Systems, habits, and workflows',
    color: '#22c55e',
    emoji: '\u26A1',
    sort_order: 2,
    created_at: daysAgo(30),
  },
  {
    id: 'area-4',
    name: 'career',
    description: 'Growth, leadership, and networking',
    color: '#f59e0b',
    emoji: '\uD83D\uDE80',
    sort_order: 3,
    created_at: daysAgo(30),
  },
  {
    id: 'area-5',
    name: 'react',
    description: 'React ecosystem and patterns',
    color: '#06b6d4',
    emoji: '\u269B\uFE0F',
    sort_order: 4,
    created_at: daysAgo(30),
  },
];

// Junction table: bookmark <-> area assignments
export const DEMO_BOOKMARK_TAGS: BookmarkTag[] = [
  // demo-2: React Server Components → react
  { bookmark_id: 'demo-2', tag_area_id: 'area-5' },
  // demo-3: Dan Abramov on React → react
  { bookmark_id: 'demo-3', tag_area_id: 'area-5' },
  // demo-4: swyx on writing → career
  { bookmark_id: 'demo-4', tag_area_id: 'area-4' },
  // demo-6: Engineering Leadership → career
  { bookmark_id: 'demo-6', tag_area_id: 'area-4' },
  // demo-7: Measuring Developer Productivity → productivity, engineering
  { bookmark_id: 'demo-7', tag_area_id: 'area-3' },
  { bookmark_id: 'demo-7', tag_area_id: 'area-2' },
  // demo-9: Designing in the Browser → design
  { bookmark_id: 'demo-9', tag_area_id: 'area-1' },
  // demo-10: Modular Monolith → engineering
  { bookmark_id: 'demo-10', tag_area_id: 'area-2' },
  // demo-11: Building a Second Brain → productivity
  { bookmark_id: 'demo-11', tag_area_id: 'area-3' },
  // demo-12: Atomic Habits → productivity
  { bookmark_id: 'demo-12', tag_area_id: 'area-3' },
  // demo-13: useEffect guide → react
  { bookmark_id: 'demo-13', tag_area_id: 'area-5' },
];

export const DEMO_STATUS_HISTORY: StatusHistoryEntry[] = [
  {
    id: 'hist-1',
    bookmark_id: 'demo-3',
    old_status: 'reading',
    new_status: 'done',
    changed_at: daysAgo(5),
  },
  {
    id: 'hist-2',
    bookmark_id: 'demo-7',
    old_status: 'reading',
    new_status: 'done',
    changed_at: daysAgo(4),
  },
  {
    id: 'hist-3',
    bookmark_id: 'demo-11',
    old_status: 'reading',
    new_status: 'done',
    changed_at: daysAgo(8),
  },
  {
    id: 'hist-4',
    bookmark_id: 'demo-13',
    old_status: 'reading',
    new_status: 'done',
    changed_at: daysAgo(9),
  },
  {
    id: 'hist-5',
    bookmark_id: 'demo-2',
    old_status: 'unread',
    new_status: 'reading',
    changed_at: daysAgo(2),
  },
  {
    id: 'hist-6',
    bookmark_id: 'demo-6',
    old_status: 'unread',
    new_status: 'reading',
    changed_at: daysAgo(3),
  },
  {
    id: 'hist-7',
    bookmark_id: 'demo-10',
    old_status: 'unread',
    new_status: 'reading',
    changed_at: daysAgo(2),
  },
  {
    id: 'hist-8',
    bookmark_id: 'demo-12',
    old_status: 'unread',
    new_status: 'reading',
    changed_at: daysAgo(5),
  },
  // Extra completions to build a streak (yesterday and day before)
  {
    id: 'hist-9',
    bookmark_id: 'demo-3',
    old_status: 'reading',
    new_status: 'done',
    changed_at: daysAgo(1),
  },
  {
    id: 'hist-10',
    bookmark_id: 'demo-7',
    old_status: 'reading',
    new_status: 'done',
    changed_at: daysAgo(0),
  },
];
