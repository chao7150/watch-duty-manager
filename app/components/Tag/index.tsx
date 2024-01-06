import * as TagIcon from "../Icons/Tag";

export type Props = {
  text: string;
  href?: string;
};

export const Component: React.FC<Props> = ({ text, href = "#" }) => {
  return (
    <a
      href={href}
      className="border border-tw-border rounded inline-flex p-2 text-text gap-1"
    >
      <TagIcon.Component />
      <span>{text}</span>
    </a>
  );
};
