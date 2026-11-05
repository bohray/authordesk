import "server-only";
import type { BookDTO } from "@/shared/types/dto";
import type { BookRecord } from "../repositories/types";
import { iso } from "./common";

/** The dataset's status string for a book that is on sale. */
export const PUBLISHED_STATUS = "Published & Live";

export function toBookDTO(b: BookRecord): BookDTO {
  return {
    id: b._id.toString(),
    code: b.code,
    title: b.title,
    isbn: b.isbn,
    genre: b.genre,
    publicationDate: iso(b.publicationDate),
    status: b.status,
    isPublished: b.status === PUBLISHED_STATUS,
    mrp: b.mrp ?? null,
    royaltyPerCopy: b.royaltyPerCopy ?? null,
    copiesSold: b.copiesSold ?? 0,
    royalty: {
      earned: b.royalty?.earned ?? 0,
      paid: b.royalty?.paid ?? 0,
      pending: b.royalty?.pending ?? 0,
      lastPayoutDate: iso(b.royalty?.lastPayoutDate),
    },
    printPartner: b.printPartner ?? null,
    availableOn: b.availableOn ?? [],
  };
}
