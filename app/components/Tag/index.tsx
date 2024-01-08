import * as TagIcon from "../Icons/Tag";

export type Props = {
  id: number;
  text: string;
  href?: string;
};

export const Component: React.FC<Props> = ({ text, href = "#" }) => {
  return (
    <a
      href={href}
      className="h-6 border border-tw-border rounded inline-flex p-1 text-xs text-text gap-0.5"
    >
      <TagIcon.SmallComponent />
      <span>{text}</span>
    </a>
  );
};
