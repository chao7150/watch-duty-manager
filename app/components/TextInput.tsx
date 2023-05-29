import React from "react";

export type Props = {
  labelText: string;
  name: string;
  defaultValue?: string;
  isRequired?: boolean;
};

const RequiredAbbreviation: React.FC = () => (
  <abbr title="required" aria-label="required">
    *
  </abbr>
);

export const Component: React.FC<Props> = ({
  labelText,
  isRequired,
  ...props
}) => {
  return (
    <label>
      <div>
        {labelText}
        {isRequired && <RequiredAbbreviation />}
      </div>
      <input className="w-2/3" type="text" {...props} />
    </label>
  );
};
