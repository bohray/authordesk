import "server-only";
import type { Types } from "mongoose";
import { priorityRankByLevel, type TicketCategory, type TicketPriority, type TicketStatus } from "@/shared/constants/ticket";
import { hashPassword } from "../auth/password";
import { msPerDay, msPerHour } from "../lib/time";
import {
  AiDraft,
  AiUsageLog,
  Book,
  Counter,
  LoginAttempt,
  Ticket,
  TicketEvent,
  TicketNote,
  User,
  nextTicketNumber,
} from "./models";

/** Shape of data/sample-data.json (as provided). */
export interface SampleData {
  authors: {
    author_id: string;
    name: string;
    email: string;
    phone: string;
    city: string;
    joined_date: string;
    books: SampleBook[];
  }[];
}

/** One book in the sample dataset (snake_case, as provided). */
export interface SampleBook {
  book_id: string;
  title: string;
  isbn: string;
  genre: string;
  publication_date: string | null;
  status: string;
  mrp: number | null;
  author_royalty_per_copy: number | null;
  total_copies_sold: number;
  total_royalty_earned: number;
  royalty_paid: number;
  royalty_pending: number;
  last_royalty_payout_date: string | null;
  print_partner: string | null;
  available_on: string[];
}

export const demoPasswords = { author: "Author@123", admin: "Admin@123" } as const;
export const demoAdmins = [
  { email: "admin@authordesk.dev", name: "Aisha Verma" },
  { email: "ops@authordesk.dev", name: "Karan Mehta" },
];

interface DemoTicket {
  authorCode: string;
  bookCode: string | null;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  daysAgo: number;
  reply?: string;
}

/** Realistic demo tickets so the admin queue isn't empty on first login. */
const demoTickets: DemoTicket[] = [
  {
    authorCode: "AUTH003",
    bookCode: "BK005",
    subject: "No royalty received since my book was published",
    description:
      "My book Between Two Temples was published in July 2024 and I have never received a single royalty payment. My dashboard shows ₹2,546 pending. It has been over a year. What is going on?",
    category: "ROYALTY_PAYMENTS",
    priority: "CRITICAL",
    status: "OPEN",
    daysAgo: 4,
  },
  {
    authorCode: "AUTH002",
    bookCode: "BK003",
    subject: "Different ISBN showing on Amazon",
    description:
      "The ISBN on the Amazon India listing for Code & Karma does not match the ISBN printed on the back cover of my physical copies. Readers are getting confused.",
    category: "ISBN_METADATA",
    priority: "HIGH",
    status: "IN_PROGRESS",
    daysAgo: 2,
  },
  {
    authorCode: "AUTH005",
    bookCode: "BK009",
    subject: "Author copies have blurry images",
    description:
      "I received my author copies of Letters from Lakshadweep and the photographs inside are blurry and a few pages are misaligned. I can share photos.",
    category: "PRINTING_QUALITY",
    priority: "HIGH",
    status: "OPEN",
    daysAgo: 1,
  },
  {
    authorCode: "AUTH004",
    bookCode: "BK006",
    subject: "Book shows Currently Unavailable on Flipkart",
    description:
      "Debugging Life is showing as 'Currently Unavailable' on Flipkart since last week, but it is available on Amazon. I am losing sales.",
    category: "DISTRIBUTION_AVAILABILITY",
    priority: "MEDIUM",
    status: "OPEN",
    daysAgo: 3,
  },
  {
    authorCode: "AUTH009",
    bookCode: "BK015",
    subject: "Raising Roots stuck in typesetting for 3 weeks",
    description:
      "It has been about three weeks and my book Raising Roots is still showing as Typesetting. When will it move to the next stage?",
    category: "BOOK_STATUS_PRODUCTION",
    priority: "MEDIUM",
    status: "OPEN",
    daysAgo: 6,
  },
  {
    authorCode: "AUTH001",
    bookCode: null,
    subject: "How do I update my author bio?",
    description:
      "I would like to update the author bio that appears on my book pages. Can I do this myself from the dashboard?",
    category: "GENERAL_INQUIRY",
    priority: "LOW",
    status: "RESOLVED",
    daysAgo: 9,
    reply:
      "Hi Priya, thanks for reaching out! You can update your author bio from your dashboard, or email it to our team and we will update it for you. Changes typically reflect on all platforms within 3–5 business days. Let us know once you've sent it and we'll confirm when it's live.",
  },
  {
    authorCode: "AUTH007",
    bookCode: "BK012",
    subject: "Royalty amount looks too low",
    description:
      "I've sold 723 copies of Ctrl+Alt+Delete My Ex but the royalty I've received feels low. Can you explain how it's calculated?",
    category: "ROYALTY_PAYMENTS",
    priority: "MEDIUM",
    status: "OPEN",
    daysAgo: 0,
  },
  {
    authorCode: "AUTH010",
    bookCode: "BK018",
    subject: "When will I receive my first payout?",
    description:
      "Howrah Nights was published in January and shows ₹1,575 pending. I haven't received anything yet. When is the next payout?",
    category: "ROYALTY_PAYMENTS",
    priority: "HIGH",
    status: "OPEN",
    daysAgo: 5,
  },
];

/** Demo tickets are created `daysAgo` days plus this offset before now… */
const ticketCreatedOffsetMs = 2 * msPerHour;
/** …answered this long after creation… */
const demoReplyDelayMs = 3 * msPerHour;
/** …and (when RESOLVED) resolved this long after creation. */
const demoResolveDelayMs = 4 * msPerHour;

