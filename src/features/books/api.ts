import { apiClient } from "@/lib/apiClient";
import { apiRoutes } from "@/constants/routes";
import type { MyBooksDTO } from "@/shared/types/dto";

export const booksApi = {
  getMyBooks: (signal?: AbortSignal) =>
    apiClient.get<MyBooksDTO>(apiRoutes.me.books, undefined, signal),
};
