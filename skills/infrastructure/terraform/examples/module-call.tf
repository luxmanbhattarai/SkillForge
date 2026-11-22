module "database" {
  source = "./modules/database"

  environment     = "production"
  instance_class  = "db.t4g.medium"
  master_password = var.db_master_password
}

variable "db_master_password" {
  type      = string
  sensitive = true
}
