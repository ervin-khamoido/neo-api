#!/bin/bash
echo "Stopping nginx..." && sudo systemctl stop nginx
echo "Copying new nginx.conf to /etc/nginx" && sudo cp /var/proxy/staging/nginx/nginx.conf /etc/nginx/nginx.conf
echo "Starting nginx w/ new configuration ..." && sudo systemctl start nginx && echo "nginx restarted"