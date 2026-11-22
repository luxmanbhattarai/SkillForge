pulumi login
pulumi stack init dev
pulumi config set region us-east-1
pulumi config set dbPassword --secret
pulumi preview --diff
pulumi up
pulumi stack output
pulumi refresh
pulumi destroy
