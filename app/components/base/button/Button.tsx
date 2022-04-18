export type Props = React.DetailedHTMLProps<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
>;

export const Component: React.FC<Props> = ({ children, ...props }) => {
  return (
    <button className={"border-solid border-2 rounded px-1"} {...props}>
      {children}
    </button>
  );
};
