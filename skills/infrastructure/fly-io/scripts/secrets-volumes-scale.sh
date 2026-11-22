fly secrets set SESSION_SECRET=$(openssl rand -hex 32)
fly secrets list

fly volumes create app_data --size 1 --region iad

fly scale count 2 --region iad
fly scale count 1 --region lhr
fly scale vm shared-cpu-2x --memory 1024