const demoAiState = {
  status: "DONE",
  confidence: 0.9,
  reasoning: "Seeded demo ticket (pre-classified).",
  model: "seed",
  attempts: 1,
} as const;

type SeededBook = { id: string; title: string; isbn: string };
type SeededAdmin = { _id: Types.ObjectId; name: string };

/** Every collection the app writes to, so a re-seed starts from a clean slate. */
async function clearCollections() {
  await Promise.all([
    User.deleteMany({}),
    Book.deleteMany({}),
    Ticket.deleteMany({}),
    TicketNote.deleteMany({}),
    TicketEvent.deleteMany({}),
    AiDraft.deleteMany({}),
    AiUsageLog.deleteMany({}),
    Counter.deleteMany({}),
    LoginAttempt.deleteMany({}),
  ]);
}

function toBookFields(book: SampleBook, authorId: Types.ObjectId) {
  return {
    code: book.book_id,
    authorId,
    title: book.title,
    isbn: book.isbn,
    genre: book.genre,
    publicationDate: book.publication_date ? new Date(book.publication_date) : null,
    status: book.status,
    mrp: book.mrp,
    royaltyPerCopy: book.author_royalty_per_copy,
    copiesSold: book.total_copies_sold,
    royalty: {
      earned: book.total_royalty_earned,
      paid: book.royalty_paid,
      pending: book.royalty_pending,
      lastPayoutDate: book.last_royalty_payout_date ? new Date(book.last_royalty_payout_date) : null,
    },
    printPartner: book.print_partner,
    availableOn: book.available_on,
  };
}

/** Creates each author with their books; returns lookups the demo tickets need. */
async function seedAuthorsAndBooks(data: SampleData, passwordHash: string) {
  const authorByCode = new Map<string, { id: string; name: string }>();
  const bookByCode = new Map<string, SeededBook>();

  for (const author of data.authors) {
    const user = await User.create({
      email: author.email,
      name: author.name,
      role: "AUTHOR",
      passwordHash,
      authorProfile: {
        code: author.author_id,
        phone: author.phone,
        city: author.city,
        joinedDate: new Date(author.joined_date),
      },
    });
    authorByCode.set(author.author_id, { id: user._id.toString(), name: author.name });

    const books = await Book.insertMany(author.books.map((book) => toBookFields(book, user._id)));
    for (const book of books) {
      bookByCode.set(book.code, { id: book._id.toString(), title: book.title, isbn: book.isbn });
    }
  }
  return { authorByCode, bookByCode };
}

async function seedDemoTicket(
  demo: DemoTicket,
  author: { id: string; name: string },
  book: SeededBook | null,
  admin: SeededAdmin,
) {
  const createdAt = new Date(Date.now() - demo.daysAgo * msPerDay - ticketCreatedOffsetMs);
  const messages = demo.reply
    ? [
        {
          senderId: admin._id,
          senderRole: "ADMIN",
          senderName: admin.name,
          body: demo.reply,
          aiAssisted: true,
          createdAt: new Date(createdAt.getTime() + demoReplyDelayMs),
        },
      ]
    : [];
  const hasOwner = demo.status === "IN_PROGRESS" || demo.status === "RESOLVED";
  const ticket = await Ticket.create({
    ticketNumber: await nextTicketNumber(),
    authorId: author.id,
    bookId: book?.id ?? null,
    bookSnapshot: book ? { title: book.title, isbn: book.isbn } : null,
    subject: demo.subject,
    description: demo.description,
    status: demo.status,
    category: demo.category,
    categorySource: "AI",
    priority: demo.priority,
    prioritySource: "AI",
    priorityRank: priorityRankByLevel[demo.priority],
    ai: { ...demoAiState, suggestedCategory: demo.category, suggestedPriority: demo.priority },
    assigneeId: hasOwner ? admin._id : null,
    messages,
    firstResponseAt: messages[0]?.createdAt ?? null,
    resolvedAt: demo.status === "RESOLVED" ? new Date(createdAt.getTime() + demoResolveDelayMs) : null,
    createdAt,
    updatedAt: messages[0]?.createdAt ?? createdAt,
  });
  await TicketEvent.create({ ticketId: ticket._id, type: "CREATED", actorName: author.name, to: "OPEN" });
}

/** Idempotent: wipes the app collections and re-creates the demo dataset. */
export async function seedDatabase(data: SampleData, opts: { withDemoTickets?: boolean } = {}) {
  await clearCollections();

  const [authorHash, adminHash] = await Promise.all([
    hashPassword(demoPasswords.author),
    hashPassword(demoPasswords.admin),
  ]);

  const admins = await User.insertMany(
    demoAdmins.map((admin) => ({ ...admin, role: "ADMIN", passwordHash: adminHash })),
  );
  const { authorByCode, bookByCode } = await seedAuthorsAndBooks(data, authorHash);

  let ticketCount = 0;
  if (opts.withDemoTickets !== false) {
    // Sequential on purpose: ticket numbers come from a counter and should follow list order.
    for (const demo of demoTickets) {
      const author = authorByCode.get(demo.authorCode);
      if (!author) continue;
      const book = demo.bookCode ? (bookByCode.get(demo.bookCode) ?? null) : null;
      await seedDemoTicket(demo, author, book, admins[0]);
      ticketCount++;
    }
  }

  return { authors: data.authors.length, books: bookByCode.size, admins: admins.length, tickets: ticketCount };
}
