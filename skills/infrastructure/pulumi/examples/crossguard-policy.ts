import * as aws from "@pulumi/aws";
import { PolicyPack, validateResourceOfType } from "@pulumi/policy";

new PolicyPack("acme-baseline", {
  policies: [
    {
      name: "s3-no-public-read",
      description: "S3 buckets must not allow public read access.",
      enforcementLevel: "mandatory",
      validateResource: validateResourceOfType(
        aws.s3.BucketAcl,
        (acl, args, reportViolation) => {
          if (acl.acl === "public-read") {
            reportViolation("S3 buckets must not use the public-read ACL.");
          }
        },
      ),
    },
  ],
});
