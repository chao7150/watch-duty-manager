import { useFetcher } from "@remix-run/react";

import { useEffect } from "react";

import type { action } from "~/routes/works.$workId/route";

import * as Button from "~/components/Button";

import * as WorkInput from "../work/Input";

export type Props = {
  workId: string | number;
  workInput: WorkInput.Props;
  onSubmitSuccess: () => void;
};

export const Component: React.FC<Props> = ({
  workId,
  workInput,
  onSubmitSuccess,
}) => {
  const fetcher = useFetcher<typeof action>();
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data && !fetcher.data.hasError) {
      onSubmitSuccess();
    }
  }, [fetcher.state, fetcher.data]);
  return (
    <section>
      {fetcher.data && fetcher.data.hasError && <p>{fetcher.data.message}</p>}
      <fetcher.Form method="POST" action={`/works/${workId}`}>
        <WorkInput.Component {...workInput} />
        <div className="mt-4 ml-auto">
          <Button.Component type="submit" name="_action" value="edit">
            送信
          </Button.Component>
        </div>
      </fetcher.Form>
    </section>
  );
};
