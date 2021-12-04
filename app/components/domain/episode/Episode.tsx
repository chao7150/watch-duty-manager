export type Props = {
  id: string;
  iconUrl: string;
  title: string;
  count: string;
  startAt: string;
  endAt: string;
};

export const Component: React.VFC<Props> = ({
  iconUrl,
  title,
  count,
  startAt,
  endAt,
}: Props) => {
  return (
    <div>
      <img src={iconUrl} alt="" />
      <h2>{title}</h2>
      <p>{count}</p>
      <div>
        <span>{startAt}</span>~<span>{endAt}</span>
      </div>
    </div>
  );
};
