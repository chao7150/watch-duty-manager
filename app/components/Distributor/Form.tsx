import { useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import { loader } from "~/routes/distributors";

export type Props = {
  defaultValue?: { [N: number]: string };
};

export const Component: React.FC<Props> = ({ defaultValue }) => {
  const fetcher = useFetcher<typeof loader>();

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data == null) {
      fetcher.load("/distributors?index");
    }
  }, [fetcher]);
  const { distributors: distributors } =
    fetcher.state === "idle" && fetcher.data != null
      ? fetcher.data
      : { distributors: [] };

  return (
    <div>
      <h4>配信サービスにおける作品ID</h4>
      <ul>
        {distributors.map((d) => {
          return (
            <li key={d.id}>
              <label className="flex">
                <div className="w-24">{d.name}</div>
                <input
                  className="ml-2"
                  type="text"
                  name={`distributor-${d.id}`}
                  defaultValue={defaultValue && defaultValue[d.id]}
                />
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
