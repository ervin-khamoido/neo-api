.platform
    - nginx
        nginx.conf: Overrides default nginx configuration with this one
    - hooks
        - postdeploy
            - 00_restart_nginx.sh: Ensures that nginx is restarted on new CI/CD deployments, whether instance restarts or not

NOTE: Any platform hooks that are bash scripts have to be set as EXECUTABLE in git's way, not just a chmod. You can run the following
> git ls-files -s .platform
to see current permissions on file. 

Bash scripts need 100755. If you don't see that, you can change that with this command (edit as necessary):
> git add --chmod=+x -- .platform/*/*/*.sh

Then do the normal:
- git add .
- git commit -m "added executable permission to hook blah blah blah"
- git push
