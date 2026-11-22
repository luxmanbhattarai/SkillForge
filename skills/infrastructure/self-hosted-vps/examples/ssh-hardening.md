# SSH hardening

Harden SSH with a drop-in configuration file:

```ini
# /etc/ssh/sshd_config.d/hardening.conf
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
PermitEmptyPasswords no
MaxAuthTries 3
LoginGraceTime 30
```

```bash
sudo sshd -t
sudo systemctl restart ssh.service
```
