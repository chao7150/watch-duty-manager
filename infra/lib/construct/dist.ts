import { Construct } from "constructs";
import {
  Stack,
  aws_cloudfront,
  aws_cloudfront_origins,
  aws_iam,
  aws_s3,
} from "aws-cdk-lib";

export class Dist extends Construct {
  public bucket: aws_s3.Bucket;
  constructor(scope: Construct, id: string) {
    super(scope, id);
    // s3
    this.bucket = new aws_s3.Bucket(this, "assets-bucket", {
      blockPublicAccess: aws_s3.BlockPublicAccess.BLOCK_ALL,
      cors: [
        {
          allowedHeaders: ["*"],
          allowedMethods: [aws_s3.HttpMethods.GET],
          allowedOrigins: ["http://localhost:3000", "https://anime.chao.tokyo"],
          maxAge: 3000,
        },
      ],
    });

    // OAC
    const cfnOriginAccessControl = new aws_cloudfront.CfnOriginAccessControl(
      this,
      "OriginAccessControl",
      {
        originAccessControlConfig: {
          name: "OriginAccessControlForContentsBucket",
          originAccessControlOriginType: "s3",
          signingBehavior: "always",
          signingProtocol: "sigv4",
          description: "Access Control",
        },
      }
    );

    // cloudfront(distribution)
    const distribution = new aws_cloudfront.Distribution(
      this,
      "assets-distribution",
      {
        defaultBehavior: {
          origin: new aws_cloudfront_origins.S3Origin(this.bucket),
          cachePolicy: aws_cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
      }
    );

    const bucketPolicyStatement = new aws_iam.PolicyStatement({
      actions: ["s3:GetObject"],
      effect: aws_iam.Effect.ALLOW,
      principals: [new aws_iam.ServicePrincipal("cloudfront.amazonaws.com")],
      resources: [`${this.bucket.bucketArn}/*`],
    });
    bucketPolicyStatement.addCondition("StringEquals", {
      "AWS:SourceArn": `arn:aws:cloudfront::${
        Stack.of(this).account
      }:distribution/${distribution.distributionId}`,
    });

    this.bucket.addToResourcePolicy(bucketPolicyStatement);

    const cfnDistribution = distribution.node
      .defaultChild as aws_cloudfront.CfnDistribution;
    cfnDistribution.addPropertyOverride(
      "DistributionConfig.Origins.0.OriginAccessControlId",
      cfnOriginAccessControl.getAtt("Id")
    );
    cfnDistribution.addPropertyOverride(
      "DistributionConfig.Origins.0.DomainName",
      this.bucket.bucketRegionalDomainName
    );
    cfnDistribution.addOverride(
      "Properties.DistributionConfig.Origins.0.S3OriginConfig.OriginAccessIdentity",
      ""
    );
    cfnDistribution.addPropertyDeletionOverride(
      "DistributionConfig.Origins.0.CustomOriginConfig"
    );
  }
}
