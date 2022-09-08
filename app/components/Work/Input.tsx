import * as TextInput from "../../components/TextInput";
import * as DistributorForm from "../../components/Distributor/Form";

type TextInputOptionalProps = Pick<
  TextInput.Props,
  "defaultValue" | "isRequired"
>;

export type Props = {
  workTitle?: TextInputOptionalProps;
  officialSiteUrl?: TextInputOptionalProps;
  twitterId?: TextInputOptionalProps;
  hashtag?: TextInputOptionalProps;
  distributorForm?: DistributorForm.Props;
};

export const Component: React.VFC<Props> = ({
  workTitle,
  officialSiteUrl,
  twitterId,
  hashtag,
  distributorForm,
}) => {
  return (
    <ul className="flex flex-col gap-2">
      <li>
        <TextInput.Component
          labelText="タイトル"
          name="title"
          isRequired={true}
          {...workTitle}
        />
      </li>
      <li>
        <TextInput.Component
          labelText="公式サイトURL"
          name="officialSiteUrl"
          {...officialSiteUrl}
        />
      </li>
      <li>
        <TextInput.Component
          labelText="ツイッターID"
          name="twitterId"
          {...twitterId}
        />
      </li>
      <li>
        <TextInput.Component
          labelText="ハッシュタグ（#は不要）"
          name="hashtag"
          {...hashtag}
        />
      </li>
      <li>
        <DistributorForm.Component {...distributorForm} />
      </li>
    </ul>
  );
};
