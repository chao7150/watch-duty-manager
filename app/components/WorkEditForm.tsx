import * as E from "fp-ts/Either";
import { useFetcher } from "@remix-run/react";
import * as WorkInput from "./Work/Input";
import { db } from "~/utils/db.server";
import { nonEmptyStringOrUndefined } from "~/utils/type";
import { action } from "../routes/works.$workId";
import { requireUserId } from "~/utils/session.server";

export const serverAction = async (
  request: Request,
  workId: number,
  formData: FormData
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
    ["officialSiteUrl", "twitterId", "hashtag", "durationMin"]
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
        })
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

export type Props = {
  workId: string | number;
  workInput: WorkInput.Props;
};

export const Component: React.FC<Props> = ({ workId, workInput }) => {
  const fetcher = useFetcher<typeof action>();
  return (
    <section>
      {fetcher.data && <p>{fetcher.data.message}</p>}
      <fetcher.Form method="POST" action={`/works/${workId}`}>
        <WorkInput.Component {...workInput} />
        <button
          className="mt-4 bg-accent-area rounded-full py-1 px-3 ml-auto"
          type="submit"
          name="_action"
          value="edit"
        >
          送信
        </button>
      </fetcher.Form>
    </section>
  );
};
