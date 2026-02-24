resource "digitalocean_ssh_key" "default" {
  name       = "terraform-ssh-key"
  public_key = file("~/.ssh/id_ed25519.pub")
}
