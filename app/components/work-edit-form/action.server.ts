import * as E from "fp-ts/lib/Either.js";

import { db } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";
import { nonEmptyStringOrUndefined } from "~/utils/type";

export const serverAction = async (
  request: Request,
  workId: number,
  formData: FormData,
): Promise<
  E.Either<
    { errorMessage: string; status: number },
    { successMessage: string; status: number }
  >
> => {
  const title = formData.get("title");
  if (typeof title !== "string" || title === "") {
    return E.left({ errorMessage: "title must not be empty", status: 400 });
  }
  const optionalWorkCreateInput = nonEmptyStringOrUndefined(
    Object.fromEntries(formData),
    ["officialSiteUrl", "twitterId", "hashtag", "durationMin"],
  );
  const tags = Object.keys(Object.fromEntries(formData)).flatMap((k) => {
    const match = k.match(/personal-tag-(\d+)$/)?.[1];
    if (match !== undefined) {
      return [Number(match)];
    }
    return [];
  });

  try {
    const work = await db.work.update({
      where: { id: workId },
      data: {
        title,
        ...optionalWorkCreateInput,
        durationMin:
          optionalWorkCreateInput.durationMin &&
          optionalWorkCreateInput.durationMin !== ""
            ? Number(optionalWorkCreateInput.durationMin)
            : undefined,
      },
    });

    const userId = await requireUserId(request);
    await db.$transaction([
      ...tags.map((tag) =>
        db.tagsOnSubscription.upsert({
          where: {
            userId_workId_tagId: {
              userId,
              workId,
              tagId: tag,
            },
          },
          create: {
            userId,
            workId,
            tagId: tag,
          },
          update: {},
        }),
      ),
      db.tagsOnSubscription.deleteMany({
        where: {
          tagId: {
            notIn: tags,
          },
          userId,
          workId,
        },
      }),
    ]);

    return E.right({
      successMessage: `${work.title} is successfully updated`,
      status: 200,
    });
  } catch (e) {
    console.log(e);
    return E.left({ errorMessage: "internal server error", status: 500 });
  }
};
