import { NextResponse } from "next/server";

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export function successResponse<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true as const, data }, { status });
}

export function errorResponse(
  code: string,
  message: string,
  status = 400
): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ success: false as const, error: { code, message } }, { status });
}

// Common error helpers
export function notFoundError(message = "리소스를 찾을 수 없습니다") {
  return errorResponse("NOT_FOUND", message, 404);
}

export function unauthorizedError(message = "로그인이 필요합니다") {
  return errorResponse("UNAUTHORIZED", message, 401);
}

export function forbiddenError(message = "권한이 없습니다") {
  return errorResponse("FORBIDDEN", message, 403);
}

export function validationError(message = "입력값이 올바르지 않습니다") {
  return errorResponse("VALIDATION_ERROR", message, 422);
}

export function serverError(message = "서버 오류가 발생했습니다") {
  return errorResponse("INTERNAL_ERROR", message, 500);
}
