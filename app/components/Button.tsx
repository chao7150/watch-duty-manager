import React from "react";

export type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
};

export const Component: React.FC<Props> = ({ children, ...props }) => {
  return (
    <button
      className="w-full h-full bg-accent-area rounded-full py-1 px-3"
      {...props}
    >
      {children}
    </button>
  );
};
