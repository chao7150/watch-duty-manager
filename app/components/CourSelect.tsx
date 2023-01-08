export type Props = {
  /**
   * label, valueのタプルの配列
   */
  courList: ReadonlyArray<[string, string]>;
  /**
   * デフォルトで選択状態にする選択肢のvalue
   */
  defaultSelectedValue?: string;
  onChange: React.ChangeEventHandler<HTMLSelectElement>;
};

export const Component: React.FC<Props> = ({
  courList,
  defaultSelectedValue,
  onChange,
}) => {
  return (
    <select className="bg-accent-area" onChange={onChange}>
      <option value="all">全期間</option>
      {courList.map(([label, date]) => {
        return (
          <option value={date} selected={date === defaultSelectedValue}>
            {label}
          </option>
        );
      })}
    </select>
  );
};
