terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

provider "digitalocean" {
  token = var.do_token
}

resource "digitalocean_droplet" "web" {
  image  = "ubuntu-24-04-x64"
  name   = "login-portal-prod"
  region = "sfo3"
  size   = "s-1vcpu-1gb"
  
  ssh_keys = [digitalocean_ssh_key.default.id]
}
