import * as Button from "../../base/button/Button";

export type Props = {
  id: string;
  iconUrl: string;
  title: string;
  count: string;
  episodeTitle: string;
  channel: string;
  startAt: string;
};

export const Component: React.VFC<Props> = ({
  iconUrl,
  title,
  count,
  episodeTitle,
  channel,
  startAt,
}: Props) => {
  return (
    <div className={"flex bg-gray-50"}>
      <img className={"w-24 h-24"} src={iconUrl} alt="" />
      <div className={"flex flex-col ml-2"}>
        <h2 className={"leading-none"}>{title}</h2>
        <p className={"text-sm"}>
          <span>#{count}</span>
          <span className={"ml-2"}>{episodeTitle}</span>
        </p>
        <div className={"mt-auto"}>
          <span>{channel}</span>
          <span className={"ml-2 text-gray-500"}>{startAt}</span>
          <span className={"ml-2"}>
            <Button.Component>watch</Button.Component>
          </span>
        </div>
      </div>
      <div>
        <div>
          <span
            className={
              "flex bg-blue-200 w-16 h-16 rounded-full items-center justify-center"
            }
          >
            {30}分
          </span>
        </div>
        <div>
          <Button.Component>menu</Button.Component>
        </div>
      </div>
    </div>
  );
};
