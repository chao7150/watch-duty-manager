import * as E from "fp-ts/Either";
import * as F from "fp-ts/function";
import { json } from "@remix-run/node";
import { Form } from "@remix-run/react";

import * as WorkInput from "./Work/Input";
import { nonEmptyStringOrUndefined } from "~/utils/type";

import { isNonEmptyString } from "~/utils/validator";
import { useState } from "react";
import DatePicker from "react-multi-date-picker";
import TimePicker from "react-multi-date-picker/plugins/time_picker";
import DatePanel from "react-multi-date-picker/plugins/date_panel";

export const serverValidator = (
  formData: FormData
): E.Either<
  Response,
  {
    title: string;
    durationMin?: number;
    episodeDate: Date[];
    officialSiteUrl?: string;
    twitterId?: string;
    hashtag?: string;
  }
> => {
  return F.pipe(
    formData,
    (formData) => {
      const title = formData.get("title");
      return isNonEmptyString(title)
        ? E.right({ formData, title })
        : E.left("title must not be empty");
    },
    E.chain(({ formData, ...rest }) => {
      const episodeDate = formData.get("episodeDate");
      return isNonEmptyString(episodeDate)
        ? E.right({
          formData,
          episodeDate: episodeDate.split(",").map((d) => new Date(d)),
          ...rest,
        })
        : E.left("episodeDate must not be empty");
    }),
    E.bimap(
      (l) => json({ errorMessage: l }, { status: 400 }),
      ({ title, episodeDate, formData }) => {
        const optionals = nonEmptyStringOrUndefined(
          Object.fromEntries(formData),
          ["officialSiteUrl", "twitterId", "hashtag", "durationMin"]
        );
        return {
          title,
          episodeDate,
          ...optionals,
          durationMin:
            optionals.durationMin && optionals.durationMin !== ""
              ? Number(optionals.durationMin)
              : undefined,
        };
      }
    )
  );
};

export const MultipleDatePicker: React.FC = () => {
  const [addedDates, setAddedDates] = useState<Date[]>([]);

  return (
    <>
      <input
        type="hidden"
        name="episodeDate"
        value={addedDates.map((v) => v.toISOString()).join(",")}
      ></input>
      <DatePicker
        value={addedDates}
        onChange={(dateObject) => {
          if (dateObject === null) {
            return;
          }
          if (!Array.isArray(dateObject)) {
            dateObject = [dateObject];
          }
          setAddedDates(dateObject.map((d) => new Date(d.unix * 1000)));
        }}
        placeholder={"click to open"}
        multiple={true}
        sort={true}
        numberOfMonths={3}
        format="YYYY/MM/DD HH:mm:ss"
        plugins={[
          <TimePicker position="bottom" />,
          <DatePanel markFocused={true} />,
        ]}
      />
      <div>
        追加しようとしているエピソード<span>({addedDates.length})</span>
      </div>
      <ul>
        {addedDates.map((d) => {
          return <li>{d.toLocaleString()}</li>;
        })}
      </ul>
    </>
  );
};

export const Component: React.FC = () => {
  return (
    <Form method="POST">
      <p>
        <small>
          <abbr title="required">*</abbr>は必須です。
        </small>
      </p>
      <fieldset className="mt-4" name="基本情報">
        <legend>
          <h3>基本情報</h3>
        </legend>
        <WorkInput.Component />
      </fieldset>
      <fieldset className="mt-4" name="放送情報">
        <legend>
          <h3>放送情報</h3>
        </legend>
        <ul className="mt-2 flex flex-col gap-2">
          <li>
            <MultipleDatePicker />
          </li>
        </ul>
      </fieldset>
      <button
        className="mt-4 bg-accent-area rounded-full py-2 px-12"
        type="submit"
      >
        送信
      </button>
    </Form>
  );
};
