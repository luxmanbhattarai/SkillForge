curl -s -G "https://kgsearch.googleapis.com/v1/entities:search" \
  --data-urlencode "query=Acme Baking Co." \
  --data-urlencode "limit=5" \
  --data-urlencode "key=$KG_API_KEY"
