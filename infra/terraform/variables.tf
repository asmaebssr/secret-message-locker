variable "aws_region" {
  default = "eu-north-1"
}

variable "allowed_ip" {
  description = "Your IP for SSH access"
  type        = string
}

variable "key_name" {
  description = "EC2 SSH key pair name"
  type        = string
}
