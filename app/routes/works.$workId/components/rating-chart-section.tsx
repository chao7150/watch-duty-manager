import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
} from "recharts";

import { LoaderData } from "../server/loader";

/**
 * 評価グラフ表示用コンポーネント
 * 各エピソードの評価値をグラフ化して表示する
 */
export const Component = ({
  ratings,
}: {
  /** 各エピソードの評価データ配列 */
  ratings: LoaderData["ratings"];
}) => {
  return (
    <section className="flex-1">
      <ResponsiveContainer height={300}>
        <LineChart data={ratings}>
          <CartesianGrid />
          <XAxis dataKey="count" domain={[1, "dataMax"]} />
          <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} />
          <Tooltip />
          <Line type="monotone" dataKey="rating" />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
};
