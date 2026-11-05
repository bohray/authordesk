import "server-only";
import { NextResponse } from "next/server";
import type { ApiSuccess, Paginated } from "@/shared/types/dto";

export const ok = <T>(data: T, init?: ResponseInit) =>
  NextResponse.json<ApiSuccess<T>>({ data }, { status: 200, ...init });

export const created = <T>(data: T) => NextResponse.json<ApiSuccess<T>>({ data }, { status: 201 });

export const noContent = () => new NextResponse(null, { status: 204 });

export const paginated = <T>(items: T[], page: number, limit: number, total: number) =>
  NextResponse.json<Paginated<T>>({
    data: items,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
