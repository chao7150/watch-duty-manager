import { Either, left, right } from "fp-ts/lib/Either";
import { useFetcher } from "remix";
import { db } from "~/utils/db.server";
import { nonEmptyStringOrUndefined } from "~/utils/type";

import * as TextInput from "./TextInput";

export const serverAction = async (
  workId: number,
  formData: FormData
): Promise<
  Either<
    { errorMessage: string; status: number },
    { successMessage: string; status: number }
  >
> => {
  const title = formData.get("title");
  if (typeof title !== "string" || title === "") {
    return left({ errorMessage: "title must not be empty", status: 400 });
  }
  const optionalWorkCreateInput = nonEmptyStringOrUndefined(
    Object.fromEntries(formData),
    ["officialSiteUrl", "twitterId", "hashtag"]
  );
  try {
    const work = await db.work.update({
      where: { id: workId },
      data: { title, ...optionalWorkCreateInput },
    });
    return right({
      successMessage: `${work.title} is successfully updated`,
      status: 200,
    });
  } catch {
    return left({ errorMessage: "internal server error", status: 500 });
  }
};

export type Props = {
  workId: string | number;
  title?: Partial<TextInput.Props>;
  officialSiteUrl?: Partial<TextInput.Props>;
  twitterId?: Partial<TextInput.Props>;
  hashTag?: Partial<TextInput.Props>;
};

export const Component: React.VFC<Props> = ({
  workId,
  title,
  officialSiteUrl,
  twitterId,
  hashTag,
}) => {
  const fetcher = useFetcher();
  return (
    <fetcher.Form method="post" action={`/works/${workId}`}>
      <ul>
        <li>
          <TextInput.Component
            labelText="タイトル"
            name="title"
            isRequired={true}
            {...title}
          />
        </li>
        <li>
          <TextInput.Component
            labelText="公式サイトURL"
            name="officialSiteUrl"
            {...officialSiteUrl}
          />
        </li>
        <li>
          <TextInput.Component
            labelText="ツイッターID"
            name="twitterId"
            {...twitterId}
          />
        </li>
        <li>
          <TextInput.Component
            labelText="ハッシュタグ（#は不要）"
            name="hashtag"
            {...hashTag}
          />
        </li>
        <li>
          <button type="submit" name="_action" value="edit">
            submit
          </button>
        </li>
      </ul>
    </fetcher.Form>
  );
};
