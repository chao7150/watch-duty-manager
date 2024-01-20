import * as TagIcon from "../Icons/Tag";

export type Props = {
  id: number;
  text: string;
  href: string;
};

export const Component: React.FC<Props> = ({ text, href }) => {
  return (
    <div className="h-6">
      <a
        href={href}
        className="border border-tw-border rounded inline-flex p-1 text-xs text-text gap-0.5"
      >
        <TagIcon.SmallComponent />
        <span>{text}</span>
      </a>
    </div>
  );
};
