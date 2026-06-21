/**
 * Prismaのエラーを扱うユーティリティ
 *
 * @see https://www.prisma.io/docs/orm/reference/error-reference
 */

/** アプリケーションで意味付けするPrismaエラーコード */
export type PrismaKnownErrorCode =
  | "P2002" // Unique constraint failed
  | "P2003" // Foreign key constraint failed
  | "P2025"; // Record not found

/** Prismaエラーとして扱うオブジェクトの形状 */
interface PrismaError {
  code: string;
}

/** 値がPrismaエラーオブジェクトかどうかを判定する */
export function isPrismaError(e: unknown): e is PrismaError {
  return (
    e != null &&
    typeof e === "object" &&
    "code" in e &&
    typeof (e as { code: unknown }).code === "string"
  );
}

/**
 * Prismaエラーをアプリケーションで意味付けする種類に分類する。
 * `isPrismaError` で絞り込んだ値を渡すこと。
 * 該当する意味付けがない場合は `null` を返す。
 */
export function prismaErrorAssorter(
  e: PrismaError,
): PrismaKnownErrorCode | null {
  switch (e.code) {
    case "P2002":
    case "P2003":
    case "P2025":
      return e.code;
    default:
      return null;
  }
}
