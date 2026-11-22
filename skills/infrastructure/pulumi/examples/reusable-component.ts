import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export class PrivateBucket extends pulumi.ComponentResource {
  public readonly bucket: aws.s3.Bucket;

  constructor(name: string, opts?: pulumi.ComponentResourceOptions) {
    super("example:storage:PrivateBucket", name, {}, opts);
    this.bucket = new aws.s3.Bucket(name, {}, { parent: this });
    new aws.s3.BucketAcl(name, {
      bucket: this.bucket.id,
      acl: "private",
    }, { parent: this });
    new aws.s3.BucketVersioning(name, {
      bucket: this.bucket.id,
      versioningConfiguration: { status: "Enabled" },
    }, { parent: this });
    this.registerOutputs({ bucketName: this.bucket.id });
  }
}
