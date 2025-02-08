import { Form } from "@remix-run/react";

import { useEffect, useState } from "react";
import { Calendar } from "react-multi-date-picker";
import DatePanel from "react-multi-date-picker/plugins/date_panel";
import TimePicker from "react-multi-date-picker/plugins/time_picker";

import * as TabPanel from "../TabPanel";
import * as WorkInput from "../work/Input";

export const MultipleDatePicker: React.FC<{
  dates: Date[];
  onChangeDates: (dates: Date[]) => void;
}> = ({ dates, onChangeDates }) => {
  return (
    <div className="h-[377.8px]">
      <Calendar
        value={dates}
        onChange={(dateObject) => {
          if (dateObject === null) {
            return;
          }
          if (!Array.isArray(dateObject)) {
            dateObject = [dateObject];
          }
          onChangeDates(dateObject.map((d) => new Date(d.unix * 1000)));
        }}
        multiple={true}
        sort={true}
        numberOfMonths={3}
        format="YYYY/MM/DD HH:mm"
        plugins={[
          <TimePicker position="bottom" hideSeconds />,
          <DatePanel markFocused={true} />,
        ]}
      />
    </div>
  );
};

function convertDateToIso(date: Date) {
  const shift = date.getTime() + 9 * 60 * 60 * 1000;
  const time = new Date(shift).toISOString().split(".")[0];
  return time;
}

const SequentialDatePicker: React.FC<{
  dates: Date[];
  onChangeDates: (dates: Date[]) => void;
}> = ({ dates, onChangeDates }) => {
  const now = new Date();
  now.setSeconds(0);
  const [firstDate, setFirstDate] = useState<Date>(now);
  const [count, setCount] = useState<number>(13);
  useEffect(() => {
    onChangeDates(
      Array.from({ length: count }).map((_, index) => {
        return new Date(firstDate.getTime() + 1000 * 60 * 60 * 24 * 7 * index);
      }),
    );
  }, [onChangeDates, firstDate, count]);
  return (
    <>
      <input
        type="hidden"
        name="episodeDate"
        value={dates.map((v) => v.toISOString()).join(",")}
      ></input>
      <ul className="flex flex-col gap-2">
        <li className="flex flex-col">
          <label>初回放送日時</label>
          <input
            className="w-3/4"
            type="datetime-local"
            value={convertDateToIso(firstDate)}
            onChange={(e) => setFirstDate(new Date(`${e.target.value}+0900`))}
          ></input>
        </li>
        <li className="flex flex-col">
          <label>話数</label>
          <input
            className="w-3/4"
            type="number"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          ></input>
        </li>
      </ul>
    </>
  );
};

export const EpisodeDateRegistrationTabPanel = () => {
  const [addedDates, setAddedDates] = useState<Date[]>([]);

  return (
    <div className="flex flex-col gap-4">
      <TabPanel.Component
        items={[
          {
            id: "sequential",
            tabText: "連番登録",
            content: (
              <SequentialDatePicker
                dates={addedDates}
                onChangeDates={setAddedDates}
              />
            ),
          },
          {
            id: "multiple",
            tabText: "カレンダーから登録",
            content: (
              <MultipleDatePicker
                dates={addedDates}
                onChangeDates={setAddedDates}
              />
            ),
          },
        ]}
      />
      <div>
        登録しようとしているエピソード
        <ul>
          {addedDates.map((d) => (
            <li
              key={d.toUTCString()}
              className="list-inside list-[decimal-leading-zero]"
            >
              {d.toLocaleString("ja", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                weekday: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </li>
          ))}
        </ul>
      </div>
      <input
        type="hidden"
        name="episodeDate"
        value={addedDates.map((v) => v.toISOString()).join(",")}
      ></input>
    </div>
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
      <div className="grid grid-cols-2">
        <fieldset className="mt-4 flex flex-col gap-2" name="基本情報">
          <legend>
            <h3>基本情報</h3>
          </legend>
          <WorkInput.Component />
        </fieldset>
        <fieldset className="mt-4 flex flex-col gap-2" name="エピソード登録">
          <legend>
            <h3>エピソード登録</h3>
          </legend>
          <EpisodeDateRegistrationTabPanel />
        </fieldset>
      </div>
      <button
        className="mt-4 bg-accent-area rounded-full py-2 px-12"
        type="submit"
      >
        送信
      </button>
    </Form>
  );
};
