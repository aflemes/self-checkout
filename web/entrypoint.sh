#!/bin/sh
set -e

mkdir -p /usr/share/nginx/html/assets
cat > /usr/share/nginx/html/assets/config.json <<EOF
{
  "inactivityTimeoutSeconds": ${INACTIVITY_TIMEOUT_SECONDS:-120},
  "inactivityWarningSeconds": ${INACTIVITY_WARNING_SECONDS:-15}
}
EOF

exec nginx -g "daemon off;"