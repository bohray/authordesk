/** UI copy kept in one place so tone stays consistent. */
export const uiMessages = {
  genericError: "Something went wrong. Please try again.",
  networkError: "Can't reach the server. Check your connection and try again.",
  sessionExpired: "Your session has expired. Please sign in again.",

  login: {
    title: "Sign in to AuthorDesk",
    subtitle: "Track your books, royalties and support requests in one place.",
  },

  books: {
    emptyTitle: "No books yet",
    emptyBody:
      "Once your first book enters production it will appear here with its status and royalties.",
    inProductionNote: "Royalties start once the book is live.",
    neverPaid: "No payouts yet",
    belowThreshold: (threshold: string) =>
      `Below ${threshold} payout threshold, rolls over to next quarter`,
  },

  tickets: {
    emptyTitle: "No support tickets yet",
    emptyBody:
      "Questions about royalties, ISBNs, printing or distribution? Raise a ticket and our team will get back to you here.",
    emptyFilteredTitle: "Nothing here",
    emptyFilteredBody: "No tickets match this filter.",
    created: "Ticket submitted. Our team will reply here.",
    replySent: "Reply sent",
    closedReply:
      "This ticket is closed, so replies are turned off. If you still need help, please raise a new ticket.",
    resolvedReply: "This ticket is marked resolved. Replying will reopen it for our team.",
    attachmentNote: "Attachment upload coming soon, file name is shared with our team.",
    notFoundTitle: "Ticket not found",
    notFoundBody: "It may have been removed, or the link is incorrect.",
  },

  queue: {
    emptyTitle: "Queue is clear",
    emptyBody: "No tickets match these filters.",
  },

  draft: {
    loading: "Drafting a reply from the knowledge base…",
    unavailable: "AI drafting is unavailable right now. Write a manual reply below.",
  },

  notes: {
    label: "Internal, not visible to the author",
  },
} as const;
