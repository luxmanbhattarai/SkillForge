aws secretsmanager create-secret --name prod/app/db-password \
  --secret-string '{"username":"app","password":"CHANGE_ME"}'
aws secretsmanager get-secret-value --secret-id prod/app/db-password \
  --query SecretString --output text
