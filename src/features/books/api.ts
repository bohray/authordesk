import { apiClient } from "@/lib/api-client";
import { API_ROUTES } from "@/constants/routes";
import type { MyBooksDTO } from "@/shared/types/dto";

export const booksApi = {
  getMyBooks: (signal?: AbortSignal) =>
    apiClient.get<MyBooksDTO>(API_ROUTES.me.books, undefined, signal),
};
