import { Stack, type StackProps, aws_iam, aws_ecr } from "aws-cdk-lib";
import { Construct } from "constructs";

export class InfraStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const provider = new aws_iam.OpenIdConnectProvider(
      this,
      "provider-github-com",
      {
        url: "https://token.actions.githubusercontent.com",
        clientIds: ["sts.amazonaws.com"],
      }
    );

    const role = new aws_iam.Role(this, "role-github-com", {
      assumedBy: new aws_iam.FederatedPrincipal(
        provider.openIdConnectProviderArn,
        {
          StringEquals: {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          },
          StringLike: {
            "token.actions.githubusercontent.com:sub":
              "repo:chao7150/watch-duty-manager:*",
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
    });

    const repository = new aws_ecr.Repository(this, "watch-duty-manager", {
      repositoryName: "watch-duty-manager",
    });

    const deployPolicy = new aws_iam.Policy(this, "policy-github-com", {});
    repository.grantPullPush(deployPolicy);
    role.attachInlinePolicy(deployPolicy);
  }
}
