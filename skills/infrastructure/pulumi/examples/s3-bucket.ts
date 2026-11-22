import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const bucket = new aws.s3.Bucket("app-bucket");

new aws.s3.BucketVersioning("app-bucket-versioning", {
  bucket: bucket.id,
  versioningConfiguration: { status: "Enabled" },
});

new aws.s3.BucketServerSideEncryptionConfiguration("app-bucket-encryption", {
  bucket: bucket.id,
  rules: [{
    applyServerSideEncryptionByDefault: { sseAlgorithm: "AES256" },
  }],
});

export const bucketName = bucket.id;
