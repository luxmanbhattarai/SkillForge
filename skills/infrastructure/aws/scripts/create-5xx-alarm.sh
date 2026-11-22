aws cloudwatch put-metric-alarm --alarm-name prod-alb-5xx \
  --namespace AWS/ApplicationELB --metric-name HTTPCode_Target_5XX_Count \
  --statistic Sum --period 300 --threshold 10 \
  --comparison-operator GreaterThanThreshold --evaluation-periods 1 \
  --dimensions Name=LoadBalancer,Value=app/my-alb/0123456789abcdef \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:alerts
