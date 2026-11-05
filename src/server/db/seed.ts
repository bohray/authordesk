import "server-only";
import { priorityRankByLevel, type TicketCategory, type TicketPriority, type TicketStatus } from "@/shared/constants/ticket";
import { hashPassword } from "../auth/password";
import { AiDraft, AiUsageLog, Book, Counter, LoginAttempt, Ticket, TicketEvent, TicketNote, User, nextSequence } from "./models";

/** Shape of data/sample-data.json (as provided). */
export interface SampleData {
  authors: {
    author_id: string;
    name: string;
    email: string;
    phone: string;
    city: string;
    joined_date: string;
    books: {
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
    }[];
  }[];
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

const day = 24 * 60 * 60 * 1000;

/** Idempotent: wipes the app collections and re-creates the demo dataset. */
export async function seedDatabase(data: SampleData, opts: { withDemoTickets?: boolean } = {}) {
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

  const [authorHash, adminHash] = await Promise.all([
    hashPassword(demoPasswords.author),
    hashPassword(demoPasswords.admin),
  ]);

  const admins = await User.insertMany(
    demoAdmins.map((a) => ({ ...a, role: "ADMIN", passwordHash: adminHash })),
  );

  const authorIdByCode = new Map<string, string>();
  const bookByCode = new Map<string, { id: string; title: string; isbn: string }>();

  for (const a of data.authors) {
    const user = await User.create({
      email: a.email,
      name: a.name,
      role: "AUTHOR",
      passwordHash: authorHash,
      authorProfile: { code: a.author_id, phone: a.phone, city: a.city, joinedDate: new Date(a.joined_date) },
    });
    authorIdByCode.set(a.author_id, user._id.toString());

    const books = await Book.insertMany(
      a.books.map((b) => ({
        code: b.book_id,
        authorId: user._id,
        title: b.title,
        isbn: b.isbn,
        genre: b.genre,
        publicationDate: b.publication_date ? new Date(b.publication_date) : null,
        status: b.status,
        mrp: b.mrp,
        royaltyPerCopy: b.author_royalty_per_copy,
        copiesSold: b.total_copies_sold,
        royalty: {
          earned: b.total_royalty_earned,
          paid: b.royalty_paid,
          pending: b.royalty_pending,
          lastPayoutDate: b.last_royalty_payout_date ? new Date(b.last_royalty_payout_date) : null,
        },
        printPartner: b.print_partner,
        availableOn: b.available_on,
      })),
    );
    for (const b of books) bookByCode.set(b.code, { id: b._id.toString(), title: b.title, isbn: b.isbn });
  }

  let ticketCount = 0;
  if (opts.withDemoTickets !== false) {
    const admin = admins[0];
    for (const t of demoTickets) {
      const authorId = authorIdByCode.get(t.authorCode);
      if (!authorId) continue;
      const author = data.authors.find((a) => a.author_id === t.authorCode)!;
      const book = t.bookCode ? bookByCode.get(t.bookCode) ?? null : null;
      const createdAt = new Date(Date.now() - t.daysAgo * day - 2 * 60 * 60 * 1000);
      const seq = await nextSequence("ticket");
      const messages = t.reply
        ? [
            {
              senderId: admin._id,
              senderRole: "ADMIN",
              senderName: admin.name,
              body: t.reply,
              aiAssisted: true,
              createdAt: new Date(createdAt.getTime() + 3 * 60 * 60 * 1000),
            },
          ]
        : [];
      const ticket = await Ticket.create({
        ticketNumber: `T-${seq}`,
        authorId,
        bookId: book?.id ?? null,
        bookSnapshot: book ? { title: book.title, isbn: book.isbn } : null,
        subject: t.subject,
        description: t.description,
        status: t.status,
        category: t.category,
        categorySource: "AI",
        priority: t.priority,
        prioritySource: "AI",
        priorityRank: priorityRankByLevel[t.priority],
        ai: {
          status: "DONE",
          confidence: 0.9,
          reasoning: "Seeded demo ticket (pre-classified).",
          model: "seed",
          suggestedCategory: t.category,
          suggestedPriority: t.priority,
          attempts: 1,
        },
        assigneeId: t.status === "IN_PROGRESS" || t.status === "RESOLVED" ? admin._id : null,
        messages,
        firstResponseAt: messages[0]?.createdAt ?? null,
        resolvedAt: t.status === "RESOLVED" ? new Date(createdAt.getTime() + 4 * 60 * 60 * 1000) : null,
        createdAt,
        updatedAt: messages[0]?.createdAt ?? createdAt,
      });
      await TicketEvent.create({ ticketId: ticket._id, type: "CREATED", actorName: author.name, to: "OPEN" });
      ticketCount++;
    }
  }

  return { authors: data.authors.length, books: bookByCode.size, admins: admins.length, tickets: ticketCount };
}
