import { useFetcher } from "@remix-run/react";

import { useEffect } from "react";

import type { action } from "~/routes/works.$workId/route";

import * as Button from "~/components/Button";

export type Props = {
  workId: string | number;
  defaultValue: {
    delayMin?: number;
    url?: string;
  };
  onSubmitSuccess: () => void;
};

export const Component: React.FC<Props> = ({
  workId,
  defaultValue,
  onSubmitSuccess,
}) => {
  const fetcher = useFetcher<typeof action>();
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data && !fetcher.data.hasError) {
      onSubmitSuccess();
    }
  }, [fetcher.state, fetcher.data]);
  const delayMin = defaultValue.delayMin ?? 0;
  return (
    <section>
      {fetcher.data && fetcher.data.hasError && <p>{fetcher.data.message}</p>}
      <fetcher.Form method="POST" action={`/works/${workId}`}>
        <dl className="mt-2 grid grid-cols-[auto,1fr] gap-x-4 gap-y-1">
          <dt>視聴遅延</dt>
          <dd className="flex">
            <label>
              <input
                name="days"
                type="number"
                min={0}
                step={1}
                defaultValue={Math.floor(delayMin / 1440)}
                className="w-8"
              ></input>
            </label>
            日+
            <label>
              <input
                name="hour_min"
                type="time"
                defaultValue={`${Math.floor((delayMin % 1440) / 60)
                  .toString()
                  .padStart(
                    2,
                    "0",
                  )}:${(delayMin % 60).toString().padStart(2, "0")}`}
              ></input>
            </label>
          </dd>
          <dt>視聴リンク</dt>
          <dd>
            <label>
              <input name="url" type="text" defaultValue={defaultValue.url} />
            </label>
          </dd>
        </dl>
        <div className="mt-4 ml-auto">
          <Button.Component
            type="submit"
            name="_action"
            value="watch-settings-edit"
          >
            送信
          </Button.Component>
        </div>
      </fetcher.Form>
    </section>
  );
};
