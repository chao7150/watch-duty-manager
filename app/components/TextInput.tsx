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

export const Component: React.VFC<Props> = ({
  labelText,
  isRequired,
  ...props
}) => {
  return (
    <label>
      {labelText}
      {isRequired && <RequiredAbbreviation />}
      <input type="text" {...props} />
    </label>
  );
};
